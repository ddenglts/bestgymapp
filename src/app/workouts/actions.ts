'use server';

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { exercises, workoutExercises, workouts } from "@/db/schema";

type CreateWorkoutInput = {
  name: string;
};

export async function createWorkout({ name }: CreateWorkoutInput) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Workout name is required.");
  }

  const existing = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(eq(workouts.name, trimmedName))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("You already have a workout with that name.");
  }

  const [inserted] = await db
    .insert(workouts)
    .values({
      name: trimmedName,
    })
    .returning();

  revalidatePath("/");
  return inserted;
}

type AddExerciseToWorkoutInput = {
  workoutId: number;
  exerciseId: number;
};

export async function addExerciseToWorkout({
  workoutId,
  exerciseId,
}: AddExerciseToWorkoutInput) {
  if (!Number.isInteger(workoutId) || workoutId <= 0) {
    throw new Error("Invalid workout.");
  }

  if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
    throw new Error("Select an exercise to add.");
  }

  const existing = await db
    .select({ id: workoutExercises.id })
    .from(workoutExercises)
    .where(
      and(
        eq(workoutExercises.workoutId, workoutId),
        eq(workoutExercises.exerciseId, exerciseId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error("That exercise is already in this workout.");
  }

  const orderResult = await db
    .select({
      maxOrder: sql<number>`COALESCE(MAX(${workoutExercises.order}), 0)`,
    })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId));

  const nextOrder = Number(orderResult[0]?.maxOrder ?? 0) + 1;

  const [inserted] = await db
    .insert(workoutExercises)
    .values({
      workoutId,
      exerciseId,
      order: nextOrder,
    })
    .returning({
      id: workoutExercises.id,
    });

  const [exerciseRecord] = await db
    .select({
      id: exercises.id,
      name: exercises.name,
    })
    .from(exercises)
    .where(eq(exercises.id, exerciseId))
    .limit(1);

  if (!exerciseRecord) {
    throw new Error("Exercise not found.");
  }

  revalidatePath("/");

  return {
    workoutExerciseId: inserted.id,
    exercise: exerciseRecord,
  };
}

type DeleteWorkoutInput = {
  id: number;
};

export async function deleteWorkout({ id }: DeleteWorkoutInput) {
  const deleted = await db.delete(workouts).where(eq(workouts.id, id)).returning();

  if (deleted.length === 0) {
    throw new Error("Workout not found.");
  }

  revalidatePath("/");
}

type RemoveWorkoutExerciseInput = {
  id: number;
};

export async function removeWorkoutExercise({ id }: RemoveWorkoutExerciseInput) {
  const deleted = await db
    .delete(workoutExercises)
    .where(eq(workoutExercises.id, id))
    .returning();

  if (deleted.length === 0) {
    throw new Error("Exercise not found in workout.");
  }

  revalidatePath("/");
}
