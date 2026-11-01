import { NextResponse, type NextRequest } from "next/server";

import { guardWrite, NO_STORE } from "@/lib/comments-route";
import { markOnboarded } from "@/lib/roles";
import { SurveyInput } from "@/lib/survey";
import { recommendCourses, saveUserProfile } from "@/lib/user-profile";

/*
 * POST /api/onboarding { …survey answers }: saves the signed-in user's onboarding answers
 * (Clerk session, same-origin, strict Zod) and returns course recommendations for them.
 */
export async function POST(request: NextRequest) {
  const guard = await guardWrite(request, SurveyInput);
  if (!guard.ok) return guard.response;

  try {
    await saveUserProfile(guard.userId, guard.body);
    await markOnboarded(guard.userId);
    const recommendations = await recommendCourses(guard.body);
    return NextResponse.json({ ok: true, recommendations }, { headers: NO_STORE });
  } catch (error) {
    console.error("Onboarding save failed", error);
    return NextResponse.json({ error: "Couldn't save your answers." }, { status: 500, headers: NO_STORE });
  }
}
