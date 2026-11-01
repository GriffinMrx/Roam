import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { getOrm } from "@/lib/db";
import { admins } from "@/lib/db/schema";

/*
 * Roles. Admin comes only from the server: the owner ids in ROAM_OWNER_USER_IDS, or a row in
 * the Neon `admins` table that only the owner can add (prompts/admin-console.md). Clerk
 * metadata never makes anyone an admin. Teacher ("instructor") is Clerk publicMetadata.role,
 * set by the server when the teacher profile is saved. Only server code reads or sets these,
 * with the Clerk secret key (AGENTS §12).
 */

export type Role = "admin" | "instructor" | null;

/** Owner ids from the server env (comma separated). */
export function ownerIds(): string[] {
  return (process.env.ROAM_OWNER_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^user_[A-Za-z0-9]+$/.test(id));
}

export const isOwner = (userId: string) => ownerIds().includes(userId);

/** Owner, or added by the owner. Read fresh on every call, so removing an admin applies at once. */
export async function isAdmin(userId: string): Promise<boolean> {
  if (isOwner(userId)) return true;
  const [row] = await getOrm().select({ userId: admins.userId }).from(admins).where(eq(admins.userId, userId)).limit(1);
  return Boolean(row);
}

export async function getRole(userId: string): Promise<Role> {
  if (await isAdmin(userId)) return "admin";
  const user = await (await clerkClient()).users.getUser(userId);
  return (user.publicMetadata as { role?: unknown }).role === "instructor" ? "instructor" : null;
}

/** Marks the onboarding survey as answered, so the client gate stops sending the user to /onboarding. */
export async function markOnboarded(userId: string) {
  await (await clerkClient()).users.updateUserMetadata(userId, { publicMetadata: { onboarded: true } });
}

/**
 * Marks the user as a teacher. Never touches admin status (that lives in the `admins` table).
 * An existing "admin" role value in metadata is left alone so older accounts keep it.
 */
export async function grantTeacherRole(userId: string) {
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const keepRole = (user.publicMetadata as { role?: unknown }).role === "admin";
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: keepRole ? { teacher: true } : { role: "instructor", teacher: true },
  });
}
