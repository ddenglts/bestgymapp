// schema.ts
import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * NOTE: For case-insensitive uniqueness on names, keep the .unique() below
 * AND add these in a migration:
 *   CREATE UNIQUE INDEX exercises_name_lower_unique ON public.exercises (lower(name));
 *   CREATE UNIQUE INDEX workouts_name_lower_unique  ON public.workouts  (lower(name));
 */

export const exercises = pgTable('exercises', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // add functional unique index in migration for case-insensitive
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  // lookups
  index('exercises_name_idx').on(t.name),
]);

export const workouts = pgTable('workouts', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // add functional unique index in migration for case-insensitive
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('workouts_name_idx').on(t.name),
]);

export const workoutExercises = pgTable('workout_exercises', {
  id: serial('id').primaryKey(),

  workoutId: integer('workout_id')
    .references(() => workouts.id, { onDelete: 'cascade' })
    .notNull(),

  exerciseId: integer('exercise_id')
    .references(() => exercises.id, { onDelete: 'restrict' })
    .notNull(),

  order: integer('order').notNull(),            // sequence within workout (1..N)
  completedAt: timestamp('completed_at'),
}, (t) => [
  // Prevent the same exercise being added twice to the same workout
  uniqueIndex('we_workout_exercise_unique').on(t.workoutId, t.exerciseId),

  // Prevent duplicate "order" values within a workout
  uniqueIndex('we_workout_order_unique').on(t.workoutId, t.order),

  // Order must be positive
  check('we_order_positive', sql`${t.order} > 0`),

  // Helpful lookup indexes
  index('we_workout_idx').on(t.workoutId),
  index('we_exercise_idx').on(t.exerciseId),
]);

export const workoutSessions = pgTable('workout_sessions', {
  id: serial('id').primaryKey(),

  workoutId: integer('workout_id')
    .references(() => workouts.id, { onDelete: 'set null' }),

  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (t) => [
  // A session can't complete before it starts
  check(
    'ws_completed_after_start',
    sql`${t.completedAt} IS NULL OR ${t.completedAt} >= ${t.startedAt}`
  ),

  index('ws_workout_idx').on(t.workoutId),
]);

export const exerciseSets = pgTable('exercise_sets', {
  id: serial('id').primaryKey(),

  sessionId: integer('session_id')
    .references(() => workoutSessions.id, { onDelete: 'cascade' })
    .notNull(),

  // Optional pointer to the planned entry; remains NULL if you log ad-hoc
  workoutExerciseId: integer('workout_exercise_id')
    .references(() => workoutExercises.id, { onDelete: 'set null' }),

  // Always store the actual exercise too (guards against plan edits)
  exerciseId: integer('exercise_id')
    .references(() => exercises.id, { onDelete: 'restrict' })
    .notNull(),

  setNumber: integer('set_number').notNull(),
  reps: integer('reps'), // nullable for "incomplete / to be filled"
  weight: numeric('weight', { precision: 10, scale: 2 }), // add precision/scale
  loggedAt: timestamp('logged_at').defaultNow().notNull(),
}, (t) => [
  // Only one row per (session, exercise, set_number)
  uniqueIndex('es_session_exercise_set_unique').on(t.sessionId, t.exerciseId, t.setNumber),

  // Sanity checks
  check('es_set_number_positive', sql`${t.setNumber} > 0`),
  check('es_reps_non_negative', sql`${t.reps} IS NULL OR ${t.reps} >= 0`),
  check('es_weight_non_negative', sql`${t.weight} IS NULL OR ${t.weight} >= 0`),

  // Lookups
  index('es_session_idx').on(t.sessionId),
  index('es_exercise_idx').on(t.exerciseId),
]);

export const currentWorkout = pgTable('current_workout', {
  id: serial('id').primaryKey(),

  sessionId: integer('session_id')
    .references(() => workoutSessions.id, { onDelete: 'cascade' })
    .notNull(),

  // If you want to guarantee the active exercise is part of the planned workout
  // consider referencing workoutExercises.id instead. Keeping exercises.id per your original:
  activeExerciseId: integer('active_exercise_id')
    .references(() => exercises.id),

  lastUpdatedAt: timestamp('last_updated_at').defaultNow().notNull(),
}, (t) => [
  // At most one "current" row per session
  uniqueIndex('cw_session_unique').on(t.sessionId),
  index('cw_session_idx').on(t.sessionId),
]);
