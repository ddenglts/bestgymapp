'use client';

import type { ReactNode } from "react";

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
  return (
    <article className="w-full rounded-3xl border border-white/12 bg-white/[0.05] p-4 shadow-[0_18px_36px_-22px_rgba(0,0,0,0.55)] backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight text-white">
          {title}
        </h2>
        {meta ? (
          <span className="text-xs uppercase tracking-[0.18em] text-white/45">
            {meta}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2.5">
          {exercises.length > 0 ? (
            exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2"
              >
                <span className="flex-1 truncate text-sm font-medium text-white/80">
                  {exercise.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={exercise.onDelete}
                    disabled={exercise.isDeleting || exercise.isMoving}
                    className="rounded-xl border border-white/10 px-2 py-1 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
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
                    aria-label="Move exercise up"
                    className="rounded-xl border border-white/10 px-2 py-1 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    U
                  </button>
                  <button
                    type="button"
                    onClick={exercise.onMoveDown}
                    disabled={
                      !exercise.canMoveDown || exercise.isDeleting || exercise.isMoving
                    }
                    aria-label="Move exercise down"
                    className="rounded-xl border border-white/10 px-2 py-1 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    D
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-medium text-white/60">
              No exercises yet
            </div>
          )}
        </div>
        {footer ? <div className="pt-1.5">{footer}</div> : null}
      </div>
    </article>
  );
}
