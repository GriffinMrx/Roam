import "server-only";

import { auth, clerkClient, reverificationErrorResponse } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getOrm } from "@/lib/db";
import { adminAudit } from "@/lib/db/schema";
import { isAdmin, isOwner } from "@/lib/roles";
import { overLimit } from "@/lib/rate-limit";

/*
 * Admin console guards (prompts/admin-console.md). Every admin page and route goes through
 * here; nothing is decided in the browser.
 *  - Admin = owner (server env) or a row in `admins`, re-read on every request.
 *  - Non-admins get a 404, so the console's existence isn't revealed.
 *  - Optional: ADMIN_REQUIRE_MFA=true blocks admins without two-factor auth.
 *  - Sensitive writes need a fresh Clerk reverification (password / 2FA within 10 minutes).
 *  - Writes are same-origin JSON with a strict schema, rate limited, and audit-logged.
 */

export const NO_STORE = { "cache-control": "private, no-store" };

export type AdminContext = { userId: string; owner: boolean; mfa: boolean; mfaRequired: boolean };

const mfaRequired = () => process.env.ADMIN_REQUIRE_MFA === "true";

async function contextFor(userId: string): Promise<AdminContext | null> {
  if (!(await isAdmin(userId))) return null;
  const user = await (await clerkClient()).users.getUser(userId);
  return { userId, owner: isOwner(userId), mfa: user.twoFactorEnabled, mfaRequired: mfaRequired() };
}

/** Pages: the signed-in admin, or a 404 for everyone else. */
export async function requireAdminPage(path: string, opts: { ownerOnly?: boolean } = {}): Promise<AdminContext> {
  const { userId } = await auth();
  if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent(path)}`);
  const ctx = await contextFor(userId);
  if (!ctx || (opts.ownerOnly && !ctx.owner)) notFound();
  return ctx;
}

/** True when the console must stay closed until the admin turns on 2FA. */
export const blockedByMfa = (ctx: AdminContext) => ctx.mfaRequired && !ctx.mfa;

/* ---------- Routes ---------- */

export class AdminError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });
export const adminNotFound = () => json({ error: "Not found" }, 404);

export function adminErrorResponse(error: unknown) {
  if (error instanceof AdminError) return json({ error: error.message }, error.status);
  console.error("Admin request failed", error);
  return json({ error: "Something went wrong." }, 500);
}

/* Per-admin write limit: 30 a minute, kept in Postgres so it holds across instances (lib/rate-limit.ts). */
const rateLimited = (userId: string) => overLimit(userId, "admin-write", 30, 60);

type Guarded<T> = { ok: true; ctx: AdminContext; body: T; request: NextRequest } | { ok: false; response: Response };

/**
 * Admin write guard: session, admin (else 404), owner when asked, 2FA when required,
 * same-origin JSON, strict schema, rate limit, and step-up reverification for sensitive writes.
 */
export async function guardAdminWrite<T>(
  request: NextRequest,
  schema: z.ZodType<T>,
  opts: { ownerOnly?: boolean; sensitive?: boolean } = {},
): Promise<Guarded<T>> {
  const { userId, has } = await auth();
  if (!userId) return { ok: false, response: json({ error: "Sign in to continue" }, 401) };
  const ctx = await contextFor(userId);
  if (!ctx || (opts.ownerOnly && !ctx.owner)) return { ok: false, response: adminNotFound() };
  if (blockedByMfa(ctx)) return { ok: false, response: json({ error: "Turn on two-factor authentication first." }, 403) };

  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) {
    return { ok: false, response: json({ error: "Forbidden" }, 403) };
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return { ok: false, response: json({ error: "Expected JSON" }, 415) };
  }
  if (await rateLimited(userId)) return { ok: false, response: json({ error: "Too many actions. Wait a minute." }, 429) };

  // Step-up: Clerk asks for the password / 2FA again if the last verification is over 10 minutes old.
  if (opts.sensitive && !has({ reverification: "strict" })) {
    return { ok: false, response: reverificationErrorResponse("strict") };
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return { ok: false, response: json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, 400) };
  return { ok: true, ctx, body: parsed.data, request };
}

/** Admin read guard for GET routes: the admin context or a 404 / 401 response. */
export async function guardAdminRead(opts: { ownerOnly?: boolean } = {}): Promise<{ ok: true; ctx: AdminContext } | { ok: false; response: Response }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, response: json({ error: "Sign in to continue" }, 401) };
  const ctx = await contextFor(userId);
  if (!ctx || (opts.ownerOnly && !ctx.owner)) return { ok: false, response: adminNotFound() };
  if (blockedByMfa(ctx)) return { ok: false, response: json({ error: "Turn on two-factor authentication first." }, 403) };
  return { ok: true, ctx };
}

/* ---------- Hierarchy ---------- */

/**
 * Who may act on whom: never yourself, never an owner, and only the owner acts on admins.
 * Throws a 403 AdminError otherwise.
 */
export async function assertCanActOn(ctx: AdminContext, targetId: string) {
  if (targetId === ctx.userId) throw new AdminError(403, "You can't do this to your own account.");
  if (isOwner(targetId)) throw new AdminError(403, "The owner account can't be changed here.");
  if (!ctx.owner && (await isAdmin(targetId))) throw new AdminError(403, "Only the owner can act on another admin.");
}

/* ---------- Audit ---------- */

export type AuditTarget = { type: "user" | "admin" | "course" | "comment" | "survey"; id: string };

/** Appends an audit entry (the table rejects updates and deletes at the database level). */
export async function audit(
  actorId: string,
  action: string,
  target: AuditTarget,
  details: Record<string, unknown> = {},
  request?: Request,
) {
  const ip = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request?.headers.get("x-real-ip") || null;
  await getOrm()
    .insert(adminAudit)
    .values({
      actorId,
      action,
      targetType: target.type,
      targetId: target.id,
      details,
      ip: ip?.slice(0, 64) ?? null,
      userAgent: request?.headers.get("user-agent")?.slice(0, 300) ?? null,
    });
}

/** Audits an admin moderation action taken through a shared route (comments, courses). */
export async function auditIfAdmin(userId: string, action: string, target: AuditTarget, details: Record<string, unknown>, request: Request) {
  if (await isAdmin(userId)) await audit(userId, action, target, details, request);
}
