import { sql } from "drizzle-orm";
import { check, index, pgTable, primaryKey, text, timestamp, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";

/*
 * Neon Postgres schema (managed by Drizzle; migrations in /drizzle). Learner-generated
 * data that doesn't belong in Sanity: lesson comments, likes, and reports. Users are
 * Clerk ids; lessons are Sanity lesson _ids (AGENTS §7: kept apart from content).
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
