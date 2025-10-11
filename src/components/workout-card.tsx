'use client';

import type { ReactNode } from "react";

type WorkoutCardProps = {
  title: string;
  meta?: string;
  exercises: ReactNode;
  footer?: ReactNode;
};

export function WorkoutCard({ title, meta, exercises, footer }: WorkoutCardProps) {
  return (
    <article className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.55)] backdrop-blur">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-white">
          {title}
        </h2>
        {meta ? (
          <span className="text-xs uppercase tracking-[0.2em] text-white/50">
            {meta}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        {exercises}
        {footer ? <div className="pt-1">{footer}</div> : null}
      </div>
    </article>
  );
}
