import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";
import { and, count, countDistinct, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { defineQuery } from "next-sanity";

import { getOrm } from "@/lib/db";
import {
  adminAudit,
  admins,
  commentReports,
  comments,
  teacherCourses,
  teacherProfiles,
  teacherProgress,
  userBadges,
  userProfiles,
} from "@/lib/db/schema";
import { isOwner, ownerIds } from "@/lib/roles";
import { reviewsFor, effectiveStatus } from "@/lib/teach/review";
import { client } from "@/sanity/lib/client";

/*
 * Read-only data for the admin console (prompts/admin-console.md). Callers must have passed
 * requireAdminPage / guardAdminRead first; nothing here checks the role itself.
 */

const DAY = 86_400_000;

/* ---------- People ---------- */

export type AdminUserRow = {
  id: string;
  name: string;
  email: string | null;
  imageUrl: string;
  createdAt: number;
  lastActiveAt: number | null;
  banned: boolean;
  role: "owner" | "admin" | null;
  teacher: boolean;
  onboarded: boolean;
  twoFactor: boolean;
};

const displayName = (u: User) => u.fullName?.trim() || u.username || u.primaryEmailAddress?.emailAddress || "Unnamed";

/** Clerk users plus the app's own flags (admin, teacher, onboarding answers). */
async function decorate(users: User[]): Promise<AdminUserRow[]> {
  const ids = users.map((u) => u.id);
  if (!ids.length) return [];
  const orm = getOrm();
  const [adminRows, teacherRows, surveyRows] = await Promise.all([
    orm.select({ id: admins.userId }).from(admins).where(inArray(admins.userId, ids)),
    orm.select({ id: teacherProfiles.userId }).from(teacherProfiles).where(inArray(teacherProfiles.userId, ids)),
    orm.select({ id: userProfiles.userId }).from(userProfiles).where(inArray(userProfiles.userId, ids)),
  ]);
  const adminSet = new Set(adminRows.map((r) => r.id));
  const teacherSet = new Set(teacherRows.map((r) => r.id));
  const surveySet = new Set(surveyRows.map((r) => r.id));
  return users.map((u) => ({
    id: u.id,
    name: displayName(u),
    email: u.primaryEmailAddress?.emailAddress ?? null,
    imageUrl: u.imageUrl,
    createdAt: u.createdAt,
    lastActiveAt: u.lastActiveAt,
    banned: u.banned,
    role: isOwner(u.id) ? "owner" : adminSet.has(u.id) ? "admin" : null,
    teacher: teacherSet.has(u.id),
    onboarded: surveySet.has(u.id),
    twoFactor: u.twoFactorEnabled,
  }));
}

export const USERS_PAGE_SIZE = 25;

export async function searchUsers(query: string, page: number) {
  const { data, totalCount } = await (await clerkClient()).users.getUserList({
    query: query || undefined,
    limit: USERS_PAGE_SIZE,
    offset: page * USERS_PAGE_SIZE,
    orderBy: "-created_at",
  });
  return { users: await decorate(data), total: totalCount };
}

/** One user, or null when the id doesn't exist in Clerk. */
export async function getAdminUser(id: string) {
  try {
    const user = await (await clerkClient()).users.getUser(id);
    const [row] = await decorate([user]);
    return { row, user };
  } catch {
    return null;
  }
}

/** Owners and admins, for the Admins page. */
export async function listAdmins() {
  const rows = await getOrm().select().from(admins).orderBy(desc(admins.addedAt));
  const ids = [...new Set([...ownerIds(), ...rows.map((r) => r.userId)])];
  const users = ids.length ? (await (await clerkClient()).users.getUserList({ userId: ids, limit: 100 })).data : [];
  const decorated = await decorate(users);
  const addedAt = new Map(rows.map((r) => [r.userId, r.addedAt.toISOString()]));
  return decorated
    .map((u) => ({ ...u, addedAt: addedAt.get(u.id) ?? null }))
    .sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : (b.addedAt ?? "").localeCompare(a.addedAt ?? "")));
}

/* ---------- User detail ---------- */

const SANITY_PROGRESS_QUERY = defineQuery(`
  *[_type == "progress" && userId == $userId] | order(updatedAt desc) {
    "course": course->title,
    "done": count(lessons[completed == true]),
    "total": count(course->modules[].lessons[]),
    updatedAt
  }
`);

