'use server';

import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
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
    .select({ id: workoutExercises.id, order: workoutExercises.order })
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

type ReorderWorkoutExercisesInput = {
  workoutId: number;
  orderedExerciseIds: number[];
};

export async function reorderWorkoutExercises({
  workoutId,
  orderedExerciseIds,
}: ReorderWorkoutExercisesInput) {
  if (!Number.isInteger(workoutId) || workoutId <= 0) {
    throw new Error("Invalid workout.");
  }

  if (orderedExerciseIds.length === 0) {
    return;
  }

  const uniqueIds = new Set(orderedExerciseIds);

  if (uniqueIds.size !== orderedExerciseIds.length) {
    throw new Error("Invalid exercise ordering.");
  }

  const existing = await db
    .select({ id: workoutExercises.id, order: workoutExercises.order })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(asc(workoutExercises.order));

  if (existing.length !== orderedExerciseIds.length) {
    throw new Error("Exercises have changed. Refresh and try again.");
  }

  const existingIds = existing.map((row) => row.id);
  const existingIdSet = new Set(existingIds);

  for (const id of orderedExerciseIds) {
    if (!existingIdSet.has(id)) {
      throw new Error("Exercises have changed. Refresh and try again.");
    }
  }

  const isSameOrder = existingIds.every(
    (id, index) => id === orderedExerciseIds[index],
  );

  if (isSameOrder) {
    return;
  }

  const maxExistingOrder = existing.reduce(
    (max, row) => (row.order > max ? row.order : max),
    0,
  );
  const offset = maxExistingOrder + orderedExerciseIds.length + 1;

  const buildCaseExpression = (pairs: { id: number; order: number }[]) => {
    const fragments = pairs.map(
      ({ id, order }) => sql`WHEN ${workoutExercises.id} = ${id} THEN ${order}`,
    );

    return sql<number>`
      CASE
        ${sql.join(fragments, sql.raw(" "))}
        ELSE ${workoutExercises.order}
      END
    `;
  };

  const targetWhereClause = and(
    eq(workoutExercises.workoutId, workoutId),
    inArray(workoutExercises.id, orderedExerciseIds),
  );

  await db
    .update(workoutExercises)
    .set({
      order: sql`${workoutExercises.order} + ${offset}`,
    })
    .where(targetWhereClause);

  const desiredOrder = orderedExerciseIds.map((id, index) => ({
    id,
    order: index + 1,
  }));

  try {
    await db
      .update(workoutExercises)
      .set({
        order: buildCaseExpression(desiredOrder),
      })
      .where(targetWhereClause);
  } catch (error) {
    await db
      .update(workoutExercises)
      .set({
        order: buildCaseExpression(existing),
      })
      .where(targetWhereClause);

    throw error;
  }

  revalidatePath("/");
}
