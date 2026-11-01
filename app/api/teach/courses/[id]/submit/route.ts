import { NextResponse, type NextRequest } from "next/server";

import { guardWrite } from "@/lib/comments-route";
import { courseIdFrom, NO_STORE, notFound, rateLimited, teachErrorResponse } from "@/lib/teach/route";
import { requireTeacher, submitCourse } from "@/lib/teach/store";

/** POST /api/teach/courses/[id]/submit: owner sends a complete course for admin review. */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/teach/courses/[id]/submit">) {
  const id = await courseIdFrom(params);
  if (!id) return notFound();
  const guard = await guardWrite(request, null);
  if (!guard.ok) return guard.response;
  const limited = await rateLimited(guard.userId);
  if (limited) return limited;

  try {
    await requireTeacher(guard.userId);
    await submitCourse(guard.userId, id);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return teachErrorResponse(error);
  }
}