export async function userActivity(userId: string) {
  const orm = getOrm();
  const [survey, teacher, courseRows, commentStats, reportsAgainst, badges, sanityProgress, teacherDone] = await Promise.all([
    orm.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1),
    orm.select().from(teacherProfiles).where(eq(teacherProfiles.userId, userId)).limit(1),
    orm
      .select({ id: teacherCourses.id, title: teacherCourses.title, slug: teacherCourses.slug, submitted: sql<boolean>`${teacherCourses.status} <> 'draft'` })
      .from(teacherCourses)
      .where(eq(teacherCourses.ownerId, userId))
      .orderBy(desc(teacherCourses.updatedAt)),
    orm
      .select({ total: count(), hidden: sql<number>`count(${comments.hiddenAt})::int` })
      .from(comments)
      .where(and(eq(comments.userId, userId), isNull(comments.deletedAt))),
    orm
      .select({ n: countDistinct(commentReports.commentId) })
      .from(commentReports)
      .innerJoin(comments, eq(comments.id, commentReports.commentId))
      .where(eq(comments.userId, userId)),
    orm.select().from(userBadges).where(eq(userBadges.userId, userId)).orderBy(desc(userBadges.earnedAt)),
    client.fetch(SANITY_PROGRESS_QUERY, { userId }, { cache: "no-store" }),
    orm
      .select({ n: count() })
      .from(teacherProgress)
      .where(and(eq(teacherProgress.userId, userId), eq(teacherProgress.completed, true))),
  ]);
  const reviews = await reviewsFor(courseRows.map((c) => c.id));
  return {
    survey: survey[0] ?? null,
    teacher: teacher[0] ?? null,
    courses: courseRows.map((c) => ({ ...c, status: effectiveStatus(c.submitted, reviews.get(c.id)) })),
    comments: { total: commentStats[0]?.total ?? 0, hidden: commentStats[0]?.hidden ?? 0, reported: reportsAgainst[0]?.n ?? 0 },
    badges: badges.map((b) => ({ badge: b.badge, earnedAt: b.earnedAt.toISOString() })),
    learning: (sanityProgress ?? []).map((p) => ({ course: p.course ?? "Course", done: p.done ?? 0, total: p.total ?? 0 })),
    teacherLessonsCompleted: teacherDone[0]?.n ?? 0,
  };
}

/** Active sessions, for "Sign out everywhere". */
export async function activeSessionCount(userId: string) {
  const { totalCount } = await (await clerkClient()).sessions.getSessionList({ userId, status: "active", limit: 1 });
  return totalCount;
}

/* ---------- Overview ---------- */

const SANITY_COMPLETED_QUERY = defineQuery(`count(*[_type == "progress"].lessons[completed == true])`);

export async function overviewStats() {
  const clerk = await clerkClient();
  const orm = getOrm();
  const now = Date.now();

  const [
    totalUsers,
    active7,
    recentUsers,
    surveys,
    teachers,
    courseRows,
    openReports,
    teacherCompleted,
    sanityCompleted,
    badgeCount,
    recentAudit,
  ] = await Promise.all([
    clerk.users.getCount(),
    clerk.users.getUserList({ last_active_at_since: now - 7 * DAY, limit: 1 }).then((r) => r.totalCount),
    clerk.users.getUserList({ limit: 6, orderBy: "-created_at" }).then((r) => decorate(r.data)),
    orm.select({ n: count() }).from(userProfiles),
    orm.select({ n: count() }).from(teacherProfiles),
    orm.select({ id: teacherCourses.id, submitted: sql<boolean>`${teacherCourses.status} <> 'draft'` }).from(teacherCourses),
    orm.select({ n: countDistinct(commentReports.commentId) }).from(commentReports),
    orm.select({ n: count() }).from(teacherProgress).where(eq(teacherProgress.completed, true)),
    client.fetch(SANITY_COMPLETED_QUERY, {}, { cache: "no-store" }),
    orm.select({ n: count() }).from(userBadges),
    recentAuditEntries({ limit: 6 }),
  ]);

  const reviews = await reviewsFor(courseRows.map((c) => c.id));
  const courseStatus = { draft: 0, pending: 0, published: 0, rejected: 0 };
  for (const c of courseRows) courseStatus[effectiveStatus(c.submitted, reviews.get(c.id))]++;

  return {
    users: { total: totalUsers, active7 },
    recentUsers,
    surveys: surveys[0]?.n ?? 0,
    teachers: teachers[0]?.n ?? 0,
    courses: courseStatus,
    openReports: openReports[0]?.n ?? 0,
    lessonsCompleted: (typeof sanityCompleted === "number" ? sanityCompleted : 0) + (teacherCompleted[0]?.n ?? 0),
    badges: badgeCount[0]?.n ?? 0,
    recentAudit,
  };
}

/* ---------- Audit log ---------- */

export const AUDIT_PAGE_SIZE = 50;

/** Newest first, with actor names resolved from Clerk. */
export async function recentAuditEntries({ limit = AUDIT_PAGE_SIZE, offset = 0, action }: { limit?: number; offset?: number; action?: string }) {
  const rows = await getOrm()
    .select()
    .from(adminAudit)
    .where(action ? eq(adminAudit.action, action) : undefined)
    .orderBy(desc(adminAudit.createdAt))
    .limit(limit)
    .offset(offset);
  const ids = [...new Set(rows.flatMap((r) => [r.actorId, ...(r.targetType === "user" || r.targetType === "admin" ? [r.targetId] : [])]))];
  const users = ids.length ? (await (await clerkClient()).users.getUserList({ userId: ids, limit: 100 })).data : [];
  const names = new Map(users.map((u) => [u.id, displayName(u)]));
  return rows.map((r) => ({
    id: r.id,
    actor: names.get(r.actorId) ?? "Deleted user",
    actorId: r.actorId,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    targetName: names.get(r.targetId) ?? null,
    details: r.details,
    ip: r.ip,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function auditActions() {
  const rows = await getOrm().selectDistinct({ action: adminAudit.action }).from(adminAudit).orderBy(adminAudit.action);
  return rows.map((r) => r.action);
}
