'use client';

import { useCallback, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import type { ExerciseCardData } from "@/components/exercise-card";
import { ExerciseCard } from "@/components/exercise-card";
import { ExerciseComposer } from "@/components/exercise-composer";
import { Toast } from "@/components/toast";
import {
  SwipeableList,
  SwipeableListItem,
  TrailingActions,
  SwipeAction,
} from "react-swipeable-list";
import "react-swipeable-list/dist/styles.css";
import { createExercise, deleteExercise } from "./actions";

type ExercisesViewProps = {
  initialExercises: ExerciseCardData[];
};

export function ExercisesView({ initialExercises }: ExercisesViewProps) {
  const [exercises, setExercises] = useState(initialExercises);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement | null>(null);

  const dismissToast = useCallback(() => setErrorMessage(null), []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = formData.get("name")?.toString().trim() ?? "";

    if (!name) {
      setErrorMessage("Name is required.");
      return;
    }

    setErrorMessage(null);

    startTransition(() => {
      createExercise({
        name,
      })
        .then((created) => {
          const createdExercise: ExerciseCardData = {
            id: created.id,
            name: created.name,
            createdAt: created.createdAt ? new Date(created.createdAt) : new Date(),
          };

          setExercises((prev) => {
            if (prev.some((exercise) => exercise.id === createdExercise.id)) {
              return prev;
            }

            return [createdExercise, ...prev];
          });
          form.reset();
          setIsComposerOpen(false);
        })
        .catch((error) => {
          setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
        });
    });
  };

  const handleCancel = () => {
    formRef.current?.reset();
    setErrorMessage(null);
    setIsComposerOpen(false);
  };

  const handleDelete = async (id: number): Promise<boolean> => {
    setErrorMessage(null);

    let removedExercise: ExerciseCardData | null = null;
    let removedIndex = -1;

    setExercises((prev) => {
      const next = [...prev];
      const index = next.findIndex((exercise) => exercise.id === id);

      if (index === -1) {
        return prev;
      }

      removedExercise = next[index];
      removedIndex = index;
      next.splice(index, 1);
      return next;
    });

    try {
      await deleteExercise({ id });
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");

      if (removedExercise) {
        setExercises((prev) => {
          if (prev.some((exercise) => exercise.id === id)) {
            return prev;
          }

          const next = [...prev];
          next.splice(Math.min(removedIndex, next.length), 0, removedExercise);
          return next;
        });
      }

      return false;
    }
  };

  return (
    <section className="flex w-full flex-1 flex-col items-center px-3 py-4">
      <div className="flex w-full flex-col gap-3">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Exercises
          </h1>
          <p className="text-sm text-white/60">
            Build your library and keep movement cues close by.
          </p>
        </header>
        {errorMessage ? <Toast message={errorMessage} onDismiss={dismissToast} /> : null}
        <div className="flex flex-col gap-0">
          <SwipeableList>
            {exercises.map((exercise, index) => (
              <SwipeableListItem
                key={exercise.id}
                trailingActions={
                  <TrailingActions>
                    <SwipeAction
                      destructive
                      onClick={() => handleDelete(exercise.id)}
                    >
                      <div className="flex h-full items-center justify-center bg-red-500/80 px-6 text-sm font-semibold uppercase tracking-[0.3em] text-white">
                        Delete
                      </div>
                    </SwipeAction>
                  </TrailingActions>
                }
              >
                <div className={`w-full ${index < exercises.length - 1 ? "mb-3" : "mb-3"}`}>
                  <ExerciseCard {...exercise} />
                </div>
              </SwipeableListItem>
            ))}
          </SwipeableList>
          <ExerciseComposer
            isOpen={isComposerOpen}
            isSubmitting={isPending}
            onOpen={() => {
              setErrorMessage(null);
              setIsComposerOpen(true);
              requestAnimationFrame(() => {
                formRef.current?.querySelector<HTMLInputElement>("#name")?.focus();
              });
            }}
            onCancel={handleCancel}
            onSubmit={handleSubmit}
            formRef={formRef}
          />
        </div>
      </div>
    </section>
  );
}
