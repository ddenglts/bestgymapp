'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { WorkoutCard } from "@/components/workout-card";
import { WorkoutComposer } from "@/components/workout-composer";
import { Toast } from "@/components/toast";
import {
  addExerciseToWorkout,
  createWorkout,
  deleteWorkout,
  removeWorkoutExercise,
  reorderWorkoutExercises,
} from "./actions";
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
  const [pendingDeleteExerciseIds, setPendingDeleteExerciseIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [pendingReorderExerciseIds, setPendingReorderExerciseIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [pendingDeleteConfirmId, setPendingDeleteConfirmId] = useState<number | null>(null);
  const deleteConfirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const clearDeleteConfirmation = () => {
    if (deleteConfirmTimeoutRef.current) {
      clearTimeout(deleteConfirmTimeoutRef.current);
      deleteConfirmTimeoutRef.current = null;
    }
    setPendingDeleteConfirmId(null);
  };

  const handleDeleteExercise = (workoutId: number, workoutExerciseId: number) => {
    setErrorMessage(null);

    setPendingDeleteExerciseIds((prev) => {
      if (prev.has(workoutExerciseId)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(workoutExerciseId);
      return next;
    });

    removeWorkoutExercise({ id: workoutExerciseId })
      .then(() => {
        setWorkouts((prev) =>
          prev.map((workout) =>
            workout.id === workoutId
              ? {
                  ...workout,
                  exercises: workout.exercises.filter(
                    (exercise) => exercise.id !== workoutExerciseId,
                  ),
                }
              : workout,
          ),
        );
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
      })
      .finally(() => {
        clearDeleteConfirmation();
        setPendingDeleteExerciseIds((prev) => {
          if (!prev.has(workoutExerciseId)) {
            return prev;
          }
          const next = new Set(prev);
          next.delete(workoutExerciseId);
          return next;
        });
      });
  };

  const handleDeleteClick = (workoutId: number, workoutExerciseId: number) => {
    if (pendingDeleteConfirmId === workoutExerciseId) {
      clearDeleteConfirmation();
      handleDeleteExercise(workoutId, workoutExerciseId);
      return;
    }

    if (deleteConfirmTimeoutRef.current) {
      clearTimeout(deleteConfirmTimeoutRef.current);
    }

    setPendingDeleteConfirmId(workoutExerciseId);
    deleteConfirmTimeoutRef.current = setTimeout(() => {
      deleteConfirmTimeoutRef.current = null;
      setPendingDeleteConfirmId((current) =>
        current === workoutExerciseId ? null : current,
      );
    }, 2500);
  };

  const handleMoveExercise = (
    workoutId: number,
    workoutExerciseId: number,
    direction: "up" | "down",
  ) => {
    setErrorMessage(null);

    const workout = workouts.find((item) => item.id === workoutId);
    if (!workout) {
      return;
    }

    const previousOrder = [...workout.exercises];
    const currentIndex = previousOrder.findIndex(
      (exercise) => exercise.id === workoutExerciseId,
    );

    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= previousOrder.length) {
      return;
    }

    const neighborExerciseId = previousOrder[targetIndex].id;

    const updatedOrder = [...previousOrder];
    [updatedOrder[currentIndex], updatedOrder[targetIndex]] = [
      updatedOrder[targetIndex],
      updatedOrder[currentIndex],
    ];

    setPendingReorderExerciseIds((prev) => {
      const next = new Set(prev);
      next.add(workoutExerciseId);
      next.add(neighborExerciseId);
      return next;
    });

    setWorkouts((prev) =>
      prev.map((item) =>
        item.id === workoutId ? { ...item, exercises: updatedOrder } : item,
      ),
    );

    const orderedExerciseIds = updatedOrder.map((exercise) => exercise.id);

    reorderWorkoutExercises({ workoutId, orderedExerciseIds })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
        setWorkouts((prev) =>
          prev.map((item) =>
            item.id === workoutId ? { ...item, exercises: previousOrder } : item,
          ),
        );
      })
      .finally(() => {
        setPendingReorderExerciseIds((prev) => {
          const next = new Set(prev);
          next.delete(workoutExerciseId);
          next.delete(neighborExerciseId);
          return next;
        });
      });
  };

  useEffect(
    () => () => {
      if (deleteConfirmTimeoutRef.current) {
        clearTimeout(deleteConfirmTimeoutRef.current);
      }
    },
    [],
  );

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
        </header>
        {errorMessage ? <Toast message={errorMessage} onDismiss={dismissToast} /> : null}
        <div className="flex flex-col gap-3">
          <SwipeableList>
            {workouts.map((workout, index) => {
              const isAdding = openWorkoutId === workout.id;
              const isSubmitting = pendingAddWorkoutId === workout.id;
              const workoutExercises = workout.exercises;
              const exerciseItems = workoutExercises.map((exercise, index) => ({
                id: exercise.id,
                name: exercise.name,
                onDelete: () => handleDeleteClick(workout.id, exercise.id),
                isDeleting: pendingDeleteExerciseIds.has(exercise.id),
                isAwaitingDeleteConfirm: pendingDeleteConfirmId === exercise.id,
                onMoveUp: () => handleMoveExercise(workout.id, exercise.id, "up"),
                onMoveDown: () => handleMoveExercise(workout.id, exercise.id, "down"),
                canMoveUp: index > 0,
                canMoveDown: index < workoutExercises.length - 1,
                isMoving: pendingReorderExerciseIds.has(exercise.id),
              }));

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
                      exercises={exerciseItems}
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
