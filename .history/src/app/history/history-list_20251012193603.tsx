"use client";

import { useState } from "react";

type HistorySet = {
  id: number;
  setNumber: number;
  reps: number | null;
  weight: number | null;
};

type HistoryExercise = {
  name: string;
  sets: HistorySet[];
};

type HistoryItem = {
  id: number;
  workoutName: string;
  completedAtISO: string | null;
  durationMinutes: number | null;
  exercises: HistoryExercise[];
};

type HistoryListProps = {
  items: HistoryItem[];
};

// Add these helpers
const formatDate = (iso: string | null) => {
  if (!iso) return "Unknown";
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  }).format(date);
};

const formatTime = (iso: string | null) => {
  if (!iso) return "—";
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
  }).format(date);
};

const formatDuration = (mins: number | null) =>
  mins && Number.isFinite(mins) ? `${mins} MIN` : "—";


const formatSet = (set: HistorySet) => {
  const repsText = set.reps ?? "—";
  if (set.weight === null) return `${repsText}`;

  const weightNumber = Number(set.weight);
  if (!Number.isFinite(weightNumber)) return `${repsText}`;

  const weightText = Number.isInteger(weightNumber)
    ? `${weightNumber}`
    : weightNumber.toFixed(1);

  return `${repsText}@${weightText}`;
};

export function HistoryList({ items }: HistoryListProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.04] px-4 py-6 text-center text-sm text-white/60">
        Workout history will appear here once you log a session.
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-3.5">
      {items.map((item) => {
        const isOpen = Boolean(expanded[item.id]);
        const completedAt = formatDateTime(item.completedAtISO);
        const durationText =
          item.durationMinutes && Number.isFinite(item.durationMinutes)
            ? `${item.durationMinutes} min`
            : "—";

        return (
          <li key={item.id}>
            <div className="rounded-3xl border border-white/12 bg-white/[0.05] text-white shadow-[0_18px_36px_-22px_rgba(0,0,0,0.55)] backdrop-blur transition hover:border-white/20 hover:bg-white/[0.08]">
              // Add these helpers
const formatDate = (iso: string | null) => {
  if (!iso) return "Unknown";
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  }).format(date);
};

const formatTime = (iso: string | null) => {
  if (!iso) return "—";
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
  }).format(date);
};

const formatDuration = (mins: number | null) =>
  mins && Number.isFinite(mins) ? `${mins} MIN` : "—";

              {isOpen ? (
                <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4">
                  {item.exercises.length === 0 ? (
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">
                      No sets logged for this session.
                    </p>
                  ) : (
                    item.exercises.map((exercise, exerciseIndex) => (
                      <article
                        key={`${exercise.name}-${exerciseIndex}`}
                        className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5"
                      >
                        {/* Exercise name: wraps inside its column */}
                        <span className="min-w-0 text-sm font-medium tracking-tight text-white/90 break-words">
                          {exercise.name}
                        </span>

                        {/* Sets: stay right-aligned, wrap within their own row if needed */}
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {exercise.sets.map((set) => (
                            <span
                              key={set.id}
                              className="rounded-lg border border-white/15 bg-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-white/80 shadow-[0_10px_20px_-16px_rgba(0,0,0,0.6)]"
                            >
                              {formatSet(set)}
                            </span>
                          ))}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
