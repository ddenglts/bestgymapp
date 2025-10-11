"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { CSSProperties, TouchEvent } from "react";

type LoggedSet = {
  id: number;
  setNumber: number;
  reps: number | null;
  weight: number | null;
};

type PreviousStat = {
  reps: number | null;
  weight: number | null;
  completedAt: Date | null;
};

type CarouselExercise = {
  workoutExerciseId: number;
  exerciseId: number;
  name: string;
  order: number;
  sets: LoggedSet[];
  previous: PreviousStat | null;
};

type FormAction = (formData: FormData) => void | Promise<void>;

type WorkoutExerciseCarouselProps = {
  exercises: CarouselExercise[];
  sessionId: number;
  workoutId: number;
  initialExerciseId: number | null;
  logSetAction: FormAction;
  deleteSetAction: FormAction;
  setActiveExerciseAction: FormAction;
};

const formatWeight = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "Bodyweight";
  }
  const rounded = Number.parseFloat(value.toString());
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
};

const formatDate = (value: Date | null) => {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  }).format(value);
};

const isInteractiveTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return Boolean(target.closest("input, button, select, textarea"));
};

export function WorkoutExerciseCarousel({
  exercises,
  sessionId,
  workoutId,
  initialExerciseId,
  logSetAction,
  deleteSetAction,
  setActiveExerciseAction,
}: WorkoutExerciseCarouselProps) {
  const logSet = useMemo(() => logSetAction as (formData: FormData) => Promise<void>, [logSetAction]);
  const deleteSet = useMemo(
    () => deleteSetAction as (formData: FormData) => Promise<void>,
    [deleteSetAction],
  );
  const setActiveExercise = useMemo(
    () => setActiveExerciseAction as (formData: FormData) => Promise<void>,
    [setActiveExerciseAction],
  );
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  const initialIndex = useMemo(() => {
    if (!exercises.length) return 0;
    if (initialExerciseId == null) return 0;
    const idx = exercises.findIndex(
      (exercise) => exercise.exerciseId === initialExerciseId,
    );
    return idx >= 0 ? idx : 0;
  }, [exercises, initialExerciseId]);

  const [activeIndex, setActiveIndex] = useState(() => initialIndex);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isUpdatingActive, startActiveTransition] = useTransition();

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (activeIndex >= exercises.length) {
      setActiveIndex(exercises.length > 0 ? exercises.length - 1 : 0);
    }
  }, [activeIndex, exercises.length]);

  const goToIndex = useCallback(
    (index: number) => {
      if (exercises.length === 0) {
        return;
      }

      const nextIndex = Math.min(Math.max(index, 0), exercises.length - 1);
      setIsDragging(false);
      setDragOffset(0);

      if (nextIndex === activeIndex) {
        return;
      }

      const targetExercise = exercises[nextIndex];

      if (targetExercise) {
        const formData = new FormData();
        formData.append("sessionId", String(sessionId));
        formData.append("exerciseId", String(targetExercise.exerciseId));

        startActiveTransition(() => {
          void setActiveExercise(formData);
        });
      }

      setActiveIndex(nextIndex);
    },
    [activeIndex, exercises, sessionId, setActiveExercise, startActiveTransition],
  );

  const handlePrevious = () => {
    goToIndex(activeIndex - 1);
  };

  const handleNext = () => {
    goToIndex(activeIndex + 1);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1 || isInteractiveTarget(event.target)) {
      startXRef.current = null;
      startYRef.current = null;
      return;
    }

    startXRef.current = event.touches[0].clientX;
    startYRef.current = event.touches[0].clientY;
    isDraggingRef.current = false;
    setIsDragging(false);
    setDragOffset(0);
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (startXRef.current === null || startYRef.current === null) {
      return;
    }

    const currentX = event.touches[0].clientX;
    const currentY = event.touches[0].clientY;
    const deltaX = currentX - startXRef.current;
    const deltaY = currentY - startYRef.current;

    if (!isDraggingRef.current) {
      if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
        isDraggingRef.current = true;
        setIsDragging(true);
      } else if (Math.abs(deltaY) > Math.abs(deltaX)) {
        startXRef.current = null;
        startYRef.current = null;
        return;
      } else {
        return;
      }
    }

    event.preventDefault();
    setDragOffset(deltaX);
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (startXRef.current === null) {
      return;
    }

    const endX = event.changedTouches[0]?.clientX ?? startXRef.current;
    const deltaX = endX - startXRef.current;

    if (isDraggingRef.current) {
      event.preventDefault();
    }

    const threshold = 60;
    if (deltaX > threshold) {
      goToIndex(activeIndex - 1);
    } else if (deltaX < -threshold) {
      goToIndex(activeIndex + 1);
    } else {
      goToIndex(activeIndex);
    }

    setDragOffset(0);
    setIsDragging(false);
    startXRef.current = null;
    startYRef.current = null;
    isDraggingRef.current = false;
  };

  const handleTouchCancel = () => {
    setDragOffset(0);
    setIsDragging(false);
    startXRef.current = null;
    startYRef.current = null;
    isDraggingRef.current = false;
  };

  const trackStyle = useMemo<CSSProperties>(() => {
    const translate = `calc(-${activeIndex * 100}% + ${dragOffset}px)`;
    return {
      transform: `translateX(${translate})`,
      transition: isDragging ? "none" : "transform 0.3s ease",
    };
  }, [activeIndex, dragOffset, isDragging]);

  if (exercises.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.05] px-4 py-6 text-center text-sm text-white/60">
        No exercises assigned to this workout yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-white/45">
        <span>
          Exercise {activeIndex + 1} of {exercises.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevious}
            className="rounded-full border border-white/20 px-2 py-1 text-white/70 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            disabled={activeIndex === 0 || isUpdatingActive}
          >
            Prev
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-full border border-white/20 px-2 py-1 text-white/70 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            disabled={activeIndex === exercises.length - 1 || isUpdatingActive}
          >
            Next
          </button>
        </div>
      </div>
      <div
        className="relative flex overflow-hidden touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        <div
          className="flex w-full"
          style={trackStyle}
        >
          {exercises.map((exercise) => {
            const previousDate = formatDate(exercise.previous?.completedAt ?? null);

            return (
              <article
                key={exercise.workoutExerciseId}
                className="w-full shrink-0 rounded-3xl border border-white/12 bg-white/[0.05] px-5 py-6 text-white/80 shadow-[0_18px_36px_-22px_rgba(0,0,0,0.55)] backdrop-blur"
              >
                <div className="flex flex-col gap-5">
                  <header className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                        #{exercise.order}
                      </span>
                      <h2 className="text-lg font-medium text-white">{exercise.name}</h2>
                    </div>
                  </header>
                  {exercise.previous ? (
                    <p className="text-xs uppercase tracking-[0.25em] text-white/50">
                      Previous:{" "}
                      {exercise.previous.reps ?? "—"} reps{" "}
                      {exercise.previous.weight !== null
                        ? `@ ${formatWeight(exercise.previous.weight)}`
                        : "(bodyweight)"}{" "}
                      {previousDate ? `on ${previousDate}` : ""}
                    </p>
                  ) : (
                    <p className="text-xs uppercase tracking-[0.25em] text-white/30">
                      No previous data yet.
                    </p>
                  )}
                  <section className="flex flex-col gap-3">
                    <h3 className="text-xs uppercase tracking-[0.25em] text-white/40">
                      Logged sets
                    </h3>
                    {exercise.sets.length === 0 ? (
                      <p className="text-xs text-white/40">No sets logged yet.</p>
                    ) : (
                      <ul className="flex flex-col gap-2 text-sm text-white/80">
                        {exercise.sets.map((set) => (
                          <li
                            key={set.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-white/12 bg-white/[0.06] px-3.5 py-2.5"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                                Set {set.setNumber}
                              </span>
                              <span>
                                {set.reps ?? "—"} reps{" "}
                                {set.weight !== null
                                  ? `@ ${formatWeight(set.weight)}`
                                  : "(bodyweight)"}
                              </span>
                            </div>
                            <form action={deleteSet}>
                              <input type="hidden" name="workoutId" value={String(workoutId)} />
                              <input type="hidden" name="setId" value={String(set.id)} />
                              <button
                                type="submit"
                                className="text-[11px] uppercase tracking-[0.3em] text-white/50 transition hover:text-white/80"
                              >
                                Remove
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <form
                    action={logSet}
                    className="flex flex-col gap-3 rounded-2xl border border-white/12 bg-white/[0.06] p-4"
                  >
                    <input type="hidden" name="workoutId" value={String(workoutId)} />
                    <input type="hidden" name="sessionId" value={String(sessionId)} />
                    <input
                      type="hidden"
                      name="workoutExerciseId"
                      value={String(exercise.workoutExerciseId)}
                    />
                    <input
                      type="hidden"
                      name="exerciseId"
                      value={String(exercise.exerciseId)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1 text-[11px] uppercase tracking-[0.3em] text-white/40">
                        Reps
                        <input
                          name="reps"
                          type="number"
                          min={1}
                          step={1}
                          required
                          className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/80 shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[11px] uppercase tracking-[0.3em] text-white/40">
                        Weight
                        <input
                          name="weight"
                          type="number"
                          step="0.5"
                          inputMode="decimal"
                          placeholder="Optional"
                          className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/80 shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                        />
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="self-end rounded-full border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                    >
                      Log set
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <div className="flex justify-center gap-2">
        {exercises.map((exercise, index) => (
          <button
            key={exercise.workoutExerciseId}
            type="button"
            onClick={() => goToIndex(index)}
            className={`h-2 w-2 rounded-full ${
              index === activeIndex ? "bg-white" : "bg-white/30"
            }`}
            aria-label={`Go to exercise ${index + 1}`}
            aria-pressed={index === activeIndex}
            disabled={isUpdatingActive}
          />
        ))}
      </div>
    </div>
  );
}
