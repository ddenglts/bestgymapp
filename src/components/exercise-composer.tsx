'use client';

import type { FormEvent, MutableRefObject } from "react";

type ExerciseComposerProps = {
  isOpen: boolean;
  isSubmitting?: boolean;
  onOpen: () => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  formRef: MutableRefObject<HTMLFormElement | null>;
};

export function ExerciseComposer({
  isOpen,
  isSubmitting = false,
  onOpen,
  onCancel,
  onSubmit,
  formRef,
}: ExerciseComposerProps) {
  return (
    <div>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[0fr] opacity-0 pointer-events-none" : "grid-rows-[1fr] opacity-100"
        }`}
      >
        <div className="overflow-hidden">
          <button
            type="button"
            onClick={onOpen}
            className="group flex w-full items-center justify-between rounded-3xl border border-dashed border-white/18 bg-white/[0.05] px-5 py-4 text-left transition hover:border-white/30 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold text-white">New exercise</span>
              <span className="text-sm text-white/60">
                Log a fresh movement for your sessions.
              </span>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/10 text-2xl font-medium text-white transition group-hover:border-white/20 group-hover:bg-white/18">
              +
            </span>
          </button>
        </div>
      </div>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
        }`}
      >
        <div className="overflow-hidden">
          <form
            ref={formRef}
            onSubmit={onSubmit}
            className="grid gap-4 rounded-3xl border border-dashed border-white/18 bg-white/[0.05] p-5 shadow-[0_18px_36px_-22px_rgba(0,0,0,0.55)] backdrop-blur"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-base font-semibold text-white">New exercise</span>
                <span className="text-sm text-white/60">
                  Define the movement so you can track it later.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-xl border border-white/12 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.08] px-4 py-2 text-sm font-semibold tracking-tight text-white transition hover:border-white/20 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/12 bg-white/10 text-base">
                    +
                  </span>
                  {isSubmitting ? "Saving…" : "Add exercise"}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="name"
                className="text-xs uppercase tracking-[0.2em] text-white/60"
              >
                Exercise name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g. Side Plank"
                className="rounded-xl border border-white/12 bg-white/[0.07] px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
                required
                disabled={isSubmitting}
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
