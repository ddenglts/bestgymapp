ALTER TABLE "exercise_sets" ALTER COLUMN "weight" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
CREATE UNIQUE INDEX "cw_session_unique" ON "current_workout" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "cw_session_idx" ON "current_workout" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "es_session_exercise_set_unique" ON "exercise_sets" USING btree ("session_id","exercise_id","set_number");--> statement-breakpoint
CREATE INDEX "es_session_idx" ON "exercise_sets" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "es_exercise_idx" ON "exercise_sets" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "exercises_name_idx" ON "exercises" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "we_workout_exercise_unique" ON "workout_exercises" USING btree ("workout_id","exercise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "we_workout_order_unique" ON "workout_exercises" USING btree ("workout_id","order");--> statement-breakpoint
CREATE INDEX "we_workout_idx" ON "workout_exercises" USING btree ("workout_id");--> statement-breakpoint
CREATE INDEX "we_exercise_idx" ON "workout_exercises" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "ws_workout_idx" ON "workout_sessions" USING btree ("workout_id");--> statement-breakpoint
CREATE INDEX "workouts_name_idx" ON "workouts" USING btree ("name");--> statement-breakpoint
ALTER TABLE "exercise_sets" ADD CONSTRAINT "es_set_number_positive" CHECK ("exercise_sets"."set_number" > 0);--> statement-breakpoint
ALTER TABLE "exercise_sets" ADD CONSTRAINT "es_reps_non_negative" CHECK ("exercise_sets"."reps" IS NULL OR "exercise_sets"."reps" >= 0);--> statement-breakpoint
ALTER TABLE "exercise_sets" ADD CONSTRAINT "es_weight_non_negative" CHECK ("exercise_sets"."weight" IS NULL OR "exercise_sets"."weight" >= 0);--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "we_order_positive" CHECK ("workout_exercises"."order" > 0);--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "ws_completed_after_start" CHECK ("workout_sessions"."completed_at" IS NULL OR "workout_sessions"."completed_at" >= "workout_sessions"."started_at");