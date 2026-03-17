CREATE TYPE "public"."exercise_category" AS ENUM('Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio');--> statement-breakpoint
CREATE TYPE "public"."exercise_group" AS ENUM('none', 'superset', 'circuit');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('active', 'completed', 'aborted');--> statement-breakpoint
CREATE TYPE "public"."unit" AS ENUM('kg', 'lbs');--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"name" text NOT NULL,
	"category" "exercise_category" NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"description" text,
	"sets" integer DEFAULT 3 NOT NULL,
	"reps" integer DEFAULT 10 NOT NULL,
	"weight" real,
	"is_bodyweight" boolean DEFAULT false NOT NULL,
	"rest_seconds" integer DEFAULT 60 NOT NULL,
	"video_url" text,
	"group_type" "exercise_group" DEFAULT 'none' NOT NULL,
	"group_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "set_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"exercise_name" text NOT NULL,
	"set_number" integer NOT NULL,
	"reps_completed" integer,
	"weight_used" real,
	"completed" boolean DEFAULT false NOT NULL,
	"logged_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'Athlete' NOT NULL,
	"weight" real,
	"height" real,
	"fitness_goal" text,
	"unit" "unit" DEFAULT 'kg' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"plan_name" text NOT NULL,
	"status" "session_status" DEFAULT 'active' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"notes" text,
	"total_volume" real
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"password_hash" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_plan_id_workout_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."workout_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_session_id_workout_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_plan_id_workout_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."workout_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");