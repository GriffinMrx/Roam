CREATE TABLE "teacher_bookmarks" (
	"user_id" text NOT NULL,
	"target_id" text NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_bookmarks_user_id_target_id_pk" PRIMARY KEY("user_id","target_id")
);
--> statement-breakpoint
CREATE TABLE "teacher_progress" (
	"user_id" text NOT NULL,
	"lesson_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"position" double precision DEFAULT 0 NOT NULL,
	"duration" double precision DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"user_id" text NOT NULL,
	"badge" text NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_badges_user_id_badge_pk" PRIMARY KEY("user_id","badge")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"intent" text DEFAULT 'learn' NOT NULL,
	"persona" text,
	"heard_from" text,
	"heard_from_other" text,
	"goals" text[] DEFAULT '{}'::text[] NOT NULL,
	"interests" text[] DEFAULT '{}'::text[] NOT NULL,
	"level" text,
	"weekly_time" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_other_length" CHECK (char_length("user_profiles"."heard_from_other") <= 120)
);
--> statement-breakpoint
ALTER TABLE "teacher_progress" ADD CONSTRAINT "teacher_progress_lesson_id_teacher_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."teacher_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_progress" ADD CONSTRAINT "teacher_progress_course_id_teacher_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."teacher_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "teacher_bookmarks_target_idx" ON "teacher_bookmarks" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "teacher_progress_user_course_idx" ON "teacher_progress" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE INDEX "teacher_progress_course_idx" ON "teacher_progress" USING btree ("course_id");