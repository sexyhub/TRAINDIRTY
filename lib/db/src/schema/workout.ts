import { pgTable, serial, text, integer, real, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const exerciseCategoryEnum = pgEnum("exercise_category", [
  "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio"
]);

export const exerciseGroupEnum = pgEnum("exercise_group", [
  "none", "superset", "circuit"
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "active", "completed", "aborted"
]);

export const unitEnum = pgEnum("unit", ["kg", "lbs"]);

export const userProfileTable = pgTable("user_profile", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Athlete"),
  weight: real("weight"),
  height: real("height"),
  fitnessGoal: text("fitness_goal"),
  unit: unitEnum("unit").notNull().default("kg"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workoutPlansTable = pgTable("workout_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, ..., 6=Saturday
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const exercisesTable = pgTable("exercises", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => workoutPlansTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: exerciseCategoryEnum("category").notNull(),
  tags: text("tags").array().notNull().default([]),
  description: text("description"),
  sets: integer("sets").notNull().default(3),
  reps: integer("reps").notNull().default(10),
  weight: real("weight"),
  restSeconds: integer("rest_seconds").notNull().default(60),
  videoUrl: text("video_url"),
  groupType: exerciseGroupEnum("group_type").notNull().default("none"),
  groupId: text("group_id"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const workoutSessionsTable = pgTable("workout_sessions", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => workoutPlansTable.id),
  planName: text("plan_name").notNull(),
  status: sessionStatusEnum("status").notNull().default("active"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  totalVolume: real("total_volume"),
});

export const setLogsTable = pgTable("set_logs", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => workoutSessionsTable.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id").notNull().references(() => exercisesTable.id),
  exerciseName: text("exercise_name").notNull(),
  setNumber: integer("set_number").notNull(),
  repsCompleted: integer("reps_completed"),
  weightUsed: real("weight_used"),
  completed: boolean("completed").notNull().default(false),
  loggedAt: timestamp("logged_at").notNull().defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfileTable).omit({ id: true, createdAt: true });
export const insertWorkoutPlanSchema = createInsertSchema(workoutPlansTable).omit({ id: true, createdAt: true });
export const insertExerciseSchema = createInsertSchema(exercisesTable).omit({ id: true });
export const insertWorkoutSessionSchema = createInsertSchema(workoutSessionsTable).omit({ id: true, startedAt: true });
export const insertSetLogSchema = createInsertSchema(setLogsTable).omit({ id: true, loggedAt: true });

export type UserProfile = typeof userProfileTable.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type WorkoutPlan = typeof workoutPlansTable.$inferSelect;
export type InsertWorkoutPlan = z.infer<typeof insertWorkoutPlanSchema>;
export type Exercise = typeof exercisesTable.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type WorkoutSession = typeof workoutSessionsTable.$inferSelect;
export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;
export type SetLog = typeof setLogsTable.$inferSelect;
export type InsertSetLog = z.infer<typeof insertSetLogSchema>;
