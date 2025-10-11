'use server';

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { exercises } from "@/db/schema";

type CreateExerciseInput = {
  name: string;
};

export async function createExercise({ name }: CreateExerciseInput) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Name is required.");
  }

  try {
    const [inserted] = await db
      .insert(exercises)
      .values({
        name: trimmedName,
      })
      .returning();

    revalidatePath("/exercises");
    return inserted;
  } catch {
    throw new Error("Unable to create exercise. Please try again.");
  }
}

type DeleteExerciseInput = {
  id: number;
};

export async function deleteExercise({ id }: DeleteExerciseInput) {
  const deleted = await db.delete(exercises).where(eq(exercises.id, id)).returning();

  if (deleted.length === 0) {
    throw new Error("Exercise not found.");
  }

  revalidatePath("/exercises");
}
