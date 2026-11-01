import { auth } from "@clerk/nextjs/server";
import { defineQuery } from "next-sanity";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { awardBadges } from "@/lib/badges";
import { isComplete, progressDocId } from "@/lib/progress";
import { readTeacherProgress, writeTeacherProgress } from "@/lib/teach/learner";
import { TEACHER_COURSE_KEY, TEACHER_LESSON_KEY } from "@/lib/teach/schema";
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
  lessonId: z.string().refine((id) => /^lesson\.[a-z0-9-]{1,120}$/.test(id) || TEACHER_LESSON_KEY.test(id)),
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

// Editorial courses ("course.…", Sanity) and teacher courses ("tc-<uuid>", Neon).
const CourseId = z.string().refine((id) => /^course\.[a-z0-9-]{1,120}$/.test(id) || TEACHER_COURSE_KEY.test(id));

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to see progress" }, { status: 401 });

  const courseId = CourseId.safeParse(request.nextUrl.searchParams.get("courseId"));
  if (!courseId.success) return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });

  const progress = TEACHER_COURSE_KEY.test(courseId.data)
    ? await readTeacherProgress(userId, courseId.data)
    : await readCourseProgress(userId, courseId.data);
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

  // Teacher lessons ("tl-…"): progress lives in Neon (phase 2).
  if (TEACHER_LESSON_KEY.test(lessonId)) {
    const result = await writeTeacherProgress(userId, lessonId, position, duration, Boolean(ended));
    if (!result) return NextResponse.json({ error: "Unknown lesson" }, { status: 404 });
    const badges = result.newlyCompleted ? await awardBadges(userId) : [];
    return NextResponse.json({ ok: true, completed: result.completed, badges });
  }

  const lesson = await client.fetch(LESSON_COURSE_QUERY, { lessonId }, { cache: "no-store" });
  if (!lesson?.courseId) return NextResponse.json({ error: "Unknown lesson" }, { status: 404 });

  const write = getWriteClient();
  const id = progressDocId(userId, lesson.courseId);
  const key = lessonId.replace(/^lesson\./, "");
  const prior = await write.fetch(PRIOR_ENTRY_QUERY, { id, key });

  const now = new Date().toISOString();
  // Once completed, a lesson stays completed (rewatching doesn't undo it).
  const completed = Boolean(prior?.completed) || isComplete(position, duration, ended);
  const newlyCompleted = completed && !prior?.completed;
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
    // Sync only when this write completes the lesson, so the badge check below sees it.
    .commit({ visibility: newlyCompleted ? "sync" : "async" });

  const badges = newlyCompleted ? await awardBadges(userId) : [];
  return NextResponse.json({ ok: true, completed, badges });
}
