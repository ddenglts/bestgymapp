ALTER TABLE "exercises" ADD CONSTRAINT "exercises_name_unique" UNIQUE("name");--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_name_unique" UNIQUE("name");