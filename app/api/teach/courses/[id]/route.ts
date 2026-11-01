import { NextResponse, type NextRequest } from "next/server";

import { guardWrite } from "@/lib/comments-route";
import { courseIdFrom, NO_STORE, notFound, rateLimited, teachErrorResponse } from "@/lib/teach/route";
import { CourseInput } from "@/lib/teach/schema";
import { deleteCourse, requireTeacher, saveCourse } from "@/lib/teach/store";

/*
 * PUT    /api/teach/courses/[id] { …course }  save the whole course from the editor.
 * DELETE /api/teach/courses/[id]              delete it, with its lessons and their comments.
 * Owner only: every query is scoped to the session user's courses.
 */

export async function PUT(request: NextRequest, { params }: RouteContext<"/api/teach/courses/[id]">) {
  const id = await courseIdFrom(params);
  if (!id) return notFound();
  const guard = await guardWrite(request, CourseInput);
  if (!guard.ok) return guard.response;
  const limited = await rateLimited(guard.userId);
  if (limited) return limited;

  try {
    await requireTeacher(guard.userId);
    await saveCourse(guard.userId, id, guard.body);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return teachErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext<"/api/teach/courses/[id]">) {
  const id = await courseIdFrom(params);
  if (!id) return notFound();
  const guard = await guardWrite(request, null);
  if (!guard.ok) return guard.response;

  try {
    await requireTeacher(guard.userId);
    await deleteCourse(id, guard.userId);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return teachErrorResponse(error);
  }
}
