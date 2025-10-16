"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { startWorkout } from "./actions";
import { CURRENT_WORKOUT_TOAST_KEY } from "./toast-constants";

type StartWorkoutButtonProps = {
  workoutId: number;
};

export function StartWorkoutButton({ workoutId }: StartWorkoutButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleStartWorkout = useCallback(() => {
    if (!Number.isFinite(workoutId) || workoutId <= 0) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("workoutId", String(workoutId));

      const result = await startWorkout(formData);

      if (result.status === "redirect") {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(CURRENT_WORKOUT_TOAST_KEY, result.message);
        }

        if (pathname === result.redirectTo) {
          router.refresh();
        } else {
          router.push(result.redirectTo);
        }
        return;
      }

      router.refresh();
    });
  }, [pathname, router, workoutId]);

  return (
    <button
      type="button"
      onClick={handleStartWorkout}
      disabled={isPending}
      aria-busy={isPending}
      className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? "Starting…" : "Start workout"}
    </button>
  );
}
