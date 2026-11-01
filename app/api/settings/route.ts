import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { PreferencesSchema, readPreferences, writePreferences } from "@/lib/preferences";
import type { Preferences } from "@/lib/preferences-shared";

/*
 * GET  /api/settings  the signed-in learner's preferences.
 * POST /api/settings  saves them (validated) to the Clerk user's private metadata.
 * The learner always comes from the Clerk session; the Clerk secret stays on the server.
 */

const headers = { "cache-control": "private, no-store" };

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to see settings" }, { status: 401 });
  return NextResponse.json({ preferences: await readPreferences(userId) }, { headers });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to save settings" }, { status: 401 });

  // CSRF: only same-origin JSON requests.
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Expected JSON" }, { status: 415 });
  }

  const parsed = PreferencesSchema.strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings" }, { status: 400 });

  const preferences = parsed.data as Preferences;
  await writePreferences(userId, preferences);
  return NextResponse.json({ preferences }, { headers });
}
