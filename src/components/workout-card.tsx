'use client';

import { useState, type ReactNode } from "react";

type WorkoutCardExercise = {
  id: number;
  name: string;
  onDelete: () => void;
  isDeleting?: boolean;
  isAwaitingDeleteConfirm?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isMoving?: boolean;
};

type WorkoutCardProps = {
  title: string;
  meta?: string;
  exercises: WorkoutCardExercise[];
  footer?: ReactNode;
};

export function WorkoutCard({ title, meta, exercises, footer }: WorkoutCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <article className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight text-white">
          {title}
        </h2>
        <button type="button" aria-expanded={isEditing} onClick={() => setIsEditing((value) => !value)} className="min-h-11 px-2 text-sm text-white/55 hover:text-white">{isEditing ? "Done" : "Edit"}</button>
      </div>
      {meta ? <p className="mb-3 text-xs text-white/35">{meta}</p> : null}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2.5">
          {exercises.length > 0 ? (
            exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="flex min-h-11 w-full flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] py-2"
              >
                <span className="min-w-24 flex-1 text-sm text-white/80">
                  {exercise.name}
                </span>
                {isEditing ? <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={exercise.onDelete}
                    disabled={exercise.isDeleting || exercise.isMoving}
                    className="rounded-xl border border-white/10 min-h-11 min-w-11 px-2 py-1 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {exercise.isDeleting
                      ? "Deleting…"
                      : exercise.isAwaitingDeleteConfirm
                        ? "Confirm"
                        : "Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={exercise.onMoveUp}
                    disabled={
                      !exercise.canMoveUp || exercise.isDeleting || exercise.isMoving
                    }
                    aria-label={`Move ${exercise.name} up`}
                    className="rounded-xl border border-white/10 min-h-11 min-w-11 px-2 py-1 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={exercise.onMoveDown}
                    disabled={
                      !exercise.canMoveDown || exercise.isDeleting || exercise.isMoving
                    }
                    aria-label={`Move ${exercise.name} down`}
                    className="rounded-xl border border-white/10 min-h-11 min-w-11 px-2 py-1 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ↓
                  </button>
                </div> : null}
              </div>
            ))
          ) : (
            <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-medium text-white/60">
              No exercises yet
            </div>
          )}
        </div>
        {footer && (isEditing || exercises.length === 0) ? <div className="pt-1.5">{footer}</div> : null}
      </div>
    </article>
  );
}
