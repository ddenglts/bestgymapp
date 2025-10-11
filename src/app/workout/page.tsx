import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { workouts, workoutSessions } from "@/db/schema";
import { StartWorkoutView, type StartWorkoutItem } from "./start-workout-view";

export const dynamic = "force-dynamic";

type RawWorkoutRow = {
  id: number;
  name: string;
  createdAt: Date;
  lastCompletedAt: Date | null;
  sessionsCount: number | string | null;
};

export default async function WorkoutPage() {
  const rows = (await db
    .select({
      id: workouts.id,
      name: workouts.name,
      createdAt: workouts.createdAt,
      lastCompletedAt: sql<Date | null>`max(${workoutSessions.completedAt})`,
      sessionsCount: sql<number>`count(${workoutSessions.id})`,
    })
    .from(workouts)
    .leftJoin(workoutSessions, eq(workoutSessions.workoutId, workouts.id))
    .groupBy(workouts.id)
    .orderBy(desc(workouts.createdAt))) as RawWorkoutRow[];

  const workoutItems: StartWorkoutItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    lastCompletedAt: row.lastCompletedAt instanceof Date
      ? row.lastCompletedAt
      : row.lastCompletedAt
      ? new Date(row.lastCompletedAt)
      : null,
    sessionsCount:
      typeof row.sessionsCount === "number"
        ? row.sessionsCount
        : Number(row.sessionsCount ?? 0),
  }));

  return <StartWorkoutView workouts={workoutItems} />;
}
