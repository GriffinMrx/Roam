import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { auditIfAdmin } from "@/lib/admin";
import { requireModerator, setHidden } from "@/lib/comments";
import { badId, commentIdFrom, errorResponse, guardWrite, NO_STORE } from "@/lib/comments-route";

/** POST /api/comments/[id]/hide { hidden }: admins, or the teacher who owns the lesson (checked server-side). */
const Body = z.object({ hidden: z.boolean() }).strict();

export async function POST(request: NextRequest, { params }: RouteContext<"/api/comments/[id]/hide">) {
  const id = await commentIdFrom(params);
  if (!id) return badId();
  const guard = await guardWrite(request, Body);
  if (!guard.ok) return guard.response;
  try {
    await requireModerator(guard.userId, id);
    await setHidden(id, guard.body.hidden);
    await auditIfAdmin(guard.userId, guard.body.hidden ? "comment.hide" : "comment.unhide", { type: "comment", id }, {}, request);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
