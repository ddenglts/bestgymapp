'use server';

import { revalidatePath } from "next/cache";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  currentWorkout,
  exerciseSets,
  workoutExercises,
  workoutSessions,
} from "@/db/schema";

export async function startWorkout(formData: FormData) {
  const rawWorkoutId = formData.get("workoutId");
  const workoutId = Number(typeof rawWorkoutId === "string" ? rawWorkoutId : "");

  if (!Number.isFinite(workoutId) || workoutId <= 0) {
    throw new Error("Invalid workout.");
  }

  const [session] = await db
    .insert(workoutSessions)
    .values({
      workoutId,
    })
    .returning({
      id: workoutSessions.id,
    });

  if (!session) {
    throw new Error("Unable to start workout.");
  }

  const [firstExercise] = await db
    .select({
      exerciseId: workoutExercises.exerciseId,
    })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(asc(workoutExercises.order))
    .limit(1);

  await db.delete(currentWorkout);
  await db.insert(currentWorkout).values({
    sessionId: session.id,
    activeExerciseId: firstExercise?.exerciseId ?? null,
  });

  revalidatePath(`/workout/start/${workoutId}`, "page");
  revalidatePath("/workout");
  revalidatePath("/", "layout");
}

export async function endWorkout(formData: FormData) {
  const rawSessionId = formData.get("sessionId");
  const sessionId = Number(typeof rawSessionId === "string" ? rawSessionId : "");

  if (!Number.isFinite(sessionId) || sessionId <= 0) {
    throw new Error("Invalid workout session.");
  }

  const [updated] = await db
    .update(workoutSessions)
    .set({
      completedAt: new Date(),
    })
    .where(eq(workoutSessions.id, sessionId))
    .returning({
      workoutId: workoutSessions.workoutId,
    });

  if (!updated) {
    throw new Error("Active workout session not found.");
  }

  await db.delete(currentWorkout).where(eq(currentWorkout.sessionId, sessionId));

  if (updated.workoutId) {
    revalidatePath(`/workout/start/${updated.workoutId}`, "page");
  }
  revalidatePath("/workout");
  revalidatePath("/history");
  revalidatePath("/", "layout");

  return updated.workoutId;
}

export async function logExerciseSet(formData: FormData) {
  const rawWorkoutId = formData.get("workoutId");
  const rawSessionId = formData.get("sessionId");
  const rawWorkoutExerciseId = formData.get("workoutExerciseId");
  const rawExerciseId = formData.get("exerciseId");
  const rawReps = formData.get("reps");
  const rawWeight = formData.get("weight");

  const workoutId = Number(typeof rawWorkoutId === "string" ? rawWorkoutId : "");
  const sessionId = Number(typeof rawSessionId === "string" ? rawSessionId : "");
  const workoutExerciseId = Number(
    typeof rawWorkoutExerciseId === "string" ? rawWorkoutExerciseId : "",
  );
  const exerciseId = Number(typeof rawExerciseId === "string" ? rawExerciseId : "");
  const reps = Number(typeof rawReps === "string" ? rawReps : "");
  const weightInput = typeof rawWeight === "string" ? rawWeight : "";
  const hasWeight = weightInput.trim() !== "";
  if (!hasWeight) {
    throw new Error("Weight must be provided.");
  }
  const weight = Number(weightInput);

  if (
    !Number.isFinite(workoutId) ||
    workoutId <= 0 ||
    !Number.isFinite(sessionId) ||
    sessionId <= 0 ||
    !Number.isFinite(workoutExerciseId) ||
    workoutExerciseId <= 0 ||
    !Number.isFinite(exerciseId) ||
    exerciseId <= 0
  ) {
    throw new Error("Invalid workout context.");
  }

  if (!Number.isFinite(reps) || reps <= 0) {
    throw new Error("Reps must be a positive number.");
  }

  if (!Number.isFinite(weight)) {
    throw new Error("Weight must be a number.");
  }

  const [nextSet] = await db
    .select({
      nextSetNumber: sql<number>`coalesce(max(${exerciseSets.setNumber}), 0) + 1`,
    })
    .from(exerciseSets)
    .where(
      and(
        eq(exerciseSets.sessionId, sessionId),
        eq(exerciseSets.workoutExerciseId, workoutExerciseId),
      ),
    );

  const setNumber = nextSet?.nextSetNumber ?? 1;

  await db.insert(exerciseSets).values({
    sessionId,
    workoutExerciseId,
    exerciseId,
    setNumber,
    reps,
    weight: weight.toString(),
  });

  revalidatePath(`/workout/start/${workoutId}`, "page");
}

export async function deleteExerciseSet(formData: FormData) {
  const rawWorkoutId = formData.get("workoutId");
  const rawSetId = formData.get("setId");

  const workoutId = Number(typeof rawWorkoutId === "string" ? rawWorkoutId : "");
  const setId = Number(typeof rawSetId === "string" ? rawSetId : "");

  if (!Number.isFinite(workoutId) || workoutId <= 0) {
    throw new Error("Invalid workout.");
  }

  if (!Number.isFinite(setId) || setId <= 0) {
    throw new Error("Invalid set.");
  }

  await db.delete(exerciseSets).where(eq(exerciseSets.id, setId));

  revalidatePath(`/workout/start/${workoutId}`, "page");
}

export async function setActiveExercise(formData: FormData) {
  const rawSessionId = formData.get("sessionId");
  const rawExerciseId = formData.get("exerciseId");

  const sessionId = Number(typeof rawSessionId === "string" ? rawSessionId : "");
  const exerciseId = Number(typeof rawExerciseId === "string" ? rawExerciseId : "");

  if (!Number.isFinite(sessionId) || sessionId <= 0) {
    throw new Error("Invalid workout session.");
  }

  if (!Number.isFinite(exerciseId) || exerciseId <= 0) {
    throw new Error("Invalid exercise.");
  }

  const result = await db
    .update(currentWorkout)
    .set({
      activeExerciseId: exerciseId,
      lastUpdatedAt: new Date(),
    })
    .where(eq(currentWorkout.sessionId, sessionId))
    .returning({ id: currentWorkout.id });

  if (result.length === 0) {
    throw new Error("Unable to set active exercise.");
  }
}
