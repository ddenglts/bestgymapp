'use client';

import { useCallback, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { WorkoutCard } from "@/components/workout-card";
import { WorkoutComposer } from "@/components/workout-composer";
import { Toast } from "@/components/toast";
import { addExerciseToWorkout, createWorkout, deleteWorkout } from "./actions";
import {
  SwipeableList,
  SwipeableListItem,
  TrailingActions,
  SwipeAction,
} from "react-swipeable-list";
import "react-swipeable-list/dist/styles.css";

type WorkoutExercise = {
  id: number; // workout_exercise id
  exerciseId: number;
  name: string;
};

type WorkoutSummary = {
  id: number;
  name: string;
  createdAt: Date;
  exercises: WorkoutExercise[];
};

type AvailableExercise = {
  id: number;
  name: string;
};

type WorkoutsViewProps = {
  initialWorkouts: WorkoutSummary[];
  availableExercises: AvailableExercise[];
};

export function WorkoutsView({
  initialWorkouts,
  availableExercises,
}: WorkoutsViewProps) {
  const [workouts, setWorkouts] = useState(initialWorkouts);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [openWorkoutId, setOpenWorkoutId] = useState<number | null>(null);
  const [pendingAddWorkoutId, setPendingAddWorkoutId] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const dismissToast = useCallback(() => setErrorMessage(null), []);

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = formData.get("name")?.toString().trim() ?? "";

    if (!name) {
      setErrorMessage("Workout name is required.");
      return;
    }

    setErrorMessage(null);

    startTransition(() => {
      createWorkout({ name })
        .then((created) => {
          const createdWorkout: WorkoutSummary = {
            id: created.id,
            name: created.name,
            createdAt: created.createdAt ? new Date(created.createdAt) : new Date(),
            exercises: [],
          };

          setWorkouts((prev) => {
            if (prev.some((workout) => workout.id === createdWorkout.id)) {
              return prev;
            }

            return [...prev, createdWorkout];
          });

          form.reset();
          setIsComposerOpen(false);
        })
        .catch((error) => {
          setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
        });
    });
  };

  const handleCancelCreate = () => {
    formRef.current?.reset();
    setErrorMessage(null);
    setIsComposerOpen(false);
  };

  const handleAddExerciseSubmit = (
    event: FormEvent<HTMLFormElement>,
    workoutId: number,
  ) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const exerciseIdValue = formData.get("exerciseId");
    const exerciseId = Number(exerciseIdValue);

    if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
      setErrorMessage("Select an exercise to add.");
      return;
    }

    setErrorMessage(null);
    setPendingAddWorkoutId(workoutId);

    addExerciseToWorkout({ workoutId, exerciseId })
      .then((result) => {
        setWorkouts((prev) =>
          prev.map((workout) =>
            workout.id === workoutId
              ? {
                  ...workout,
                  exercises: [
                    ...workout.exercises,
                    {
                      id: result.workoutExerciseId,
                      exerciseId: result.exercise.id,
                      name: result.exercise.name,
                    },
                  ],
                }
              : workout,
          ),
        );
        form.reset();
        setOpenWorkoutId(null);
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
      })
      .finally(() => {
        setPendingAddWorkoutId((current) => (current === workoutId ? null : current));
      });
  };

  const handleCancelAddExercise = () => {
    setOpenWorkoutId(null);
    setPendingAddWorkoutId(null);
  };

  const handleDeleteWorkout = async (workoutId: number) => {
    setErrorMessage(null);

    try {
      await deleteWorkout({ id: workoutId });
      setWorkouts((prev) => prev.filter((workout) => workout.id !== workoutId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      day: "numeric",
      year: "2-digit",
    }).format(date);

  return (
    <section className="flex w-full flex-1 flex-col items-center px-4 py-5">
      <div className="flex w-full flex-col gap-3.5">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-white">Workouts</h1>
          <p className="text-sm text-white/60">
            Build templates and load them faster during your sessions.
          </p>
        </header>
        {errorMessage ? <Toast message={errorMessage} onDismiss={dismissToast} /> : null}
        <div className="flex flex-col gap-3">
          <SwipeableList>
            {workouts.map((workout, index) => {
              const isAdding = openWorkoutId === workout.id;
              const isSubmitting = pendingAddWorkoutId === workout.id;
              const workoutExercises = workout.exercises;

              const footerContent = isAdding ? (
                <form
                  onSubmit={(event) => handleAddExerciseSubmit(event, workout.id)}
                  className="flex max-w-[220px] flex-col gap-1.5 rounded-2xl border border-dashed border-white/25 bg-white/[0.04] p-2.5 shadow-[0_18px_24px_-18px_rgba(0,0,0,0.55)] backdrop-blur"
                >
                  <div className="flex flex-1 flex-col gap-1">
                  <label
                    htmlFor={`exercise-select-${workout.id}`}
                    className="text-xs uppercase tracking-[0.2em] text-white/60"
                  >
                    Add exercise
                  </label>
                  <select
                    id={`exercise-select-${workout.id}`}
                    name="exerciseId"
                    defaultValue=""
                    className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white focus:border-white/40 focus:outline-none"
                    disabled={isSubmitting}
                  >
                    <option value="" disabled>
                      Select an exercise
                    </option>
                    {availableExercises.map((exercise) => (
                      <option key={exercise.id} value={exercise.id} className="bg-black">
                        {exercise.name}
                      </option>
                    ))}
                  </select>
                </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCancelAddExercise}
                      disabled={isSubmitting}
                      className="rounded-lg border border-white/10 px-3 py-1 text-[11px] font-medium text-white/70 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-lg border border-white/10 bg-white/[0.08] px-3 py-1 text-[11px] font-semibold tracking-tight text-white transition hover:border-white/20 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? "Adding…" : "Add"}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOpenWorkoutId(workout.id);
                    setErrorMessage(null);
                    requestAnimationFrame(() => {
                      document.getElementById(`exercise-select-${workout.id}`)?.focus();
                    });
                  }}
                  className="group inline-flex max-w-[220px] items-center gap-1.5 rounded-2xl border border-dashed border-white/25 bg-white/[0.05] px-3.5 py-2 text-left text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <span>Add exercise</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs transition group-hover:border-white/25 group-hover:bg-white/20">
                    →
                  </span>
                </button>
              );

              const exerciseList = (
                <div className="flex flex-col gap-2.5">
                  {workoutExercises.length > 0 ? (
                    workoutExercises.map((exercise) => (
                      <div
                        key={exercise.id}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-medium text-white/80"
                      >
                        {exercise.name}
                      </div>
                    ))
                  ) : (
                    <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-medium text-white/60">
                      No exercises yet
                    </div>
                  )}
                </div>
              );

              return (
                <SwipeableListItem
                  key={workout.id}
                  trailingActions={
                    <TrailingActions>
                      <SwipeAction
                        destructive
                        onClick={() => handleDeleteWorkout(workout.id)}
                      >
                        <div className="flex h-full items-center justify-center bg-red-600/80 px-6 text-sm font-semibold uppercase tracking-[0.3em] text-white">
                          Delete
                        </div>
                      </SwipeAction>
                    </TrailingActions>
                  }
                >
                  <div className={`w-full ${index < workouts.length - 1 ? "mb-3.5" : "mb-0"}`}>
                    <WorkoutCard
                      title={workout.name}
                      meta={`Created ${formatDate(workout.createdAt)}`}
                      exercises={exerciseList}
                      footer={<div className="flex justify-start">{footerContent}</div>}
                    />
                  </div>
                </SwipeableListItem>
              );
            })}
          </SwipeableList>
          <div className="mt-0.5 w-full">
            <WorkoutComposer
              isOpen={isComposerOpen}
              isSubmitting={isPending}
              onOpen={() => {
                setErrorMessage(null);
                setIsComposerOpen(true);
                requestAnimationFrame(() => {
                  formRef.current?.querySelector<HTMLInputElement>("#name")?.focus();
                });
              }}
              onCancel={handleCancelCreate}
              onSubmit={handleCreateSubmit}
              formRef={formRef}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
