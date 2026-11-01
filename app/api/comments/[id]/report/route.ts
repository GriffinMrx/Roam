import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { reportComment } from "@/lib/comments";
import { badId, commentIdFrom, errorResponse, guardWrite, NO_STORE } from "@/lib/comments-route";
import { REPORT_MAX } from "@/lib/comments-shared";

/** POST /api/comments/[id]/report { reason }: once per user, never on your own comment. */
const Body = z.object({ reason: z.string().trim().min(1).max(REPORT_MAX) }).strict();

export async function POST(request: NextRequest, { params }: RouteContext<"/api/comments/[id]/report">) {
  const id = await commentIdFrom(params);
  if (!id) return badId();
  const guard = await guardWrite(request, Body);
  if (!guard.ok) return guard.response;
  try {
    await reportComment(guard.userId, id, guard.body.reason);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
