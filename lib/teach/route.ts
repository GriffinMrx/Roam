import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { NO_STORE } from "@/lib/comments-route";
import { overLimit } from "@/lib/rate-limit";
import { TeachError } from "./store";

/* Shared bits for the teacher and admin course routes (app/api/teach, app/api/admin/courses). */

export { NO_STORE };

export function teachErrorResponse(error: unknown) {
  if (error instanceof TeachError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: NO_STORE });
  }
  console.error("Teaching request failed", error);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500, headers: NO_STORE });
}

export async function courseIdFrom(params: Promise<{ id: string }>) {
  const parsed = z.string().uuid().safeParse((await params).id);
  return parsed.success ? parsed.data : null;
}

export const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });

/*
 * Per-user write limit for course editing: 30 writes a minute, kept in Postgres so it holds
 * across server instances and restarts (lib/rate-limit.ts).
 */
export async function rateLimited(userId: string) {
  return (await overLimit(userId, "teach-write", 30, 60))
    ? NextResponse.json({ error: "Too many changes at once. Wait a moment and try again." }, { status: 429, headers: NO_STORE })
    : null;
}
