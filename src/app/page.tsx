import { asc, desc, eq } from "drizzle-orm";
import { WorkoutsView } from "@/app/workouts/workouts-view";
import { db } from "@/db/client";
import { exercises, workoutExercises, workouts } from "@/db/schema";

export default async function WorkoutsPage() {
  const rows = await db
    .select({
      workoutId: workouts.id,
      workoutName: workouts.name,
      workoutCreatedAt: workouts.createdAt,
      workoutExerciseId: workoutExercises.id,
      exerciseId: exercises.id,
      exerciseName: exercises.name,
      exerciseOrder: workoutExercises.order,
    })
    .from(workouts)
    .leftJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id))
    .leftJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .orderBy(desc(workouts.createdAt), asc(workoutExercises.order));

  const workoutMap = new Map<
    number,
    {
      id: number;
      name: string;
      createdAt: Date;
      exercises: { id: number; exerciseId: number; name: string }[];
    }
  >();

  for (const row of rows) {
    const existing = workoutMap.get(row.workoutId);
    if (!existing) {
      workoutMap.set(row.workoutId, {
        id: row.workoutId,
        name: row.workoutName,
        createdAt:
          row.workoutCreatedAt instanceof Date
            ? row.workoutCreatedAt
            : new Date(row.workoutCreatedAt),
        exercises: [],
      });
    }

    if (row.exerciseId && row.workoutExerciseId) {
      const workout = workoutMap.get(row.workoutId)!;
      workout.exercises.push({
        id: row.workoutExerciseId,
        exerciseId: row.exerciseId,
        name: row.exerciseName!,
      });
    }
  }

  const initialWorkouts = Array.from(workoutMap.values());

  const availableExercises = await db
    .select({
      id: exercises.id,
      name: exercises.name,
    })
    .from(exercises)
    .orderBy(asc(exercises.name));

  return (
    <WorkoutsView
      initialWorkouts={initialWorkouts}
      availableExercises={availableExercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
      }))}
    />
  );
}
