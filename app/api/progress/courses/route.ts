import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { readCoursePercents } from "@/sanity/progress";

/*
 * GET /api/progress/courses  the signed-in learner's % complete per started course,
 * for progress bars on catalog cards. Read-only; the learner comes from the Clerk session.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to see progress" }, { status: 401 });

  const percents = await readCoursePercents(userId);
  return NextResponse.json({ percents }, { headers: { "cache-control": "private, no-store" } });
}
