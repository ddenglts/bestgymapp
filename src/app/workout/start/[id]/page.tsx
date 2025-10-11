import { notFound, redirect } from "next/navigation";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  currentWorkout,
  exercises,
  exerciseSets,
  workoutExercises,
  workoutSessions,
  workouts,
} from "@/db/schema";
import {
  deleteExerciseSet,
  endWorkout,
  logExerciseSet,
  setActiveExercise,
  startWorkout,
} from "./actions";
import { WorkoutExerciseCarousel } from "./exercise-carousel";

export const dynamic = "force-dynamic";

type WorkoutParams = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StartWorkoutDetailPage({ params }: WorkoutParams) {
  const { id } = await params;
  const workoutId = Number(id);

  if (!Number.isFinite(workoutId) || workoutId <= 0) {
    notFound();
  }

  const workout = await db
    .select({
      id: workouts.id,
      name: workouts.name,
    })
    .from(workouts)
    .where(eq(workouts.id, workoutId))
    .limit(1);

  if (workout.length === 0) {
    notFound();
  }

  const workoutExercisesRows = await db
    .select({
      id: workoutExercises.id,
      order: workoutExercises.order,
      exerciseId: exercises.id,
      exerciseName: exercises.name,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(asc(workoutExercises.order), asc(exercises.name));

  const [workoutRow] = workout;
  const [activeSession] = await db
    .select({
      sessionId: currentWorkout.sessionId,
      workoutId: workoutSessions.workoutId,
      startedAt: workoutSessions.startedAt,
      activeExerciseId: currentWorkout.activeExerciseId,
    })
    .from(currentWorkout)
    .leftJoin(workoutSessions, eq(workoutSessions.id, currentWorkout.sessionId))
    .limit(1);

  const isActiveSessionForWorkout =
    !!activeSession?.workoutId && activeSession.workoutId === workoutRow.id;
  const activeSessionStartedAt = activeSession?.startedAt
    ? activeSession.startedAt instanceof Date
      ? activeSession.startedAt
      : new Date(activeSession.startedAt)
    : null;
  const activeSessionId = activeSession?.sessionId ?? null;
  const activeExerciseId = activeSession?.activeExerciseId ?? null;

  type LoggedSet = {
    id: number;
    setNumber: number;
    reps: number | null;
    weight: number | null;
  };

  type PreviousSet = {
    setNumber: number;
    reps: number | null;
    weight: number | null;
  };

  type PreviousStat = {
    completedAt: Date | null;
    sets: PreviousSet[];
  };

  const setsByWorkoutExerciseId = new Map<number, LoggedSet[]>();
  const previousStatsByExerciseId = new Map<number, PreviousStat>();

  if (isActiveSessionForWorkout && activeSessionId) {
    const sessionSets = await db
      .select({
        id: exerciseSets.id,
        workoutExerciseId: exerciseSets.workoutExerciseId,
        setNumber: exerciseSets.setNumber,
        reps: exerciseSets.reps,
        weight: exerciseSets.weight,
      })
      .from(exerciseSets)
      .where(eq(exerciseSets.sessionId, activeSessionId))
      .orderBy(asc(exerciseSets.workoutExerciseId), asc(exerciseSets.setNumber));

    for (const set of sessionSets) {
      if (set.workoutExerciseId == null) {
        continue;
      }

      const normalizedWeight =
        set.weight === null
          ? null
          : typeof set.weight === "number"
          ? set.weight
          : Number(set.weight);
      const normalizedSetNumber =
        typeof set.setNumber === "number"
          ? set.setNumber
          : Number(set.setNumber ?? 0) || 0;
      const normalizedReps =
        typeof set.reps === "number"
          ? set.reps
          : set.reps === null || set.reps === undefined
          ? null
          : Number(set.reps);

      const workoutExerciseId = set.workoutExerciseId;
      const list = setsByWorkoutExerciseId.get(workoutExerciseId) ?? [];
      list.push({
        id: set.id,
        setNumber: normalizedSetNumber || list.length + 1,
        reps: Number.isNaN(normalizedReps ?? NaN) ? null : normalizedReps,
        weight: Number.isNaN(normalizedWeight ?? NaN) ? null : normalizedWeight,
      });
      setsByWorkoutExerciseId.set(workoutExerciseId, list);
    }

    for (const list of setsByWorkoutExerciseId.values()) {
      list.sort((a, b) => a.setNumber - b.setNumber);
    }

    const previousStats = await Promise.all(
      workoutExercisesRows.map(async (exerciseRow) => {
        const [previousSession] = await db
          .select({
            sessionId: workoutSessions.id,
            completedAt: workoutSessions.completedAt,
          })
          .from(workoutSessions)
          .innerJoin(exerciseSets, eq(exerciseSets.sessionId, workoutSessions.id))
          .where(
            and(
              eq(exerciseSets.exerciseId, exerciseRow.exerciseId),
              isNotNull(workoutSessions.completedAt),
            ),
          )
          .orderBy(desc(workoutSessions.completedAt))
          .limit(1);

        if (!previousSession?.sessionId) {
          return null;
        }

        const rawSets = await db
          .select({
            setNumber: exerciseSets.setNumber,
            reps: exerciseSets.reps,
            weight: exerciseSets.weight,
          })
          .from(exerciseSets)
          .where(
            and(
              eq(exerciseSets.sessionId, previousSession.sessionId),
              eq(exerciseSets.exerciseId, exerciseRow.exerciseId),
            ),
          )
          .orderBy(asc(exerciseSets.setNumber));

        if (rawSets.length === 0) {
          return null;
        }

        const completedAt =
          previousSession.completedAt instanceof Date
            ? previousSession.completedAt
            : previousSession.completedAt
            ? new Date(previousSession.completedAt)
            : null;

        const sets: PreviousSet[] = rawSets.map((set, index) => {
          const numericSetNumber =
            typeof set.setNumber === "number" ? set.setNumber : Number(set.setNumber ?? NaN);
          const normalizedSetNumber =
            Number.isFinite(numericSetNumber) && numericSetNumber > 0
              ? numericSetNumber
              : index + 1;

          const numericReps =
            typeof set.reps === "number"
              ? set.reps
              : set.reps == null
              ? null
              : Number(set.reps);
          const reps =
            numericReps == null || Number.isNaN(numericReps) ? null : numericReps;

          const numericWeight =
            set.weight === null
              ? null
              : typeof set.weight === "number"
              ? set.weight
              : Number(set.weight);
          const weight =
            numericWeight == null || Number.isNaN(numericWeight) ? null : numericWeight;

          return {
            setNumber: normalizedSetNumber,
            reps,
            weight,
          };
        });

        return {
          exerciseId: exerciseRow.exerciseId,
          stat: {
            completedAt,
            sets,
          },
        };
      }),
    );

    for (const stat of previousStats) {
      if (stat) {
        previousStatsByExerciseId.set(stat.exerciseId, stat.stat);
      }
    }
  }

  return (
    <section className="flex w-full flex-1 flex-col gap-4 px-4 pb-5 pt-3 text-white">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{workoutRow.name}&nbsp;</h1>
            {isActiveSessionForWorkout && activeSessionId ? (
              <span className="relative inline-flex h-2 w-2 items-center justify-center">
                <span className="absolute left-1/2 top-1/2 inline-flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 transform animate-ping rounded-full bg-emerald-400/70 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.65)]" />
              </span>
            ) : null}
          </div>
          {isActiveSessionForWorkout && activeSessionId ? (
            <form
              action={async (formData) => {
                "use server";
                await endWorkout(formData);
                redirect("/workout");
              }}
            >
              <input
                type="hidden"
                name="sessionId"
                value={String(activeSessionId)}
              />
              <button
                type="submit"
                className="rounded-full border border-rose-400/40 bg-rose-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-rose-100 transition hover:border-rose-300 hover:bg-rose-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40"
              >
                End
              </button>
            </form>
          ) : null}
        </div>
      </header>
      <div className="flex flex-col items-end gap-2">
        {isActiveSessionForWorkout && activeSessionStartedAt ? (
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
            Started{" "}
            {new Intl.DateTimeFormat("en-US", {
              hour: "numeric",
              minute: "numeric",
            }).format(activeSessionStartedAt)}
          </p>
        ) : null}
        {isActiveSessionForWorkout && activeSessionId ? null : (
          <form action={startWorkout}>
            <input
              type="hidden"
              name="workoutId"
              value={String(workoutRow.id)}
            />
            <button
              type="submit"
              className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
            >
              Start workout
            </button>
          </form>
        )}
      </div>
      {isActiveSessionForWorkout && activeSessionId ? (
        <WorkoutExerciseCarousel
          sessionId={activeSessionId}
          workoutId={workoutRow.id}
          initialExerciseId={
            typeof activeExerciseId === "number" ? activeExerciseId : null
          }
          logSetAction={logExerciseSet}
          deleteSetAction={deleteExerciseSet}
          setActiveExerciseAction={setActiveExercise}
          exercises={workoutExercisesRows.map((item) => ({
            workoutExerciseId: item.id,
            exerciseId: item.exerciseId,
            name: item.exerciseName,
            order: item.order,
            sets: setsByWorkoutExerciseId.get(item.id) ?? [],
            previous: previousStatsByExerciseId.get(item.exerciseId) ?? null,
          }))}
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          {workoutExercisesRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.05] px-4 py-6 text-center text-sm text-white/60">
              No exercises assigned to this workout yet.
            </div>
          ) : (
            workoutExercisesRows.map((item) => (
              <article
                key={item.id}
                className="rounded-3xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm text-white/75 shadow-[0_18px_30px_-20px_rgba(0,0,0,0.55)] backdrop-blur transition hover:border-white/20 hover:bg-white/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-white/80">{item.exerciseName}</span>
                  <span className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                    #{item.order}
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
