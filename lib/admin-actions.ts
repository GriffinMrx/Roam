import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { getOrm } from "@/lib/db";
import {
  admins,
  commentLikes,
  commentReports,
  comments,
  teacherBookmarks,
  teacherCourses,
  teacherProfiles,
  teacherProgress,
  userBadges,
  userProfiles,
} from "@/lib/db/schema";
import { deleteCourse } from "@/lib/teach/store";
import { getWriteClient } from "@/sanity/lib/write-client";

/*
 * Admin writes on accounts (prompts/admin-console.md). Callers must have passed
 * guardAdminWrite and assertCanActOn first; these only do the work.
 */

export async function setBanned(userId: string, banned: boolean) {
  const clerk = await clerkClient();
  if (banned) {
    // Banning also ends every session, so the account is out immediately.
    await clerk.users.banUser(userId);
  } else {
    await clerk.users.unbanUser(userId);
  }
}

/** Ends every active session: the user must sign in again everywhere. Returns how many ended. */
export async function signOutEverywhere(userId: string) {
  const clerk = await clerkClient();
  const { data } = await clerk.sessions.getSessionList({ userId, status: "active", limit: 100 });
  await Promise.all(data.map((s) => clerk.sessions.revokeSession(s.id)));
  return data.length;
}

export async function addAdmin(userId: string, addedBy: string) {
  const inserted = await getOrm().insert(admins).values({ userId, addedBy }).onConflictDoNothing().returning({ userId: admins.userId });
  return inserted.length > 0;
}

export async function removeAdmin(userId: string) {
  const removed = await getOrm().delete(admins).where(eq(admins.userId, userId)).returning({ userId: admins.userId });
  return removed.length > 0;
}

/**
 * Deletes the account and the app data tied to it:
 *  - their teacher courses (with reviews and bookmarks)
 *  - profiles, progress, badges, bookmarks, likes and reports
 *  - Sanity progress and bookmarks
 * Their comments stay as "Deleted user" with the text removed, so other people's replies survive.
 */
export async function deleteAccount(userId: string) {
  const orm = getOrm();
  const owned = await orm.select({ id: teacherCourses.id }).from(teacherCourses).where(eq(teacherCourses.ownerId, userId));
  for (const course of owned) await deleteCourse(course.id, userId);

  await Promise.all([
    orm.delete(teacherProfiles).where(eq(teacherProfiles.userId, userId)),
    orm.delete(userProfiles).where(eq(userProfiles.userId, userId)),
    orm.delete(userBadges).where(eq(userBadges.userId, userId)),
    orm.delete(teacherProgress).where(eq(teacherProgress.userId, userId)),
    orm.delete(teacherBookmarks).where(eq(teacherBookmarks.userId, userId)),
    orm.delete(commentLikes).where(eq(commentLikes.userId, userId)),
    orm.delete(commentReports).where(eq(commentReports.userId, userId)),
    orm.delete(admins).where(eq(admins.userId, userId)),
    orm
      .update(comments)
      .set({ body: "", deletedAt: new Date(), pinnedAt: null, authorName: "Deleted user", authorImage: null, authorRole: null })
      .where(eq(comments.userId, userId)),
  ]);

  const write = getWriteClient();
  const docIds = await write.fetch<string[]>(`*[_type in ["progress", "bookmarks"] && userId == $userId]._id`, { userId });
  const tx = write.transaction();
  for (const id of [...docIds, `bookmarks.${userId}`]) tx.delete(id);
  await tx.commit();

  await (await clerkClient()).users.deleteUser(userId);
}
