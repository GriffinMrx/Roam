import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { and, desc, eq, gt, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { defineQuery } from "next-sanity";

import { client } from "@/sanity/lib/client";

import { getOrm } from "./db";
import { getRole, isAdmin } from "./roles";
import { TEACHER_LESSON_KEY } from "./teach/schema";
import { lessonOwner, publishedLessonInfo, teacherLessonTitles } from "./teach/store";
import { commentLikes, commentReports, comments } from "./db/schema";
import type { CommentRole, CommentSort, CommentView, Thread } from "./comments-shared";

/*
 * Lesson discussions on Neon Postgres. Every function takes the acting user's id from
 * the Clerk session (never from the request body); ownership and admin rights are
 * enforced here, in SQL WHERE clauses and server-side role checks.
 */

const THREAD_LIMIT = 500;
const PER_MINUTE = 5;
const PER_HOUR = 30;

/* ---------- Roles (lib/roles.ts: admins from the server, teachers from Clerk metadata) ---------- */

export { getRole };

/**
 * Who may moderate a lesson's discussion: admins everywhere, and a teacher on the lessons
 * of their own courses (prompts/teachers-phase-1.md).
 */
export async function canModerateLesson(userId: string, lessonId: string) {
  if (await isAdmin(userId)) return true;
  return TEACHER_LESSON_KEY.test(lessonId) && (await lessonOwner(lessonId)) === userId;
}

async function getAuthor(userId: string) {
  const [user, admin] = await Promise.all([(await clerkClient()).users.getUser(userId), isAdmin(userId)]);
  const role: CommentRole | null = admin
    ? "admin"
    : (user.publicMetadata as { role?: unknown }).role === "instructor"
      ? "instructor"
      : null;
  const name =
    user.fullName?.trim() || user.username || user.firstName || "Learner";
  return { name: name.slice(0, 80), image: user.imageUrl || null, role };
}

/* ---------- Lessons (Sanity) ---------- */

const LESSON_ACCESS_QUERY = defineQuery(`
  *[_type == "lesson" && _id == $id][0] { _id, freePreview }
`);

/** Null when the lesson doesn't exist (teacher lessons: or isn't published). */
export async function getLessonAccess(lessonId: string) {
  if (TEACHER_LESSON_KEY.test(lessonId)) {
    const info = await publishedLessonInfo(lessonId);
    return info ? { freePreview: info.freePreview } : null;
  }
  const lesson = await client.fetch(LESSON_ACCESS_QUERY, { id: lessonId }, { cache: "no-store" });
  return lesson ? { freePreview: Boolean(lesson.freePreview) } : null;
}

/* ---------- Read ---------- */

export async function listThread(
  lessonId: string,
  viewerId: string | null,
  isAdmin: boolean,
  sort: CommentSort,
): Promise<Thread> {
  const orm = getOrm();
  const me = viewerId ?? "";
  const rows = await orm
    .select({
      id: comments.id,
      parentId: comments.parentId,
      userId: comments.userId,
      authorName: comments.authorName,
      authorImage: comments.authorImage,
      authorRole: comments.authorRole,
      body: comments.body,
      createdAt: comments.createdAt,
      editedAt: comments.editedAt,
      deletedAt: comments.deletedAt,
      hiddenAt: comments.hiddenAt,
      pinnedAt: comments.pinnedAt,
      likeCount: sql<number>`(select count(*)::int from ${commentLikes} where ${commentLikes.commentId} = ${comments.id})`,
      likedByMe: sql<boolean>`exists(select 1 from ${commentLikes} where ${commentLikes.commentId} = ${comments.id} and ${commentLikes.userId} = ${me})`,
      reportedByMe: sql<boolean>`exists(select 1 from ${commentReports} where ${commentReports.commentId} = ${comments.id} and ${commentReports.userId} = ${me})`,
    })
    .from(comments)
    .where(and(eq(comments.lessonId, lessonId), isAdmin ? undefined : isNull(comments.hiddenAt)))
    .orderBy(comments.createdAt)
    .limit(THREAD_LIMIT);

  const reportsById = new Map<string, { reason: string; createdAt: string }[]>();
  if (isAdmin && rows.length) {
    const reports = await orm
      .select({ commentId: commentReports.commentId, reason: commentReports.reason, createdAt: commentReports.createdAt })
      .from(commentReports)
      .where(inArray(commentReports.commentId, rows.map((r) => r.id)))
      .orderBy(desc(commentReports.createdAt));
    for (const r of reports) {
      const list = reportsById.get(r.commentId) ?? [];
      list.push({ reason: r.reason, createdAt: r.createdAt.toISOString() });
      reportsById.set(r.commentId, list);
    }
  }

  const views = new Map<string, CommentView>();
  for (const row of rows) {
    const deleted = row.deletedAt !== null;
    views.set(row.id, {
      id: row.id,
      parentId: row.parentId,
      authorName: deleted ? "Deleted" : row.authorName,
      authorImage: deleted ? null : row.authorImage,
      authorRole: deleted ? null : ((row.authorRole as CommentRole) ?? null),
      body: deleted ? "" : row.body,
      createdAt: row.createdAt.toISOString(),
      editedAt: row.editedAt?.toISOString() ?? null,
      deleted,
      hidden: row.hiddenAt !== null,
      pinned: row.pinnedAt !== null,
      likeCount: Number(row.likeCount),
      likedByMe: Boolean(row.likedByMe),
      reportedByMe: Boolean(row.reportedByMe),
      mine: viewerId !== null && row.userId === viewerId,
      ...(isAdmin ? { reports: reportsById.get(row.id) ?? [] } : {}),
      replies: [],
    });
  }

  const top: CommentView[] = [];
  for (const view of views.values()) {
    if (view.parentId) views.get(view.parentId)?.replies.push(view);
    else top.push(view);
  }
  // A deleted comment only stays as a placeholder while it has replies.
  const visible = top.filter((c) => !c.deleted || c.replies.length > 0);
  for (const c of visible) c.replies = c.replies.filter((r) => !r.deleted);

  visible.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (sort === "top" && a.likeCount !== b.likeCount) return b.likeCount - a.likeCount;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const total = visible.reduce((n, c) => n + (c.deleted ? 0 : 1) + c.replies.length, 0);
  return { comments: visible, total, viewer: { signedIn: viewerId !== null, isAdmin } };
}

/* ---------- Write ---------- */

export class CommentError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function createComment(userId: string, lessonId: string, body: string, parentId?: string) {
  const orm = getOrm();

  // Rate limit from the database: works across server instances.
  const [{ minute, hour }] = await orm
    .select({
      minute: sql<number>`count(*) filter (where ${comments.createdAt} > now() - interval '1 minute')::int`,
      hour: sql<number>`count(*)::int`,
    })
    .from(comments)
    .where(and(eq(comments.userId, userId), gt(comments.createdAt, sql`now() - interval '1 hour'`)));
  if (minute >= PER_MINUTE || hour >= PER_HOUR) {
    throw new CommentError(429, "You're posting a lot. Please wait a moment and try again.");
  }

  if (parentId) {
    const [parent] = await orm
      .select({ lessonId: comments.lessonId, parentId: comments.parentId, deletedAt: comments.deletedAt, hiddenAt: comments.hiddenAt })
      .from(comments)
      .where(eq(comments.id, parentId))
      .limit(1);
    if (!parent || parent.lessonId !== lessonId || parent.parentId !== null || parent.deletedAt || parent.hiddenAt) {
      throw new CommentError(400, "You can't reply to that comment.");
    }
  }

  const author = await getAuthor(userId);
  const [row] = await orm
    .insert(comments)
    .values({
      lessonId,
      parentId: parentId ?? null,
      userId,
      authorName: author.name,
      authorImage: author.image,
      authorRole: author.role,
      body,
    })
    .returning({ id: comments.id });
  return row.id;
}

/** Author only, on a live comment. */
export async function editComment(userId: string, id: string, body: string) {
  const updated = await getOrm()
    .update(comments)
    .set({ body, editedAt: new Date() })
    .where(and(eq(comments.id, id), eq(comments.userId, userId), isNull(comments.deletedAt), isNull(comments.hiddenAt)))
    .returning({ id: comments.id });
  if (!updated.length) throw new CommentError(404, "Comment not found.");
}

/** Author only: soft delete (body cleared, replies kept). */
export async function deleteOwnComment(userId: string, id: string) {
  const updated = await getOrm()
    .update(comments)
    .set({ body: "", deletedAt: new Date(), pinnedAt: null })
    .where(and(eq(comments.id, id), eq(comments.userId, userId), isNull(comments.deletedAt)))
    .returning({ id: comments.id });
  if (!updated.length) throw new CommentError(404, "Comment not found.");
}

async function requireVisible(id: string) {
  const [row] = await getOrm()
    .select({ userId: comments.userId })
    .from(comments)
    .where(and(eq(comments.id, id), isNull(comments.deletedAt), isNull(comments.hiddenAt)))
    .limit(1);
  if (!row) throw new CommentError(404, "Comment not found.");
  return row;
}

export async function setLike(userId: string, id: string, liked: boolean) {
  await requireVisible(id);
  const orm = getOrm();
  if (liked) await orm.insert(commentLikes).values({ commentId: id, userId }).onConflictDoNothing();
  else await orm.delete(commentLikes).where(and(eq(commentLikes.commentId, id), eq(commentLikes.userId, userId)));
}

export async function reportComment(userId: string, id: string, reason: string) {
  const row = await requireVisible(id);
  if (row.userId === userId) throw new CommentError(400, "You can't report your own comment.");
  await getOrm().insert(commentReports).values({ commentId: id, userId, reason }).onConflictDoNothing();
}

/* ---------- Moderation (admins, or the lesson's teacher) ---------- */

/** Admins, or the teacher who owns the comment's lesson. */
export async function requireModerator(userId: string, commentId: string) {
  const [row] = await getOrm().select({ lessonId: comments.lessonId }).from(comments).where(eq(comments.id, commentId)).limit(1);
  if (!row) throw new CommentError(404, "Comment not found.");
  if (!(await canModerateLesson(userId, row.lessonId))) throw new CommentError(403, "Moderators only.");
}

export async function setHidden(id: string, hidden: boolean) {
  const updated = await getOrm()
    .update(comments)
    .set({ hiddenAt: hidden ? new Date() : null, ...(hidden ? { pinnedAt: null } : {}) })
    .where(eq(comments.id, id))
    .returning({ id: comments.id });
  if (!updated.length) throw new CommentError(404, "Comment not found.");
}

/** Top-level, live comments only. */
export async function setPinned(id: string, pinned: boolean) {
  const updated = await getOrm()
    .update(comments)
    .set({ pinnedAt: pinned ? new Date() : null })
    .where(and(eq(comments.id, id), isNull(comments.parentId), isNull(comments.deletedAt), isNull(comments.hiddenAt)))
    .returning({ id: comments.id });
  if (!updated.length) throw new CommentError(404, "Only visible top-level comments can be pinned.");
}

/** Permanent: the comment, its replies, likes, and reports are removed (cascade). */
export async function deletePermanently(id: string) {
  const deleted = await getOrm().delete(comments).where(eq(comments.id, id)).returning({ id: comments.id });
  if (!deleted.length) throw new CommentError(404, "Comment not found.");
}

export async function dismissReports(id: string) {
  await getOrm().delete(commentReports).where(eq(commentReports.commentId, id));
}

/* ---------- Moderation queue ---------- */

const LESSON_TITLES_QUERY = defineQuery(`
  *[_type == "lesson" && _id in $ids] { _id, title, "slug": slug.current }
`);

export type ModerationFilter = "reported" | "hidden" | "recent";

/** Admins: every lesson. Teachers: pass their own lesson keys (scope). */
export async function moderationQueue(filter: ModerationFilter, scope?: string[]) {
  if (scope && scope.length === 0) return [];
  const orm = getOrm();
  const reportCount = sql<number>`(select count(*)::int from ${commentReports} where ${commentReports.commentId} = ${comments.id})`;
  const rows = await orm
    .select({
      id: comments.id,
      lessonId: comments.lessonId,
      parentId: comments.parentId,
      authorName: comments.authorName,
      body: comments.body,
      createdAt: comments.createdAt,
      hiddenAt: comments.hiddenAt,
      deletedAt: comments.deletedAt,
      reportCount,
    })
    .from(comments)
    .where(
      and(
        scope ? inArray(comments.lessonId, scope) : undefined,
        filter === "reported"
          ? sql`exists(select 1 from ${commentReports} where ${commentReports.commentId} = ${comments.id})`
          : filter === "hidden"
            ? isNotNull(comments.hiddenAt)
            : or(isNull(comments.deletedAt), isNotNull(comments.hiddenAt)),
      ),
    )
    .orderBy(filter === "reported" ? desc(reportCount) : desc(comments.createdAt), desc(comments.createdAt))
    .limit(100);

  const ids = rows.map((r) => r.id);
  const reports = ids.length
    ? await orm
        .select({ commentId: commentReports.commentId, reason: commentReports.reason, createdAt: commentReports.createdAt })
        .from(commentReports)
        .where(inArray(commentReports.commentId, ids))
        .orderBy(desc(commentReports.createdAt))
    : [];
  const lessonIds = [...new Set(rows.map((r) => r.lessonId))];
  const teacherIds = lessonIds.filter((id) => TEACHER_LESSON_KEY.test(id));
  const sanityIds = lessonIds.filter((id) => !TEACHER_LESSON_KEY.test(id));
  const lessons = [
    ...(sanityIds.length ? await client.fetch(LESSON_TITLES_QUERY, { ids: sanityIds }, { cache: "no-store" }) : []),
    ...(await teacherLessonTitles(teacherIds)),
  ];
  const lessonById = new Map(lessons.map((l) => [l._id, l]));

  return rows.map((row) => ({
    id: row.id,
    isReply: row.parentId !== null,
    lessonTitle: lessonById.get(row.lessonId)?.title ?? "Unknown lesson",
    lessonSlug: lessonById.get(row.lessonId)?.slug ?? null,
    authorName: row.authorName,
    body: row.deletedAt ? "" : row.body,
    deleted: row.deletedAt !== null,
    hidden: row.hiddenAt !== null,
    createdAt: row.createdAt.toISOString(),
    reportCount: Number(row.reportCount),
    reports: reports
      .filter((r) => r.commentId === row.id)
      .map((r) => ({ reason: r.reason, createdAt: r.createdAt.toISOString() })),
  }));
}
