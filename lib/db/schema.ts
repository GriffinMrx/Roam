import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/*
 * Neon Postgres schema (managed by Drizzle; migrations in /drizzle). Learner-generated
 * data that doesn't belong in Sanity: lesson comments, likes, and reports. Users are
 * Clerk ids; lessons are Sanity lesson _ids (AGENTS §7: kept apart from content), or
 * "tl-<uuid>" for teacher lessons.
 *
 * Teacher-made courses also live here (prompts/teachers-phase-1.md): a deliberate
 * exception to Sanity-authored content. Editorial courses stay in Sanity.
 */

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: text("lesson_id").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => comments.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    // Snapshot at post time, so reading a thread needs no Clerk calls.
    authorName: text("author_name").notNull(),
    authorImage: text("author_image"),
    authorRole: text("author_role"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    /** Removed by its author: body cleared, replies kept. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    /** Hidden by an admin: kept, but only admins see it. */
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    /** Pinned by an admin to the top of the lesson's discussion (top-level only). */
    pinnedAt: timestamp("pinned_at", { withTimezone: true }),
  },
  (t) => [
    index("comments_lesson_created_idx").on(t.lessonId, t.createdAt),
    index("comments_parent_idx").on(t.parentId),
    index("comments_user_created_idx").on(t.userId, t.createdAt),
    // Admin charts: comments per day (prompts/admin-charts-and-hardening.md)
    index("comments_created_idx").on(t.createdAt),
    check("comments_body_length", sql`char_length(${t.body}) <= 2000`),
  ],
);

export const commentLikes = pgTable(
  "comment_likes",
  {
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.commentId, t.userId] })],
);

export const commentReports = pgTable(
  "comment_reports",
  {
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.commentId, t.userId] }),
    check("comment_reports_reason_length", sql`char_length(${t.reason}) between 1 and 500`),
  ],
);

/* ---------- Teachers (prompts/teachers-phase-1.md) ---------- */

export type TeacherResource = { type: string; title: string; description: string; url: string };

/** A user who teaches; exists once they finish the teacher profile. */
export const teacherProfiles = pgTable(
  "teacher_profiles",
  {
    userId: text("user_id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    headline: text("headline").notNull().default(""),
    bio: text("bio").notNull().default(""),
    expertise: text("expertise").array().notNull().default(sql`'{}'::text[]`),
    photoUrl: text("photo_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("teacher_profiles_name_length", sql`char_length(${t.name}) between 1 and 80`),
    check("teacher_profiles_bio_length", sql`char_length(${t.bio}) <= 2000`),
  ],
);

/** Draft → pending (submitted) → published (admin approved) or rejected (with a note). */
export const teacherCourses = pgTable(
  "teacher_courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    level: text("level").notNull().default("beginner"),
    /** Whole US dollars; 0 is free. */
    price: integer("price").notNull().default(0),
    categorySlug: text("category_slug"),
    status: text("status").notNull().default("draft"),
    reviewNote: text("review_note"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("teacher_courses_owner_idx").on(t.ownerId),
    index("teacher_courses_status_idx").on(t.status),
    check("teacher_courses_status", sql`${t.status} in ('draft', 'pending', 'published', 'rejected')`),
    check("teacher_courses_level", sql`${t.level} in ('beginner', 'intermediate', 'advanced')`),
    check("teacher_courses_price", sql`${t.price} between 0 and 10000`),
    check("teacher_courses_title_length", sql`char_length(${t.title}) between 1 and 120`),
    check("teacher_courses_summary_length", sql`char_length(${t.summary}) <= 240`),
  ],
);

export const teacherModules = pgTable(
  "teacher_modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => teacherCourses.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
  },
  (t) => [index("teacher_modules_course_idx").on(t.courseId, t.position)],
);

export const teacherLessons = pgTable(
  "teacher_lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => teacherCourses.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => teacherModules.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    videoUrl: text("video_url").notNull().default(""),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    freePreview: boolean("free_preview").notNull().default(false),
    /** Paragraphs; shown through the Portable Text renderer as plain blocks. */
    notes: text("notes").array().notNull().default(sql`'{}'::text[]`),
    keyPoints: text("key_points").array().notNull().default(sql`'{}'::text[]`),
    proTip: text("pro_tip").notNull().default(""),
    resources: jsonb("resources").$type<TeacherResource[]>().notNull().default([]),
  },
  (t) => [
    index("teacher_lessons_module_idx").on(t.moduleId, t.position),
    index("teacher_lessons_course_idx").on(t.courseId),
    check("teacher_lessons_duration", sql`${t.durationSeconds} between 0 and 86400`),
  ],
);

