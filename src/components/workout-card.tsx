'use client';

import { useState } from "react";

type Exercise = {
  name: string;
  detail: string;
};

type WorkoutCardProps = {
  title: string;
  meta?: string;
  exercises: Exercise[];
};

export function WorkoutCard({ title, meta, exercises }: WorkoutCardProps) {
  const [expanded, setExpanded] = useState<number[]>([]);

  const toggleExercise = (index: number) => {
    setExpanded((prev) =>
      prev.includes(index)
        ? prev.filter((value) => value !== index)
        : [...prev, index],
    );
  };

  return (
    <article className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_50px_-15px_rgba(0,0,0,0.55)] backdrop-blur">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-white">
          {title}
        </h2>
        {meta ? (
          <span className="text-xs uppercase tracking-[0.2em] text-white/50">
            {meta}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-4">
        {exercises.map((exercise, index) => {
          const isOpen = expanded.includes(index);

          return (
            <div
              key={exercise.name}
              className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3"
            >
              <button
                type="button"
                onClick={() => toggleExercise(index)}
                className="flex w-full items-center justify-between gap-4 text-left font-medium text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                aria-expanded={isOpen}
              >
                <span>{exercise.name}</span>
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="mt-2 text-sm text-white/70">{exercise.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
