CREATE TABLE "teacher_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"level" text DEFAULT 'beginner' NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"category_slug" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"review_note" text,
	"submitted_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_courses_slug_unique" UNIQUE("slug"),
	CONSTRAINT "teacher_courses_status" CHECK ("teacher_courses"."status" in ('draft', 'pending', 'published', 'rejected')),
	CONSTRAINT "teacher_courses_level" CHECK ("teacher_courses"."level" in ('beginner', 'intermediate', 'advanced')),
	CONSTRAINT "teacher_courses_price" CHECK ("teacher_courses"."price" between 0 and 10000),
	CONSTRAINT "teacher_courses_title_length" CHECK (char_length("teacher_courses"."title") between 1 and 120),
	CONSTRAINT "teacher_courses_summary_length" CHECK (char_length("teacher_courses"."summary") <= 240)
);
--> statement-breakpoint
CREATE TABLE "teacher_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"video_url" text DEFAULT '' NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"free_preview" boolean DEFAULT false NOT NULL,
	"notes" text[] DEFAULT '{}'::text[] NOT NULL,
	"key_points" text[] DEFAULT '{}'::text[] NOT NULL,
	"pro_tip" text DEFAULT '' NOT NULL,
	"resources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "teacher_lessons_slug_unique" UNIQUE("slug"),
	CONSTRAINT "teacher_lessons_duration" CHECK ("teacher_lessons"."duration_seconds" between 0 and 86400)
);
--> statement-breakpoint
CREATE TABLE "teacher_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"expertise" text[] DEFAULT '{}'::text[] NOT NULL,
	"photo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_profiles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "teacher_profiles_name_length" CHECK (char_length("teacher_profiles"."name") between 1 and 80),
	CONSTRAINT "teacher_profiles_bio_length" CHECK (char_length("teacher_profiles"."bio") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "teacher_lessons" ADD CONSTRAINT "teacher_lessons_course_id_teacher_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."teacher_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_lessons" ADD CONSTRAINT "teacher_lessons_module_id_teacher_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."teacher_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_modules" ADD CONSTRAINT "teacher_modules_course_id_teacher_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."teacher_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "teacher_courses_owner_idx" ON "teacher_courses" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "teacher_courses_status_idx" ON "teacher_courses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "teacher_lessons_module_idx" ON "teacher_lessons" USING btree ("module_id","position");--> statement-breakpoint
CREATE INDEX "teacher_lessons_course_idx" ON "teacher_lessons" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "teacher_modules_course_idx" ON "teacher_modules" USING btree ("course_id","position");