/* ---------- Learners (prompts/onboarding-survey-review-and-phase-2.md) ---------- */

/** Onboarding survey answers, one row per user. Used for recommendations and admin insights. */
export const userProfiles = pgTable(
  "user_profiles",
  {
    userId: text("user_id").primaryKey(),
    /** "learn" | "teach": what they chose in onboarding. */
    intent: text("intent").notNull().default("learn"),
    persona: text("persona"),
    heardFrom: text("heard_from"),
    heardFromOther: text("heard_from_other"),
    goals: text("goals").array().notNull().default(sql`'{}'::text[]`),
    interests: text("interests").array().notNull().default(sql`'{}'::text[]`),
    level: text("level"),
    weeklyTime: text("weekly_time"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("user_profiles_other_length", sql`char_length(${t.heardFromOther}) <= 120`)],
);

/** Watch progress on teacher lessons (editorial progress stays in Sanity). */
export const teacherProgress = pgTable(
  "teacher_progress",
  {
    userId: text("user_id").notNull(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => teacherLessons.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => teacherCourses.id, { onDelete: "cascade" }),
    position: doublePrecision("position").notNull().default(0),
    duration: doublePrecision("duration").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.lessonId] }),
    index("teacher_progress_user_course_idx").on(t.userId, t.courseId),
    index("teacher_progress_course_idx").on(t.courseId),
    // Admin charts: completions per day (prompts/admin-charts-and-hardening.md)
    index("teacher_progress_completed_at_idx").on(t.completed, t.completedAt),
  ],
);

/** Saved teacher courses and lessons (editorial bookmarks stay in Sanity). */
export const teacherBookmarks = pgTable(
  "teacher_bookmarks",
  {
    userId: text("user_id").notNull(),
    /** "tc-<uuid>" or "tl-<uuid>", the same ids the pages use. */
    targetId: text("target_id").notNull(),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.targetId] }), index("teacher_bookmarks_target_idx").on(t.targetId)],
);

/** Earned badges: "first-lesson", "ten-lessons", "first-course", "three-courses", "course:<courseId>". */
export const userBadges = pgTable(
  "user_badges",
  {
    userId: text("user_id").notNull(),
    badge: text("badge").notNull(),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badge] })],
);

/* ---------- Admin console (prompts/admin-console.md) ---------- */

/**
 * Admins added by the owner. The owner (ROAM_OWNER_USER_IDS, server env) is always an admin
 * and never stored here. Checked server-side on every admin page and route.
 */
export const admins = pgTable("admins", {
  userId: text("user_id").primaryKey(),
  addedBy: text("added_by").notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Append-only record of every admin action. The app never updates or deletes rows. */
export const adminAudit = pgTable(
  "admin_audit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("admin_audit_created_idx").on(t.createdAt), index("admin_audit_action_idx").on(t.action, t.createdAt)],
);

/* ---------- Rate limits (prompts/admin-charts-and-hardening.md) ---------- */

/**
 * One row per limited write, so limits hold across server instances and restarts
 * (lib/rate-limit.ts). Rows older than a day are pruned as new ones arrive.
 */
export const rateEvents = pgTable(
  "rate_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    bucket: text("bucket").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rate_events_user_bucket_created_idx").on(t.userId, t.bucket, t.createdAt)],
);
