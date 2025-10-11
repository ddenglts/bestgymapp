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
      createdAt: workouts.createdAt,
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
  const createdAt =
    workoutRow.createdAt instanceof Date
      ? workoutRow.createdAt
      : new Date(workoutRow.createdAt);

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

  type PreviousStat = {
    reps: number | null;
    weight: number | null;
    completedAt: Date | null;
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
        const [previous] = await db
          .select({
            reps: exerciseSets.reps,
            weight: exerciseSets.weight,
            completedAt: workoutSessions.completedAt,
          })
          .from(exerciseSets)
          .innerJoin(workoutSessions, eq(exerciseSets.sessionId, workoutSessions.id))
          .where(
            and(
              eq(exerciseSets.exerciseId, exerciseRow.exerciseId),
              isNotNull(workoutSessions.completedAt),
            ),
          )
          .orderBy(desc(workoutSessions.completedAt), desc(exerciseSets.setNumber))
          .limit(1);

        if (!previous) {
          return null;
        }

        const normalizedWeight =
          previous.weight === null
            ? null
            : typeof previous.weight === "number"
            ? previous.weight
            : Number(previous.weight);

        const completedAt =
          previous.completedAt instanceof Date
            ? previous.completedAt
            : previous.completedAt
            ? new Date(previous.completedAt)
            : null;

        return {
          exerciseId: exerciseRow.exerciseId,
          stat: {
            reps: typeof previous.reps === "number" ? previous.reps : previous.reps ?? null,
            weight: Number.isNaN(normalizedWeight ?? NaN) ? null : normalizedWeight,
            completedAt,
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
    <section className="flex w-full flex-1 flex-col gap-4 px-4 py-5 text-white">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">{workoutRow.name}</h1>
        <p className="text-sm text-white/60">
          Created{" "}
          {new Intl.DateTimeFormat("en-US", {
            month: "numeric",
            day: "numeric",
            year: "2-digit",
          }).format(createdAt)}
        </p>
      </header>
      <div className="flex flex-col items-end gap-2">
        {isActiveSessionForWorkout && activeSessionStartedAt ? (
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
            Started{" "}
            {new Intl.DateTimeFormat("en-US", {
              month: "numeric",
              day: "numeric",
              year: "2-digit",
              hour: "numeric",
              minute: "numeric",
            }).format(activeSessionStartedAt)}
          </p>
        ) : null}
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
              className="rounded-full border border-rose-400/40 bg-rose-500/20 px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-rose-100 transition hover:border-rose-300 hover:bg-rose-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40"
            >
              End workout
            </button>
          </form>
        ) : (
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
