"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { CSSProperties, PointerEvent, ReactNode, FormEvent } from "react";

type LoggedSet = {
  id: number;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  loggedAtMs: number;
};

type PreviousSet = {
  setNumber: number;
  reps: number | null;
  weight: number | null;
  restSeconds: number | null;
};

type PreviousStat = {
  completedAt: Date | null;
  sets: PreviousSet[];
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

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  day: "numeric",
  year: "2-digit",
});

const formatWeight = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "Bodyweight";
  }
  const rounded = Number(value);
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
};

const formatDate = (value: Date | null) => {
  if (!value) return null;
  return dateFormatter.format(value);
};

const formatPreviousSetSummary = (set: PreviousSet) => {
  const repsDisplay = set.reps ?? "—";
  if (set.weight === null || Number.isNaN(set.weight)) {
    return `${repsDisplay}@BW`;
  }

  const rounded = Number(set.weight);
  const weightDisplay = Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
  return `${repsDisplay}@${weightDisplay}`;
};

const formatRest = (restSeconds: number | null) => {
  if (restSeconds == null || !Number.isFinite(restSeconds)) {
    return null;
  }
  const minutes = Math.floor(restSeconds / 60);
  const seconds = Math.max(0, restSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const formatDuration = (totalSeconds: number | null) => {
  if (totalSeconds == null || !Number.isFinite(totalSeconds)) {
    return "00:00";
  }
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};


function ExerciseRestTimer({ startTimestamp }: { startTimestamp: number | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startTimestamp == null) {
      return;
    }

    setNow(Date.now());
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [startTimestamp]);

  if (startTimestamp == null) {
    return null;
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - startTimestamp) / 1000));
  const display = formatDuration(elapsedSeconds);

  return (
    <div className="rounded-full border border-white/20 bg-white/[0.08] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 shadow-inner">
      Rest {display}
    </div>
  );
}

function PreviousSessionSets({
  exercise,
  fillFormFromPreviousSet,
}: {
  exercise: CarouselExercise;
  fillFormFromPreviousSet: (exercise: CarouselExercise, set: PreviousSet) => void;
}) {
  const items: ReactNode[] = [];

  exercise.previous?.sets.forEach((set, index) => {
    const isDisabled =
      set.reps == null || set.reps <= 0 || set.weight == null || Number.isNaN(set.weight);

    const setTile = (
      <button
        key={`${exercise.workoutExerciseId}-${set.setNumber}-${index}`}
        type="button"
        onClick={() => fillFormFromPreviousSet(exercise, set)}
        className="flex min-w-[52px] items-center justify-center rounded-xl border border-white/12 bg-white/[0.08] px-3 py-1 text-center text-[11px] uppercase tracking-[0.25em] text-white/70 transition hover:border-white/20 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/40"
        disabled={isDisabled}
        aria-label={`Use ${set.reps ?? "—"} reps at ${set.weight ?? "—"}`}
      >
        {formatPreviousSetSummary(set)}
      </button>
    );

    items.push(setTile);

    const nextSet = exercise.previous?.sets[index + 1];
    if (nextSet && nextSet.restSeconds != null) {
      const formattedRest = formatRest(nextSet.restSeconds);
      if (formattedRest) {
        items.push(
          <span
            key={`${exercise.workoutExerciseId}-rest-${set.setNumber}`}
            className="select-none text-[11px] uppercase tracking-[0.12em] text-white/80 italic"
          >
            -{formattedRest}-
          </span>,
        );
      }
    }
  });

  if (!items.length) {
    return null;
  }

  return <div className="flex flex-wrap items-center gap-2">{items}</div>;
}

const isInteractiveTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return Boolean(target.closest("[contenteditable], input, button, select, textarea"));
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
  const activePointerIdRef = useRef<number | null>(null);
  const pointerStartTimeRef = useRef<number | null>(null);
  const pendingDragOffsetRef = useRef<number | null>(null);
  const dragAnimationFrameRef = useRef<number | null>(null);
  const trackContainerRef = useRef<HTMLDivElement | null>(null);

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
  const [pendingExercises, setPendingExercises] = useState<Set<string>>(() => new Set());
  const [pendingRemovals, setPendingRemovals] = useState<Set<number>>(() => new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [, refreshRestTimers] = useState(0);
  const repsInputRefs = useRef(new Map<number, HTMLInputElement>());
  const weightInputRefs = useRef(new Map<number, HTMLInputElement>());
  const loggedSetCountsRef = useRef(new Map<number, number>());
  const lastSetLoggedAtRef = useRef(new Map<number, number>());
  const lastLoggedSetIdRef = useRef(new Map<number, number>());

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (activeIndex >= exercises.length) {
      setActiveIndex(exercises.length > 0 ? exercises.length - 1 : 0);
    }
  }, [activeIndex, exercises.length]);

  useEffect(() => {
    return () => {
      if (dragAnimationFrameRef.current != null) {
        cancelAnimationFrame(dragAnimationFrameRef.current);
      }
    };
  }, []);

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
        formData.append("workoutExerciseId", String(targetExercise.workoutExerciseId));

        startActiveTransition(async () => {
          try {
            await setActiveExercise(formData);
          } catch {
            setActionError("Could not save your active exercise. Refresh and try again.");
          }
        });
      }

      setActiveIndex(nextIndex);
    },
    [activeIndex, exercises, sessionId, setActiveExercise, startActiveTransition],
  );

  const flushPendingDragOffset = useCallback(() => {
    if (pendingDragOffsetRef.current == null) {
      return;
    }

    setDragOffset(pendingDragOffsetRef.current);
    dragAnimationFrameRef.current = null;
  }, []);

  const resetPointerTracking = useCallback(() => {
    if (dragAnimationFrameRef.current != null) {
      cancelAnimationFrame(dragAnimationFrameRef.current);
      dragAnimationFrameRef.current = null;
    }

    pendingDragOffsetRef.current = null;
    startXRef.current = null;
    startYRef.current = null;
    pointerStartTimeRef.current = null;
    activePointerIdRef.current = null;
    isDraggingRef.current = false;
    setIsDragging(false);
    setDragOffset(0);
  }, []);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      if (isInteractiveTarget(event.target)) {
        return;
      }

      if (dragAnimationFrameRef.current != null) {
        cancelAnimationFrame(dragAnimationFrameRef.current);
        dragAnimationFrameRef.current = null;
      }

      activePointerIdRef.current = event.pointerId;
      pointerStartTimeRef.current = performance.now();
      startXRef.current = event.clientX;
      startYRef.current = event.clientY;
      pendingDragOffsetRef.current = 0;
      isDraggingRef.current = false;
      setIsDragging(false);
      setDragOffset(0);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }

      if (startXRef.current === null || startYRef.current === null) {
        return;
      }

      const currentX = event.clientX;
      const currentY = event.clientY;
      const deltaX = currentX - startXRef.current;
      const deltaY = currentY - startYRef.current;

      if (!isDraggingRef.current) {
        if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
          isDraggingRef.current = true;
          setIsDragging(true);
        } else if (Math.abs(deltaY) > Math.abs(deltaX)) {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          resetPointerTracking();
          return;
        } else {
          return;
        }
      }

      event.preventDefault();
      pendingDragOffsetRef.current = deltaX;
      if (dragAnimationFrameRef.current == null) {
        dragAnimationFrameRef.current = window.requestAnimationFrame(flushPendingDragOffset);
      }
    },
    [flushPendingDragOffset, resetPointerTracking],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const startX = startXRef.current;
      const deltaX = startX != null ? event.clientX - startX : 0;

      const containerWidth =
        trackContainerRef.current?.clientWidth ?? event.currentTarget.clientWidth ?? 1;
      const distanceRatio = containerWidth > 0 ? Math.abs(deltaX) / containerWidth : 0;
      const elapsedMs =
        pointerStartTimeRef.current != null
          ? performance.now() - pointerStartTimeRef.current
          : Number.POSITIVE_INFINITY;
      const velocity = elapsedMs > 0 ? Math.abs(deltaX) / elapsedMs : 0;
      const distanceThresholdRatio = 0.2;
      const distanceThresholdPx = 60;
      const velocityThreshold = 0.8;

      if (dragAnimationFrameRef.current != null) {
        cancelAnimationFrame(dragAnimationFrameRef.current);
        dragAnimationFrameRef.current = null;
      }
      pendingDragOffsetRef.current = null;

      if (isDraggingRef.current) {
        event.preventDefault();
      }

      const meetsThreshold =
        distanceRatio > distanceThresholdRatio ||
        Math.abs(deltaX) > distanceThresholdPx ||
        velocity > velocityThreshold;

      const targetIndex = meetsThreshold
        ? deltaX > 0
          ? activeIndex - 1
          : activeIndex + 1
        : activeIndex;

      resetPointerTracking();
      goToIndex(targetIndex);
    },
    [activeIndex, goToIndex, resetPointerTracking],
  );

  const handlePointerCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      resetPointerTracking();
      goToIndex(activeIndex);
    },
    [activeIndex, goToIndex, resetPointerTracking],
  );

  const assignRepsInputRef = useCallback(
    (exerciseKey: number) => (node: HTMLInputElement | null) => {
      if (node) {
        repsInputRefs.current.set(exerciseKey, node);
      } else {
        repsInputRefs.current.delete(exerciseKey);
      }
    },
    [],
  );

  const assignWeightInputRef = useCallback(
    (exerciseKey: number) => (node: HTMLInputElement | null) => {
      if (node) {
        weightInputRefs.current.set(exerciseKey, node);
      } else {
        weightInputRefs.current.delete(exerciseKey);
      }
    },
    [],
  );

  const incrementReps = useCallback((exerciseKey: number) => {
    const input = repsInputRefs.current.get(exerciseKey);
    if (!input) {
      return;
    }

    const currentValue = Number(input.value);
    const nextValue = Number.isFinite(currentValue) && currentValue > 0 ? currentValue + 1 : 1;
    input.value = String(nextValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, []);

  const incrementWeight = useCallback((exerciseKey: number) => {
    const input = weightInputRefs.current.get(exerciseKey);
    if (!input) {
      return;
    }

    const currentValue = Number(input.value);
    const baseValue = Number.isFinite(currentValue) && currentValue >= 0 ? currentValue : 0;
    const nextValue = baseValue + 5;
    input.value = String(nextValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, []);

  const fillFormFromPreviousSet = useCallback((exercise: CarouselExercise, set: PreviousSet) => {
    if (set.reps == null || set.reps <= 0) {
      return;
    }

    const repsInput = repsInputRefs.current.get(exercise.workoutExerciseId);
    const weightInput = weightInputRefs.current.get(exercise.workoutExerciseId);

    if (repsInput) {
      repsInput.value = String(set.reps);
      repsInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    if (weightInput) {
      if (set.weight != null && !Number.isNaN(set.weight)) {
        weightInput.value = String(set.weight);
      } else {
        weightInput.value = "";
      }
      weightInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    requestAnimationFrame(() => {
      if (repsInput) {
        repsInput.focus();
      }
    });
  }, []);

  const handleLogSetSubmit = useCallback(
    (exerciseId: number) => async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const key = String(exerciseId);
      if (pendingExercises.has(key)) return;
      const data = new FormData(event.currentTarget);
      setActionError(null);
      setPendingExercises((prev) => new Set(prev).add(key));
      try {
        await logSet(data);
      } catch {
        setActionError("Could not save this set. Your inputs are kept; retry or refresh if the workout has ended.");
      } finally {
        setPendingExercises((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [logSet, pendingExercises],
  );

  const handleDeleteSetSubmit = useCallback(
    (setId: number) => async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (pendingRemovals.has(setId)) return;
      const data = new FormData(event.currentTarget);
      setActionError(null);
      setPendingRemovals((prev) => new Set(prev).add(setId));
      try {
        await deleteSet(data);
      } catch {
        setActionError("Could not remove this set. Retry or refresh if the workout has ended.");
      } finally {
        setPendingRemovals((prev) => {
          const next = new Set(prev);
          next.delete(setId);
          return next;
        });
      }
    },
    [deleteSet, pendingRemovals],
  );

  useEffect(() => {
    const knownExerciseIds = new Set<number>();
    let restTimestampChanged = false;

    exercises.forEach((exercise) => {
      knownExerciseIds.add(exercise.workoutExerciseId);

      const repsInput = repsInputRefs.current.get(exercise.workoutExerciseId);
      const weightInput = weightInputRefs.current.get(exercise.workoutExerciseId);
      const previousCount = loggedSetCountsRef.current.get(exercise.workoutExerciseId) ?? 0;
      const nextCount = exercise.sets.length;
      const lastSet = nextCount > 0 ? exercise.sets[nextCount - 1] : null;
      const currentLastSetId = lastSet?.id ?? null;

      const hasCountChanged = nextCount !== previousCount;
      // Seed each form once. Navigation and unrelated server refreshes must
      // never overwrite an unfinished draft (including intentionally blank fields).
      const shouldUpdateInputs = !loggedSetCountsRef.current.has(exercise.workoutExerciseId);

      if (shouldUpdateInputs) {
        if (nextCount > 0 && lastSet) {
          if (repsInput) {
            if (lastSet.reps != null && lastSet.reps > 0) {
              const nextRepsValue = String(lastSet.reps);
              if (repsInput.value !== nextRepsValue) {
                repsInput.value = nextRepsValue;
                repsInput.dispatchEvent(new Event("input", { bubbles: true }));
              }
            } else if (repsInput.value !== "") {
              repsInput.value = "";
              repsInput.dispatchEvent(new Event("input", { bubbles: true }));
            }
          }

          if (weightInput) {
            const weightValue = lastSet.weight;
            const hasWeight = weightValue != null && !Number.isNaN(weightValue);
            const nextWeightValue = hasWeight ? String(weightValue) : "";

            if (weightInput.value !== nextWeightValue) {
              weightInput.value = nextWeightValue;
              weightInput.dispatchEvent(new Event("input", { bubbles: true }));
            }
          }
        } else if (hasCountChanged && nextCount === 0) {
          if (repsInput && repsInput.value !== "") {
            repsInput.value = "";
            repsInput.dispatchEvent(new Event("input", { bubbles: true }));
          }

          if (weightInput && weightInput.value !== "") {
            weightInput.value = "";
            weightInput.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
      }

      const previousRestTimestamp =
        lastSetLoggedAtRef.current.get(exercise.workoutExerciseId) ?? null;
      const nextRestTimestamp =
        lastSet && Number.isFinite(lastSet.loggedAtMs) ? Math.floor(lastSet.loggedAtMs) : null;

      if (nextRestTimestamp != null) {
        if (previousRestTimestamp == null || previousRestTimestamp !== nextRestTimestamp) {
          lastSetLoggedAtRef.current.set(exercise.workoutExerciseId, nextRestTimestamp);
          restTimestampChanged = true;
        }
      } else if (previousRestTimestamp != null) {
        lastSetLoggedAtRef.current.delete(exercise.workoutExerciseId);
        restTimestampChanged = true;
      }

      if (currentLastSetId != null) {
        lastLoggedSetIdRef.current.set(exercise.workoutExerciseId, currentLastSetId);
      } else {
        lastLoggedSetIdRef.current.delete(exercise.workoutExerciseId);
      }

      loggedSetCountsRef.current.set(exercise.workoutExerciseId, nextCount);

    });

    for (const exerciseId of Array.from(loggedSetCountsRef.current.keys())) {
      if (!knownExerciseIds.has(exerciseId)) {
        loggedSetCountsRef.current.delete(exerciseId);
        if (lastSetLoggedAtRef.current.delete(exerciseId)) {
          restTimestampChanged = true;
        }
        lastLoggedSetIdRef.current.delete(exerciseId);

      }
    }

    if (restTimestampChanged) {
      refreshRestTimers((value) => value + 1);
    }
  }, [exercises, refreshRestTimers]);

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
      {actionError ? <p role="alert" className="text-sm text-rose-200">{actionError}</p> : null}
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-white/45">
        <span>
          Exercise {activeIndex + 1} of {exercises.length}
        </span>
      </div>
      <div
        ref={trackContainerRef}
        className="relative flex overflow-hidden touch-pan-y"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div
          className="flex w-full"
          style={trackStyle}
        >
          {exercises.map((exercise) => {
            const previousDate = formatDate(exercise.previous?.completedAt ?? null);
            const hasLoggedSets = exercise.sets.length > 0;
            const isLoggingSet = pendingExercises.has(String(exercise.workoutExerciseId));
            const lastSet = hasLoggedSets ? exercise.sets[exercise.sets.length - 1] : null;
            const storedRestStartTimestamp =
              lastSetLoggedAtRef.current.get(exercise.workoutExerciseId) ?? null;
            const restStartTimestamp =
              storedRestStartTimestamp ??
              (lastSet && Number.isFinite(lastSet.loggedAtMs)
                ? Math.floor(lastSet.loggedAtMs)
                : null);

            return (
              <article
                key={exercise.workoutExerciseId}
                className="w-full shrink-0 rounded-3xl border border-white/12 bg-white/[0.05] px-5 py-6 text-white/80 shadow-[0_18px_36px_-22px_rgba(0,0,0,0.55)] backdrop-blur"
              >
                <div className="flex h-full flex-col gap-5">
                  <header className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                        #{exercise.order}
                      </span>
                      <h2 className="text-lg font-medium text-white">{exercise.name}</h2>
                    </div>
                  </header>
                  {exercise.previous ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
                        Previous session{previousDate ? ` on ${previousDate}` : ""}
                      </p>
                      <PreviousSessionSets
                        exercise={exercise}
                        fillFormFromPreviousSet={fillFormFromPreviousSet}
                      />
                    </div>
                  ) : (
                    <p className="text-xs uppercase tracking-[0.25em] text-white/30">
                      No previous data yet.
                    </p>
                  )}
                  <section className="flex flex-1 flex-col gap-3">
                    <h3 className="text-xs uppercase tracking-[0.25em] text-white/40">
                      Logged sets
                    </h3>
                    {exercise.sets.length === 0 ? (
                      <p className="text-xs text-white/40">No sets logged yet.</p>
                    ) : (
                      <ul className="flex flex-col gap-2 text-sm text-white/80">
                        {exercise.sets.map((set) => {
                          const isRemovingSet = pendingRemovals.has(set.id);

                          return (
                            <li
                              key={set.id}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-white/12 bg-white/[0.06] px-3.5 py-2.5"
                            >
                              <div className="flex flex-col gap-1">
                                <span>
                                  {set.reps ?? "—"} reps{" "}
                                  {set.weight !== null
                                    ? `@ ${formatWeight(set.weight)}`
                                    : "(bodyweight)"}
                                </span>
                              </div>
                              <form
                                onSubmit={handleDeleteSetSubmit(set.id)}
                              >
                                <input type="hidden" name="workoutId" value={String(workoutId)} />
                                <input type="hidden" name="setId" value={String(set.id)} />
                                <input type="hidden" name="sessionId" value={String(sessionId)} />
                                <button
                                  type="submit"
                                  disabled={isRemovingSet}
                                  aria-disabled={isRemovingSet}
                                  aria-busy={isRemovingSet}
                                  className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.3em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                                    isRemovingSet
                                      ? "cursor-wait text-white/60"
                                      : "text-white/50 hover:text-white/80"
                                  }`}
                                >
                                  {isRemovingSet ? (
                                    <>
                                      <span
                                        aria-hidden="true"
                                        className="h-3 w-3 rounded-full border border-white/60 border-b-transparent border-r-transparent animate-spin"
                                      />
                                      Removing…
                                    </>
                                  ) : (
                                    "Remove"
                                  )}
                                </button>
                              </form>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                  <form
                    onSubmit={handleLogSetSubmit(exercise.workoutExerciseId)}
                    className="mt-auto flex flex-col gap-3 rounded-2xl border border-white/12 bg-white/[0.06] p-4"
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
                    <div className="flex gap-3">
                      <label className="flex min-w-0 flex-1 flex-col gap-1 text-[11px] uppercase tracking-[0.3em] text-white/40">
                        Reps
                        <div className="flex items-center gap-2">
                          <input
                            name="reps"
                            type="number"
                            min={1}
                            step={1}
                            required
                            ref={assignRepsInputRef(exercise.workoutExerciseId)}
                            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/80 shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                          />
                          <button
                            type="button"
                            onClick={() => incrementReps(exercise.workoutExerciseId)}
                            className="rounded-full border border-white/20 bg-white/[0.08] px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/30 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                            aria-label="Add one rep"
                          >
                            +1
                          </button>
                        </div>
                      </label>
                      <label className="flex min-w-0 flex-1 flex-col gap-1 text-[11px] uppercase tracking-[0.3em] text-white/40">
                        Weight
                        <div className="flex items-center gap-2">
                          <input
                            name="weight"
                            type="number"
                            step="0.5"
                            inputMode="decimal"
                            min={0}
                            required
                            ref={assignWeightInputRef(exercise.workoutExerciseId)}
                            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/80 shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                          />
                          <button
                            type="button"
                            onClick={() => incrementWeight(exercise.workoutExerciseId)}
                            className="rounded-full border border-white/20 bg-white/[0.08] px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/30 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                            aria-label="Add five pounds"
                          >
                            +5
                          </button>
                        </div>
                      </label>
                    </div>
                    <div
                      className={`flex items-center gap-3 ${
                        hasLoggedSets ? "justify-between" : "justify-end"
                      }`}
                    >
                      {hasLoggedSets ? (
                        <ExerciseRestTimer startTimestamp={restStartTimestamp} />
                      ) : null}
                      <button
                        type="submit"
                        disabled={isLoggingSet}
                        aria-disabled={isLoggingSet}
                        aria-busy={isLoggingSet}
                        className={`inline-flex items-center gap-2 rounded-full border border-emerald-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 ${
                          isLoggingSet
                            ? "cursor-wait bg-emerald-500/10 text-emerald-100"
                            : "bg-emerald-500/20 text-emerald-100 hover:border-emerald-300 hover:bg-emerald-500/30"
                        }`}
                      >
                        {isLoggingSet ? (
                          <>
                            <span
                              aria-hidden="true"
                              className="h-3.5 w-3.5 rounded-full border border-emerald-200/60 border-b-transparent border-r-transparent animate-spin"
                            />
                            Logging…
                          </>
                        ) : (
                          "Log set"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <div className="flex justify-center gap-2">
        {exercises.map((exercise, index) => {
          const loggedAtLeastThreeSets = exercise.sets.length >= 3;
          const baseColor = loggedAtLeastThreeSets ? "bg-emerald-400/70" : "bg-white/30";
          const activeColor = loggedAtLeastThreeSets ? "bg-emerald-400" : "bg-white";

          return (
            <button
              key={exercise.workoutExerciseId}
              type="button"
              onClick={() => goToIndex(index)}
              className={`h-2 w-2 rounded-full ${index === activeIndex ? activeColor : baseColor}`}
              aria-label={`Go to exercise ${index + 1}`}
              aria-pressed={index === activeIndex}
              aria-current={index === activeIndex ? "true" : undefined}
              disabled={isUpdatingActive}
            />
          );
        })}
      </div>
    </div>
  );
}
