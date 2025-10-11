import { asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  exerciseSets,
  exercises,
  workoutSessions,
  workouts,
} from "@/db/schema";
import { HistoryList } from "./history-list";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const sessionRows = await db
    .select({
      id: workoutSessions.id,
      workoutName: workouts.name,
      startedAt: workoutSessions.startedAt,
      completedAt: workoutSessions.completedAt,
    })
    .from(workoutSessions)
    .leftJoin(workouts, eq(workoutSessions.workoutId, workouts.id))
    .where(isNotNull(workoutSessions.completedAt))
    .orderBy(
      desc(workoutSessions.completedAt),
      desc(workoutSessions.startedAt),
    )
    .limit(20);

  if (sessionRows.length === 0) {
    return (
      <section className="flex w-full flex-1 flex-col items-center px-4 py-5">
        <div className="flex w-full flex-col gap-3.5">
          <header className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight text-white">
              History
            </h1>
          </header>
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.05] px-4 py-6 text-center text-sm text-white/60">
            Workout history will appear here once you log a session.
          </div>
        </div>
      </section>
    );
  }

  const sessionIds = sessionRows.map((row) => row.id);

  const setRows = await db
    .select({
      sessionId: exerciseSets.sessionId,
      exerciseId: exerciseSets.exerciseId,
      exerciseName: exercises.name,
      setId: exerciseSets.id,
      setNumber: exerciseSets.setNumber,
      reps: exerciseSets.reps,
      weight: exerciseSets.weight,
    })
    .from(exerciseSets)
    .innerJoin(exercises, eq(exerciseSets.exerciseId, exercises.id))
    .where(inArray(exerciseSets.sessionId, sessionIds))
    .orderBy(
      asc(exerciseSets.sessionId),
      asc(exerciseSets.exerciseId),
      asc(exerciseSets.setNumber),
      asc(exerciseSets.id),
    );

  type HistoryExercise = {
    name: string;
    sets: {
      id: number;
      setNumber: number;
      reps: number | null;
      weight: number | null;
    }[];
  };

  const sessionExerciseMap = new Map<number, Map<number, HistoryExercise>>();

  for (const row of setRows) {
    const normalizedReps =
      row.reps === null || typeof row.reps === "number" ? row.reps : Number(row.reps);
    const normalizedWeight =
      row.weight === null || typeof row.weight === "number"
        ? row.weight
        : Number(row.weight);
    const normalizedSetNumber =
      row.setNumber === null || typeof row.setNumber === "number"
        ? row.setNumber ?? 0
        : Number(row.setNumber);

    const exercisesForSession =
      sessionExerciseMap.get(row.sessionId) ?? new Map<number, HistoryExercise>();

    const existingExercise = exercisesForSession.get(row.exerciseId);
    if (existingExercise) {
      existingExercise.sets.push({
        id: row.setId,
        setNumber: normalizedSetNumber || existingExercise.sets.length + 1,
        reps: Number.isNaN(normalizedReps ?? NaN) ? null : normalizedReps,
        weight: Number.isNaN(normalizedWeight ?? NaN) ? null : normalizedWeight,
      });
    } else {
      exercisesForSession.set(row.exerciseId, {
        name: row.exerciseName ?? "Exercise",
        sets: [
          {
            id: row.setId,
            setNumber: normalizedSetNumber || 1,
            reps: Number.isNaN(normalizedReps ?? NaN) ? null : normalizedReps,
            weight: Number.isNaN(normalizedWeight ?? NaN) ? null : normalizedWeight,
          },
        ],
      });
    }

    sessionExerciseMap.set(row.sessionId, exercisesForSession);
  }

  const historyItems = sessionRows.map((session) => {
    const completedAt =
      session.completedAt instanceof Date
        ? session.completedAt
        : session.completedAt
        ? new Date(session.completedAt)
        : null;
    const startedAt =
      session.startedAt instanceof Date
        ? session.startedAt
        : session.startedAt
        ? new Date(session.startedAt)
        : null;

    const durationMinutes =
      completedAt && startedAt
        ? Math.max(
            1,
            Math.round((completedAt.getTime() - startedAt.getTime()) / (1000 * 60)),
          )
        : null;

    const exercisesForSession = sessionExerciseMap.get(session.id);
    const exerciseList = exercisesForSession
      ? Array.from(exercisesForSession.values()).map((exercise) => ({
          name: exercise.name,
          sets: exercise.sets.sort((a, b) => a.setNumber - b.setNumber),
        }))
      : [];

    return {
      id: session.id,
      workoutName: session.workoutName ?? "Workout",
      completedAtISO: completedAt ? completedAt.toISOString() : null,
      durationMinutes,
      exercises: exerciseList,
    };
  });

  return (
    <section className="flex w-full flex-1 flex-col items-center px-4 py-5">
      <div className="flex w-full flex-col gap-3.5">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-white">
            History
          </h1>
        </header>
        <HistoryList items={historyItems} />
      </div>
    </section>
  );
}
