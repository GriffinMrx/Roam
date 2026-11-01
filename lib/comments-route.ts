import "server-only";

import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { CommentError } from "./comments";

/*
 * Shared guard for the comment write routes: Clerk session, same-origin (CSRF), JSON
 * body validated by a strict schema, and consistent error responses. The acting user
 * always comes from the session.
 */

export const NO_STORE = { "cache-control": "private, no-store" };
export const CommentId = z.string().uuid();

export function errorResponse(error: unknown) {
  if (error instanceof CommentError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: NO_STORE });
  }
  console.error("Comments request failed", error);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500, headers: NO_STORE });
}

type Guarded<T> = { ok: true; userId: string; body: T } | { ok: false; response: NextResponse };

export async function guardWrite<T>(request: NextRequest, schema: z.ZodType<T> | null): Promise<Guarded<T>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, response: NextResponse.json({ error: "Sign in to continue" }, { status: 401 }) };

  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (!schema) return { ok: true, userId, body: undefined as T };

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return { ok: false, response: NextResponse.json({ error: "Expected JSON" }, { status: 415 }) };
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return { ok: false, response: NextResponse.json({ error: "Invalid request" }, { status: 400 }) };
  return { ok: true, userId, body: parsed.data };
}

/** Validates the [id] route param; null when it is not a comment id. */
export async function commentIdFrom(params: Promise<{ id: string }>) {
  const parsed = CommentId.safeParse((await params).id);
  return parsed.success ? parsed.data : null;
}

export const badId = () => NextResponse.json({ error: "Not found" }, { status: 404 });
