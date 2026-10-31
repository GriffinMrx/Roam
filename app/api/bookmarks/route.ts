import { auth } from "@clerk/nextjs/server";
import { defineQuery } from "next-sanity";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { formatDuration } from "@/lib/format";
import { BOOKMARK_ID, bookmarksDocId, readBookmarkIds, readSaved } from "@/sanity/bookmarks";
import { urlFor } from "@/sanity/lib/image";
import { client } from "@/sanity/lib/client";
import { getWriteClient } from "@/sanity/lib/write-client";

/*
 * GET  /api/bookmarks  the signed-in learner's saved course and lesson ids
 *                      (?details=lessons adds the saved lessons as display rows).
 * POST /api/bookmarks  the only write path for bookmarks (AGENTS §5, §7): the learner
 * comes from the Clerk session and the write uses a server-only token.
 */

const Body = z.object({
  id: z.string().regex(BOOKMARK_ID),
  saved: z.boolean(),
});

const TARGET_QUERY = defineQuery(`
  *[_id == $id && _type in ["course", "lesson"]][0] { _id, _type }
`);

export type SavedLessonRow = {
  id: string;
  slug: string;
  title: string;
  courseTitle: string;
  /** "Lesson 3.2", or "" when the lesson isn't in a course module. */
  label: string;
  duration: string;
  freePreview: boolean;
  thumbUrl?: string;
};

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to see bookmarks" }, { status: 401 });
  const headers = { "cache-control": "private, no-store" };

  if (request.nextUrl.searchParams.get("details") !== "lessons") {
    return NextResponse.json({ ids: await readBookmarkIds(userId) }, { headers });
  }

  const [ids, saved] = await Promise.all([readBookmarkIds(userId), readSaved(userId)]);
  const lessons: SavedLessonRow[] = saved.lessons
    .filter((l): l is NonNullable<typeof l> => Boolean(l?.slug))
    .map((lesson) => {
      const modules = lesson.course?.modules ?? [];
      const m = modules.findIndex((mod) => (mod.lessonIds ?? []).includes(lesson._id));
      const n = m >= 0 ? (modules[m].lessonIds ?? []).indexOf(lesson._id) : -1;
      return {
        id: lesson._id,
        slug: lesson.slug ?? "",
        title: lesson.title ?? "",
        courseTitle: lesson.course?.title ?? "",
        label: m >= 0 && n >= 0 ? `Lesson ${m + 1}.${n + 1}` : "",
        duration: formatDuration(lesson.durationSeconds),
        freePreview: Boolean(lesson.freePreview),
        thumbUrl: lesson.course?.coverImage?.asset
          ? urlFor(lesson.course.coverImage).width(96).height(96).fit("crop").url()
          : undefined,
      };
    });
  return NextResponse.json({ ids, lessons }, { headers });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to save bookmarks" }, { status: 401 });

  // CSRF: only same-origin JSON requests.
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Expected JSON" }, { status: 415 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid bookmark" }, { status: 400 });
  const { id, saved } = parsed.data;

  // The target must exist and be the kind its id says.
  const target = await client.fetch(TARGET_QUERY, { id }, { cache: "no-store" });
  const kind = id.split(".")[0];
  if (!target || target._type !== kind) return NextResponse.json({ error: "Unknown item" }, { status: 404 });

  const docId = bookmarksDocId(userId);
  const key = id.replace(".", "-");
  const now = new Date().toISOString();

  await getWriteClient()
    .transaction()
    .createIfNotExists({ _id: docId, _type: "bookmarks", userId, items: [] })
    .patch(docId, (patch) => {
      const base = patch.setIfMissing({ items: [] }).unset([`items[_key=="${key}"]`]);
      const next = saved
        ? base.append("items", [
            { _key: key, _type: "bookmark", kind, ref: { _type: "reference", _ref: id, _weak: true }, savedAt: now },
          ])
        : base;
      return next.set({ updatedAt: now });
    })
    // Sync, so a reload or My Learning right after shows the change.
    .commit({ visibility: "sync" });

  return NextResponse.json({ ok: true, saved });
}
