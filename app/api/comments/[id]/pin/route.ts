import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { auditIfAdmin } from "@/lib/admin";
import { requireModerator, setPinned } from "@/lib/comments";
import { badId, commentIdFrom, errorResponse, guardWrite, NO_STORE } from "@/lib/comments-route";

/** POST /api/comments/[id]/pin { pinned }: admins, or the teacher who owns the lesson (checked server-side). */
const Body = z.object({ pinned: z.boolean() }).strict();

export async function POST(request: NextRequest, { params }: RouteContext<"/api/comments/[id]/pin">) {
  const id = await commentIdFrom(params);
  if (!id) return badId();
  const guard = await guardWrite(request, Body);
  if (!guard.ok) return guard.response;
  try {
    await requireModerator(guard.userId, id);
    await setPinned(id, guard.body.pinned);
    await auditIfAdmin(guard.userId, guard.body.pinned ? "comment.pin" : "comment.unpin", { type: "comment", id }, {}, request);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
