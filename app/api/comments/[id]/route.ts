import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { deleteOwnComment, deletePermanently, editComment, requireAdmin } from "@/lib/comments";
import { badId, commentIdFrom, errorResponse, guardWrite, NO_STORE } from "@/lib/comments-route";
import { COMMENT_MAX } from "@/lib/comments-shared";

/*
 * PATCH  /api/comments/[id] { body }       edit your own comment.
 * DELETE /api/comments/[id]                delete your own comment (soft: replies stay).
 * DELETE /api/comments/[id]?permanent=1    admins: remove it with its replies, likes, reports.
 */

const Edit = z.object({ body: z.string().trim().min(1).max(COMMENT_MAX) }).strict();

export async function PATCH(request: NextRequest, { params }: RouteContext<"/api/comments/[id]">) {
  const id = await commentIdFrom(params);
  if (!id) return badId();
  const guard = await guardWrite(request, Edit);
  if (!guard.ok) return guard.response;
  try {
    await editComment(guard.userId, id, guard.body.body);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext<"/api/comments/[id]">) {
  const id = await commentIdFrom(params);
  if (!id) return badId();
  const guard = await guardWrite(request, null);
  if (!guard.ok) return guard.response;
  try {
    if (request.nextUrl.searchParams.get("permanent") === "1") {
      await requireAdmin(guard.userId);
      await deletePermanently(id);
    } else {
      await deleteOwnComment(guard.userId, id);
    }
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
