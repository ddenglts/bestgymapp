import assert from "node:assert/strict";
import { before, beforeEach, after, test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PgDialect } from "drizzle-orm/pg-core";
import { createWorkoutSessionStore, type RunWorkoutMutation } from "../src/lib/workout-session-store";

const pg = new PGlite();
const dialect = new PgDialect();
const run: RunWorkoutMutation = async <T extends Record<string, unknown>>(statement: Parameters<RunWorkoutMutation>[0]) => {
  const query = dialect.sqlToQuery(statement);
  return pg.transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(724319, 1)");
    return (await tx.query<T>(query.sql, query.params)).rows;
  });
};
const store = createWorkoutSessionStore(run);
const input = { workoutId: 1, sessionId: 1, workoutExerciseId: 1, exerciseId: 1, reps: 8, weight: 100 };

before(async () => {
  for (const file of readdirSync("drizzle").filter((file) => file.endsWith(".sql")).sort()) {
    await pg.exec(readFileSync(`drizzle/${file}`, "utf8"));
  }
});
beforeEach(async () => {
  await pg.exec(`TRUNCATE current_workout, exercise_sets, workout_sessions, workout_exercises, workouts, exercises RESTART IDENTITY CASCADE;
    INSERT INTO exercises(name) VALUES ('Squat'), ('Lunge');
    INSERT INTO workouts(name) VALUES ('Legs'), ('Other');
    INSERT INTO workout_exercises(workout_id, exercise_id, "order") VALUES (1, 1, 1), (2, 2, 1);`);
});
after(() => pg.close());

test("two simultaneous starts produce one session and resume the winner", async () => {
  const results = await Promise.all([store.start(1), store.start(2)]);
  assert.equal(results.filter((row) => row.started).length, 1);
  assert.equal(results[0].workoutId, results[1].workoutId);
  assert.equal((await pg.query("SELECT * FROM current_workout")).rows.length, 1);
  assert.equal((await pg.query("SELECT * FROM workout_sessions")).rows.length, 1);
});

test("singleton constraint rejects a second active row even outside the app", async () => {
  await store.start(1);
  await pg.exec("INSERT INTO workout_sessions(workout_id) VALUES (2)");
  await assert.rejects(pg.exec("INSERT INTO current_workout(session_id) VALUES (2)"), /cw_singleton_unique/);
});

test("remove/re-add retains old sets and continues numbering by exercise", async () => {
  await store.start(1);
  await store.logSet(input);
  await pg.exec('DELETE FROM workout_exercises WHERE id = 1; INSERT INTO workout_exercises(workout_id, exercise_id, "order") VALUES (1, 1, 1)');
  await store.logSet({ ...input, workoutExerciseId: 3 });
  const sets = (await pg.query("SELECT set_number, workout_exercise_id FROM exercise_sets WHERE session_id = 1 AND exercise_id = 1 ORDER BY set_number")).rows;
  assert.deepEqual(sets, [{ set_number: 1, workout_exercise_id: null }, { set_number: 2, workout_exercise_id: 3 }]);
});

test("active workout cannot be deleted; completed history survives deletion", async () => {
  await store.start(1);
  await store.logSet(input);
  await assert.rejects(store.deleteWorkout(1), /End the active workout/);
  assert.equal((await pg.query("SELECT * FROM workouts WHERE id = 1")).rows.length, 1);
  await store.end(1);
  await store.deleteWorkout(1);
  assert.equal((await pg.query("SELECT * FROM workout_sessions WHERE completed_at IS NOT NULL")).rows.length, 1);
  assert.equal((await pg.query("SELECT * FROM exercise_sets")).rows.length, 1);
});

test("closed sessions reject stale log, delete, navigation, and end requests", async () => {
  await store.start(1);
  await store.logSet(input);
  await store.end(1);
  const completed = (await pg.query("SELECT completed_at FROM workout_sessions WHERE id = 1")).rows;
  await assert.rejects(store.logSet(input), /changed or ended/);
  await assert.rejects(store.deleteSet(1, 1, 1), /no longer editable/);
  await assert.rejects(store.setActiveExercise(1, 1), /changed or ended/);
  await assert.rejects(store.end(1), /no longer active/);
  assert.deepEqual((await pg.query("SELECT completed_at FROM workout_sessions WHERE id = 1")).rows, completed);
  assert.equal((await pg.query("SELECT * FROM exercise_sets")).rows.length, 1);
});

test("set context must match the active workout and exercise", async () => {
  await store.start(1);
  await assert.rejects(store.logSet({ ...input, workoutExerciseId: 2, exerciseId: 2 }), /changed or ended/);
  await assert.rejects(store.logSet({ ...input, workoutId: 2 }), /changed or ended/);
  await assert.rejects(store.setActiveExercise(1, 2), /changed or ended/);
  await store.logSet(input);
  await assert.rejects(store.deleteSet(2, 1, 1), /no longer editable/);
  await store.deleteSet(1, 1, 1);
});

test("concurrent logs allocate distinct numbers and end cannot be followed by a write", async () => {
  await store.start(1);
  await Promise.all([store.logSet(input), store.logSet(input)]);
  assert.deepEqual((await pg.query("SELECT set_number FROM exercise_sets ORDER BY set_number")).rows, [{ set_number: 1 }, { set_number: 2 }]);
  const results = await Promise.allSettled([store.end(1), store.logSet(input)]);
  assert.equal(results[0].status, "fulfilled");
  assert.equal(results[1].status, "rejected");
});
