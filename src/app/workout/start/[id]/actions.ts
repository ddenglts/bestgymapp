"use server";

import { revalidatePath } from "next/cache";
import { workoutSessionStore } from "@/db/workout-session-store";
import { CURRENT_WORKOUT_TOAST_KEY } from "./toast-constants";

export type StartWorkoutResult =
  | {
      status: "redirect";
      redirectTo: string;
      message: string;
      storageKey: typeof CURRENT_WORKOUT_TOAST_KEY;
    }
  | {
      status: "started";
    };

export async function startWorkout(formData: FormData): Promise<StartWorkoutResult> {
  const rawWorkoutId = formData.get("workoutId");
  const workoutId = Number(typeof rawWorkoutId === "string" ? rawWorkoutId : "");

  if (!Number.isInteger(workoutId) || workoutId <= 0) {
    throw new Error("Invalid workout.");
  }

  const result = await workoutSessionStore.start(workoutId);
  if (!result.started) {
    return {
      status: "redirect",
      redirectTo: `/workout/start/${result.workoutId}`,
      message: result.workoutId === workoutId
        ? "You already have this workout in progress."
        : "Resuming your current workout session.",
      storageKey: CURRENT_WORKOUT_TOAST_KEY,
    };
  }

  revalidatePath(`/workout/start/${workoutId}`, "page");
  revalidatePath("/workout");
  revalidatePath("/", "layout");

  return {
    status: "started",
  };
}

export async function endWorkout(formData: FormData) {
  const rawSessionId = formData.get("sessionId");
  const sessionId = Number(typeof rawSessionId === "string" ? rawSessionId : "");

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    throw new Error("Invalid workout session.");
  }

  const workoutId = await workoutSessionStore.end(sessionId);
  if (workoutId) {
    revalidatePath(`/workout/start/${workoutId}`, "page");
  }
  revalidatePath("/workout");
  revalidatePath("/history");
  revalidatePath("/", "layout");

  return workoutId;
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
    !Number.isInteger(workoutId) ||
    workoutId <= 0 ||
    !Number.isInteger(sessionId) ||
    sessionId <= 0 ||
    !Number.isInteger(workoutExerciseId) ||
    workoutExerciseId <= 0 ||
    !Number.isInteger(exerciseId) ||
    exerciseId <= 0
  ) {
    throw new Error("Invalid workout context.");
  }

  if (!Number.isInteger(reps) || reps <= 0) {
    throw new Error("Reps must be a positive number.");
  }

  if (!Number.isFinite(weight) || weight < 0 || weight > 99999999.99) {
    throw new Error("Weight must be a number.");
  }

  await workoutSessionStore.logSet({
    workoutId, sessionId, workoutExerciseId, exerciseId, reps, weight,
  });

  revalidatePath(`/workout/start/${workoutId}`, "page");
}

export async function deleteExerciseSet(formData: FormData) {
  const rawWorkoutId = formData.get("workoutId");
  const rawSetId = formData.get("setId");
  const sessionId = Number(formData.get("sessionId"));

  const workoutId = Number(typeof rawWorkoutId === "string" ? rawWorkoutId : "");
  const setId = Number(typeof rawSetId === "string" ? rawSetId : "");

  if (!Number.isInteger(workoutId) || workoutId <= 0) {
    throw new Error("Invalid workout.");
  }

  if (!Number.isInteger(sessionId) || sessionId <= 0 || !Number.isInteger(setId) || setId <= 0) {
    throw new Error("Invalid set.");
  }

  await workoutSessionStore.deleteSet(workoutId, sessionId, setId);

  revalidatePath(`/workout/start/${workoutId}`, "page");
}

export async function setActiveExercise(formData: FormData) {
  const rawSessionId = formData.get("sessionId");
  const rawExerciseId = formData.get("exerciseId");

  const sessionId = Number(typeof rawSessionId === "string" ? rawSessionId : "");
  const exerciseId = Number(typeof rawExerciseId === "string" ? rawExerciseId : "");

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    throw new Error("Invalid workout session.");
  }

  if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
    throw new Error("Invalid exercise.");
  }

  await workoutSessionStore.setActiveExercise(sessionId, exerciseId);
}
