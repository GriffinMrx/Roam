import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { canModerateLesson, createComment, getLessonAccess, listThread } from "@/lib/comments";
import { errorResponse, guardWrite, NO_STORE } from "@/lib/comments-route";
import { COMMENT_MAX } from "@/lib/comments-shared";
import { TEACHER_LESSON_KEY } from "@/lib/teach/schema";

/*
 * GET  /api/comments?lessonId=…&sort=top|new  a lesson's discussion. Readable by anyone
 *      who can open the lesson: signed in, or signed out on a free-preview lesson.
 * POST /api/comments { lessonId, body, parentId? }  post a comment or reply (signed in).
 */

// Sanity lessons ("lesson.…") and teacher lessons ("tl-<uuid>", prompts/teachers-phase-1.md)
const LessonId = z.string().refine((id) => /^lesson\.[a-z0-9-]{1,120}$/.test(id) || TEACHER_LESSON_KEY.test(id));

export async function GET(request: NextRequest) {
  const lessonId = LessonId.safeParse(request.nextUrl.searchParams.get("lessonId"));
  if (!lessonId.success) return NextResponse.json({ error: "Invalid lesson" }, { status: 400 });
  const sort = request.nextUrl.searchParams.get("sort") === "new" ? "new" : "top";

  try {
    const { userId } = await auth();
    const lesson = await getLessonAccess(lessonId.data);
    if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    if (!userId && !lesson.freePreview) {
      return NextResponse.json({ error: "Sign in to read the discussion" }, { status: 401 });
    }

    // Moderators (admins, or the teacher who owns this lesson) also see hidden comments and reports.
    const isAdmin = userId ? await canModerateLesson(userId, lessonId.data) : false;
    const thread = await listThread(lessonId.data, userId, isAdmin, sort);
    return NextResponse.json(thread, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}

const Post = z
  .object({
    lessonId: LessonId,
    body: z.string().trim().min(1).max(COMMENT_MAX),
    parentId: z.string().uuid().optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  const guard = await guardWrite(request, Post);
  if (!guard.ok) return guard.response;
  const { lessonId, body, parentId } = guard.body;

  try {
    if (!(await getLessonAccess(lessonId))) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    const id = await createComment(guard.userId, lessonId, body, parentId);
    return NextResponse.json({ id }, { status: 201, headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
