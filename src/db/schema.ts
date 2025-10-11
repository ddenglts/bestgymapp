import { pgTable, serial, text, integer, numeric, timestamp } from 'drizzle-orm/pg-core';

export const exercises = pgTable('exercises', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const workouts = pgTable('workouts', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const workoutExercises = pgTable('workout_exercises', {
  id: serial('id').primaryKey(),
  workoutId: integer('workout_id')
    .references(() => workouts.id, { onDelete: 'cascade' })
    .notNull(),
  exerciseId: integer('exercise_id')
    .references(() => exercises.id, { onDelete: 'restrict' })
    .notNull(),
  order: integer('order').notNull(),
  completedAt: timestamp('completed_at'),
});

export const workoutSessions = pgTable('workout_sessions', {
  id: serial('id').primaryKey(),
  workoutId: integer('workout_id').references(() => workouts.id, { onDelete: 'set null' }),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export const exerciseSets = pgTable('exercise_sets', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .references(() => workoutSessions.id, { onDelete: 'cascade' })
    .notNull(),
  workoutExerciseId: integer('workout_exercise_id').references(() => workoutExercises.id, {
    onDelete: 'set null',
  }),
  exerciseId: integer('exercise_id')
    .references(() => exercises.id, { onDelete: 'restrict' })
    .notNull(),
  setNumber: integer('set_number').notNull(),
  reps: integer('reps'),
  weight: numeric('weight'),
  loggedAt: timestamp('logged_at').defaultNow().notNull(),
});

export const currentWorkout = pgTable('current_workout', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .references(() => workoutSessions.id, { onDelete: 'cascade' })
    .notNull(),
  activeExerciseId: integer('active_exercise_id').references(() => exercises.id),
  lastUpdatedAt: timestamp('last_updated_at').defaultNow().notNull(),
});
