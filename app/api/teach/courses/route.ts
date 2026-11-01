import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { guardWrite } from "@/lib/comments-route";
import { NO_STORE, rateLimited, teachErrorResponse } from "@/lib/teach/route";
import { createCourse } from "@/lib/teach/store";

/** POST /api/teach/courses { title }: a teacher starts a new draft course. */
const Body = z.object({ title: z.string().trim().min(1).max(120) }).strict();

export async function POST(request: NextRequest) {
  const guard = await guardWrite(request, Body);
  if (!guard.ok) return guard.response;
  const limited = await rateLimited(guard.userId);
  if (limited) return limited;

  try {
    const id = await createCourse(guard.userId, guard.body.title);
    return NextResponse.json({ id }, { status: 201, headers: NO_STORE });
  } catch (error) {
    return teachErrorResponse(error);
  }
}
