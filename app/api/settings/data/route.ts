import { auth } from "@clerk/nextjs/server";
import { defineQuery } from "next-sanity";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { progressDocId } from "@/lib/progress";
import { bookmarksDocId } from "@/sanity/bookmarks";
import { client } from "@/sanity/lib/client";
import { getWriteClient } from "@/sanity/lib/write-client";

/*
 * The learner's own data (AGENTS §5, §7):
 * GET  /api/settings/data  download progress and bookmarks as JSON.
 * POST /api/settings/data  { action: "reset-progress", courseId } | { action: "clear-bookmarks" }.
 * Document ids are always built from the session user id, never from the request.
 */

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reset-progress"), courseId: z.string().regex(/^course\.[a-z0-9-]{1,120}$/) }).strict(),
  z.object({ action: z.literal("clear-bookmarks") }).strict(),
]);

const EXPORT_QUERY = defineQuery(`{
  "progress": *[_type == "progress" && userId == $userId] | order(updatedAt desc) {
    "course": coalesce(course->title, course._ref),
    "lastPosition": lastPosition,
    updatedAt,
    "lessons": lessons[] {
      "lesson": coalesce(lesson->title, lesson._ref),
      position,
      duration,
      completed,
      completedAt,
      updatedAt
    }
  },
  "bookmarks": *[_id == $bookmarksId][0].items[] {
    kind,
    "item": coalesce(ref->title, ref._ref),
    savedAt
  }
}`);

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to download your data" }, { status: 401 });

  const data = await client.fetch(EXPORT_QUERY, { userId, bookmarksId: bookmarksDocId(userId) }, { cache: "no-store" });
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), ...data, bookmarks: data.bookmarks ?? [] }, null, 2);
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="roam-data.json"',
      "cache-control": "private, no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to manage your data" }, { status: 401 });

  // CSRF: only same-origin JSON requests.
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Expected JSON" }, { status: 415 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const docId =
    parsed.data.action === "reset-progress"
      ? progressDocId(userId, parsed.data.courseId)
      : bookmarksDocId(userId);

  // Deleting a document that doesn't exist is a no-op.
  await getWriteClient().delete(docId);
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
}
