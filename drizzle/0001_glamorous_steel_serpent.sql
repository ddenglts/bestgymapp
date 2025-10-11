ALTER TABLE "exercises" ALTER COLUMN "main_muscles" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."main_muscles";--> statement-breakpoint
CREATE TYPE "public"."main_muscles" AS ENUM('chest', 'back', 'shoulders', 'arms', 'core', 'legs', 'glutes', 'calves', 'neck');--> statement-breakpoint
ALTER TABLE "exercises" ALTER COLUMN "main_muscles" SET DATA TYPE "public"."main_muscles" USING "main_muscles"::"public"."main_muscles";