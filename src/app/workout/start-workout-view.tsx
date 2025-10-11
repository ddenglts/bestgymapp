"use client";

import { useMemo } from "react";
import Link from "next/link";

export type StartWorkoutItem = {
  id: number;
  name: string;
  createdAt: Date;
  lastCompletedAt: Date | null;
  sessionsCount: number;
};

type StartWorkoutViewProps = {
  workouts: StartWorkoutItem[];
};

const formatDate = (date: Date | null) => {
  if (!date) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export function StartWorkoutView({ workouts }: StartWorkoutViewProps) {
  const sortedWorkouts = useMemo(() => {
    const items = [...workouts];
    items.sort((a, b) => {
      const aTime = a.lastCompletedAt ? a.lastCompletedAt.getTime() : 0;
      const bTime = b.lastCompletedAt ? b.lastCompletedAt.getTime() : 0;
      if (aTime === bTime) {
        return a.name.localeCompare(b.name);
      }
      return aTime - bTime;
    });
    return items;
  }, [workouts]);

  return (
    <section className="flex w-full flex-1 flex-col items-center px-4 py-5">
      <div className="flex w-full flex-col gap-3.5">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Start a workout
          </h1>
          <p className="text-sm text-white/60">
            Pick a template below and jump right in.
          </p>
        </header>
        <div className="flex flex-col gap-3.5">
          {sortedWorkouts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.05] px-4 py-6 text-center text-sm text-white/60">
              Create a workout to get started.
            </div>
          ) : (
            sortedWorkouts.map((workout) => (
              <div
                key={workout.id}
                className="w-full rounded-3xl border border-white/12 bg-white/[0.05] px-4 py-4 text-sm text-white/80 shadow-[0_18px_36px_-22px_rgba(0,0,0,0.55)] backdrop-blur"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-base font-semibold text-white">{workout.name}</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-white/40">
                      Last used: {formatDate(workout.lastCompletedAt)}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-white/30">
                      {workout.sessionsCount} runs
                    </span>
                  </div>
                  <Link
                    href={`/workout/start/${workout.id}`}
                    className="group flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/20 text-xl font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                  >
                    &gt;
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
