import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { ExercisesView } from "./exercises-view";
import { db } from "@/db/client";
import { exerciseSets, exercises, workoutSessions } from "@/db/schema";

export default async function ExercisesPage() {
  const records = await db
    .select({
      id: exercises.id,
      name: exercises.name,
    })
    .from(exercises)
    .orderBy(desc(exercises.createdAt));

  const exerciseIds = records.map((exercise) => exercise.id);
  const recentSetsMap = new Map<
    number,
    {
      sessionId: number;
      sets: {
        id: number;
        setNumber: number;
        reps: number | null;
        weight: number | null;
      }[];
    }
  >();

  if (exerciseIds.length > 0) {
    const recentSetRows = await db
      .select({
        exerciseId: exerciseSets.exerciseId,
        sessionId: exerciseSets.sessionId,
        setId: exerciseSets.id,
        setNumber: exerciseSets.setNumber,
        reps: exerciseSets.reps,
        weight: exerciseSets.weight,
        completedAt: workoutSessions.completedAt,
      })
      .from(exerciseSets)
      .innerJoin(workoutSessions, eq(workoutSessions.id, exerciseSets.sessionId))
      .where(
        and(
          inArray(exerciseSets.exerciseId, exerciseIds),
          isNotNull(workoutSessions.completedAt),
        ),
      )
      .orderBy(
        asc(exerciseSets.exerciseId),
        desc(workoutSessions.completedAt),
        asc(exerciseSets.setNumber),
        asc(exerciseSets.id),
      );

    for (const row of recentSetRows) {
      const exerciseId = row.exerciseId;
      const normalizedReps =
        row.reps === null || typeof row.reps === "number"
          ? row.reps
          : Number(row.reps);
      const normalizedWeight =
        row.weight === null || typeof row.weight === "number"
          ? row.weight
          : Number(row.weight);
      const normalizedSetNumber =
        row.setNumber === null || typeof row.setNumber === "number"
          ? row.setNumber ?? 0
          : Number(row.setNumber);

      const existing = recentSetsMap.get(exerciseId);
      if (existing) {
        if (existing.sessionId !== row.sessionId) {
          continue;
        }

        existing.sets.push({
          id: row.setId,
          setNumber: normalizedSetNumber || existing.sets.length + 1,
          reps: Number.isNaN(normalizedReps ?? NaN) ? null : normalizedReps,
          weight: Number.isNaN(normalizedWeight ?? NaN) ? null : normalizedWeight,
        });
      } else {
        recentSetsMap.set(exerciseId, {
          sessionId: row.sessionId,
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
    }

    for (const entry of recentSetsMap.values()) {
      entry.sets.sort((a, b) => a.setNumber - b.setNumber);
    }
  }

  const initialExercises = records.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    recentSets: recentSetsMap.get(exercise.id)?.sets ?? [],
  }));

  return <ExercisesView initialExercises={initialExercises} />;
}
