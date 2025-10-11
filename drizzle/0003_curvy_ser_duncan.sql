ALTER TABLE "exercises" DROP CONSTRAINT "exercises_slug_unique";--> statement-breakpoint
ALTER TABLE "exercises" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "exercises" DROP COLUMN "main_muscles";--> statement-breakpoint
ALTER TABLE "workout_exercises" DROP COLUMN "target_sets_min";--> statement-breakpoint
ALTER TABLE "workout_exercises" DROP COLUMN "target_sets_max";--> statement-breakpoint
ALTER TABLE "workout_exercises" DROP COLUMN "target_reps_min";--> statement-breakpoint
ALTER TABLE "workout_exercises" DROP COLUMN "target_reps_max";--> statement-breakpoint
DROP TYPE "public"."main_muscles";