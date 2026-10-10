import { sql, type SQL } from "drizzle-orm";
import { db } from "./client";
import { createWorkoutSessionStore, type RunWorkoutMutation } from "@/lib/workout-session-store";

const run: RunWorkoutMutation = async <T extends Record<string, unknown>>(query: SQL) => {
  // Neon HTTP supports atomic batches, not interactive db.transaction callbacks.
  // A separate first statement gives the following query a fresh READ COMMITTED
  // snapshot after waiting for any other session mutation to finish.
  const [, result] = await db.batch([
    db.execute(sql`SELECT pg_advisory_xact_lock(724319, 1)`),
    db.execute(query),
  ]);
  return result.rows as T[];
};

export const workoutSessionStore = createWorkoutSessionStore(run);
