import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { WorkoutExerciseCarousel } from "../src/app/workout/start/[id]/exercise-carousel";

test("drafts survive navigation, refresh, a failed save, and a successful save", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost", pretendToBeVisual: true });
  Object.assign(globalThis, {
    window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
    Event: dom.window.Event, FormData: dom.window.FormData,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const exercises = [
    { workoutExerciseId: 1, exerciseId: 1, name: "Squat", order: 1, sets: [{ id: 1, setNumber: 1, reps: 8, weight: 100, loggedAtMs: Date.now() }], previous: null },
    { workoutExerciseId: 2, exerciseId: 2, name: "Lunge", order: 2, sets: [], previous: null },
  ];
  let shouldFail = true;
  let submitted: FormData | undefined;
  const props = {
    exercises, sessionId: 1, workoutId: 1, initialExerciseId: 1,
    logSetAction: async (data: FormData) => { submitted = data; if (shouldFail) throw new Error("offline"); },
    deleteSetAction: async () => {}, setActiveExerciseAction: async () => {},
  };
  const root = createRoot(document.getElementById("root")!);
  try {
    await act(async () => root.render(<WorkoutExerciseCarousel {...props} />));
    const reps = document.querySelector<HTMLInputElement>('input[name="reps"]')!;
    const weight = document.querySelector<HTMLInputElement>('input[name="weight"]')!;
    reps.value = "10"; weight.value = "110";
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Go to exercise 2"]')!.click());
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Go to exercise 1"]')!.click());
    await act(async () => root.render(<WorkoutExerciseCarousel {...props} exercises={[...exercises]} />));
    assert.equal(reps.value, "10"); assert.equal(weight.value, "110");
    const form = reps.closest("form")!;
    await act(async () => { form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })); });
    assert.equal(submitted?.get("reps"), "10");
    assert.match(document.querySelector('[role="alert"]')!.textContent!, /Could not save/);
    assert.equal(form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled, false);
    assert.equal(weight.value, "110");
    shouldFail = false;
    await act(async () => { form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })); });
    assert.equal(document.querySelector('[role="alert"]'), null);
    assert.equal(reps.value, "10"); assert.equal(weight.value, "110");
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
