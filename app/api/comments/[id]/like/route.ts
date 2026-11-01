import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { setLike } from "@/lib/comments";
import { badId, commentIdFrom, errorResponse, guardWrite, NO_STORE } from "@/lib/comments-route";

/** POST /api/comments/[id]/like { liked }: like or unlike (signed in). */
const Body = z.object({ liked: z.boolean() }).strict();

export async function POST(request: NextRequest, { params }: RouteContext<"/api/comments/[id]/like">) {
  const id = await commentIdFrom(params);
  if (!id) return badId();
  const guard = await guardWrite(request, Body);
  if (!guard.ok) return guard.response;
  try {
    await setLike(guard.userId, id, guard.body.liked);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
