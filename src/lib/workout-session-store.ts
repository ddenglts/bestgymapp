import { sql, type SQL } from "drizzle-orm";

export type RunWorkoutMutation = <T extends Record<string, unknown>>(query: SQL) => Promise<T[]>;

// Every operation runs after the same transaction-scoped lock. In particular,
// checking session state and writing a set must not race with ending a workout.
export function createWorkoutSessionStore(run: RunWorkoutMutation) {
  return {
    async start(workoutId: number) {
      const [result] = await run<{ workoutId: number; started: boolean }>(sql`
        WITH existing AS (
          SELECT ws.workout_id AS "workoutId", false AS started
          FROM current_workout cw JOIN workout_sessions ws ON ws.id = cw.session_id
          WHERE ws.completed_at IS NULL AND ws.workout_id IS NOT NULL
        ), new_session AS (
          INSERT INTO workout_sessions (workout_id)
          SELECT id FROM workouts WHERE id = ${workoutId}
            AND NOT EXISTS (SELECT 1 FROM current_workout)
          RETURNING id, workout_id
        ), active AS (
          INSERT INTO current_workout (session_id, active_exercise_id)
          SELECT id, (
            SELECT exercise_id FROM workout_exercises
            WHERE workout_id = ${workoutId} ORDER BY "order" LIMIT 1
          ) FROM new_session
          RETURNING session_id
        )
        SELECT "workoutId", started FROM existing
        UNION ALL
        SELECT ns.workout_id AS "workoutId", true AS started
        FROM new_session ns JOIN active ON active.session_id = ns.id
      `);
      if (!result) throw new Error("Unable to start workout. Refresh and try again.");
      return result;
    },

    async end(sessionId: number) {
      const [result] = await run<{ workoutId: number | null }>(sql`
        WITH finished AS (
          UPDATE workout_sessions SET completed_at = GREATEST(clock_timestamp(), started_at)
          WHERE id = ${sessionId} AND completed_at IS NULL
            AND EXISTS (SELECT 1 FROM current_workout WHERE session_id = ${sessionId})
          RETURNING id, workout_id
        ), cleared AS (
          DELETE FROM current_workout WHERE session_id IN (SELECT id FROM finished)
          RETURNING session_id
        )
        SELECT workout_id AS "workoutId" FROM finished
        JOIN cleared ON cleared.session_id = finished.id
      `);
      if (!result) throw new Error("This session is no longer active. Refresh the page.");
      return result.workoutId;
    },

    async logSet(input: {
      workoutId: number; sessionId: number; workoutExerciseId: number;
      exerciseId: number; reps: number; weight: number;
    }) {
      const [result] = await run(sql`
        INSERT INTO exercise_sets (session_id, workout_exercise_id, exercise_id, set_number, reps, weight)
        SELECT ws.id, we.id, we.exercise_id,
          COALESCE((SELECT MAX(set_number) FROM exercise_sets
            WHERE session_id = ws.id AND exercise_id = we.exercise_id), 0) + 1,
          ${input.reps}, ${input.weight}
        FROM current_workout cw
        JOIN workout_sessions ws ON ws.id = cw.session_id
        JOIN workout_exercises we ON we.workout_id = ws.workout_id
        WHERE ws.id = ${input.sessionId} AND ws.workout_id = ${input.workoutId}
          AND ws.completed_at IS NULL AND we.id = ${input.workoutExerciseId}
          AND we.exercise_id = ${input.exerciseId}
        RETURNING id
      `);
      if (!result) throw new Error("This workout has changed or ended. Refresh the page.");
    },

    async deleteSet(workoutId: number, sessionId: number, setId: number) {
      const [result] = await run(sql`
        DELETE FROM exercise_sets es USING current_workout cw, workout_sessions ws
        WHERE es.id = ${setId} AND es.session_id = ${sessionId}
          AND cw.session_id = ws.id AND ws.id = es.session_id
          AND ws.workout_id = ${workoutId} AND ws.completed_at IS NULL
        RETURNING es.id
      `);
      if (!result) throw new Error("This set is no longer editable. Refresh the page.");
    },

    async setActiveExercise(sessionId: number, exerciseId: number) {
      const [result] = await run(sql`
        UPDATE current_workout cw SET active_exercise_id = ${exerciseId}, last_updated_at = now()
        FROM workout_sessions ws
        WHERE cw.session_id = ${sessionId} AND ws.id = cw.session_id
          AND ws.completed_at IS NULL
          AND EXISTS (SELECT 1 FROM workout_exercises
            WHERE workout_id = ws.workout_id AND exercise_id = ${exerciseId})
        RETURNING cw.id
      `);
      if (!result) throw new Error("This workout has changed or ended. Refresh the page.");
    },

    async deleteWorkout(workoutId: number) {
      const [result] = await run(sql`
        DELETE FROM workouts WHERE id = ${workoutId}
          AND NOT EXISTS (
            SELECT 1 FROM current_workout cw JOIN workout_sessions ws ON ws.id = cw.session_id
            WHERE ws.workout_id = ${workoutId}
          )
        RETURNING id
      `);
      if (!result) throw new Error("End the active workout before deleting it, or refresh the page.");
    },
  };
}
