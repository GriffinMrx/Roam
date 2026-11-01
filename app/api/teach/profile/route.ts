import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { guardWrite } from "@/lib/comments-route";
import { grantTeacherRole } from "@/lib/roles";
import { NO_STORE, rateLimited, teachErrorResponse } from "@/lib/teach/route";
import { TeacherProfileInput } from "@/lib/teach/schema";
import { getTeacherProfile, saveTeacherProfile } from "@/lib/teach/store";

/**
 * GET /api/teach/profile → { teacher }: whether the signed-in user has a teacher profile.
 * The navbar pill asks this so "Create Course" shows only for real teachers (the profile
 * row is the truth, not Clerk metadata).
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in" }, { status: 401, headers: NO_STORE });
  return NextResponse.json({ teacher: (await getTeacherProfile(userId)) !== null }, { headers: NO_STORE });
}

/*
 * POST /api/teach/profile { name, headline, bio, expertise }: become a teacher, or update
 * your teacher profile. The user comes from the Clerk session; the photo is their Clerk
 * avatar. Sets the Clerk role to "instructor" (never touches an admin).
 */
export async function POST(request: NextRequest) {
  const guard = await guardWrite(request, TeacherProfileInput);
  if (!guard.ok) return guard.response;
  const limited = await rateLimited(guard.userId);
  if (limited) return limited;

  try {
    const user = await currentUser();
    await saveTeacherProfile(guard.userId, guard.body, user?.imageUrl ?? null);
    await grantTeacherRole(guard.userId);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return teachErrorResponse(error);
  }
}
