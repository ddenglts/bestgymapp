import { desc } from "drizzle-orm";
import { ExercisesView } from "./exercises-view";
import { db } from "@/db/client";
import { exercises } from "@/db/schema";

export default async function ExercisesPage() {
  const records = await db
    .select()
    .from(exercises)
    .orderBy(desc(exercises.createdAt));

  const initialExercises = records.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    createdAt:
      exercise.createdAt instanceof Date ? exercise.createdAt : new Date(exercise.createdAt),
  }));

  return <ExercisesView initialExercises={initialExercises} />;
}
