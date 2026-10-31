import { auth } from "@clerk/nextjs/server";
import { defineQuery } from "next-sanity";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { isComplete, progressDocId } from "@/lib/progress";
import { client } from "@/sanity/lib/client";
import { readCourseProgress } from "@/sanity/progress";
import { getWriteClient } from "@/sanity/lib/write-client";

/*
 * GET  /api/progress?courseId=…  the signed-in learner's progress in one course.
 * POST /api/progress             the only write path for learner progress (AGENTS §5, §7).
 * The learner comes from the Clerk session, the course is derived from the lesson
 * on the server, and the write uses a server-only token.
 */

const Body = z.object({
  lessonId: z.string().regex(/^lesson\.[a-z0-9-]{1,120}$/),
  position: z.number().finite().min(0).max(86_400),
  duration: z.number().finite().min(1).max(86_400),
  ended: z.boolean().optional(),
});

const LESSON_COURSE_QUERY = defineQuery(`
  *[_type == "lesson" && _id == $lessonId][0] {
    _id,
    "courseId": *[_type == "course" && references(^._id)][0]._id
  }
`);

const PRIOR_ENTRY_QUERY = defineQuery(`
  *[_id == $id][0].lessons[_key == $key][0] { completed, completedAt }
`);

const CourseId = z.string().regex(/^course\.[a-z0-9-]{1,120}$/);

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to see progress" }, { status: 401 });

  const courseId = CourseId.safeParse(request.nextUrl.searchParams.get("courseId"));
  if (!courseId.success) return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });

  const progress = await readCourseProgress(userId, courseId.data);
  return NextResponse.json(progress, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to save progress" }, { status: 401 });

  // CSRF: only same-origin JSON requests.
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Expected JSON" }, { status: 415 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid progress" }, { status: 400 });
  const { lessonId, duration, ended } = parsed.data;
  const position = Math.min(parsed.data.position, duration);

  const lesson = await client.fetch(LESSON_COURSE_QUERY, { lessonId }, { cache: "no-store" });
  if (!lesson?.courseId) return NextResponse.json({ error: "Unknown lesson" }, { status: 404 });

  const write = getWriteClient();
  const id = progressDocId(userId, lesson.courseId);
  const key = lessonId.replace(/^lesson\./, "");
  const prior = await write.fetch(PRIOR_ENTRY_QUERY, { id, key });

  const now = new Date().toISOString();
  // Once completed, a lesson stays completed (rewatching doesn't undo it).
  const completed = Boolean(prior?.completed) || isComplete(position, duration, ended);
  const lessonRef = { _type: "reference", _ref: lessonId, _weak: true } as const;

  await write
    .transaction()
    .createIfNotExists({
      _id: id,
      _type: "progress",
      userId,
      course: { _type: "reference", _ref: lesson.courseId, _weak: true },
      lessons: [],
    })
    .patch(id, (patch) =>
      patch
        .setIfMissing({ lessons: [] })
        .unset([`lessons[_key=="${key}"]`])
        .append("lessons", [
          {
            _key: key,
            _type: "lessonProgress",
            lesson: lessonRef,
            position,
            duration,
            completed,
            ...(completed ? { completedAt: prior?.completedAt ?? now } : {}),
            updatedAt: now,
          },
        ])
        .set({ lastLesson: lessonRef, lastPosition: position, updatedAt: now }),
    )
    .commit({ visibility: "async" });

  return NextResponse.json({ ok: true, completed });
}
