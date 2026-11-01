import { NextResponse, type NextRequest } from "next/server";

import { auditIfAdmin } from "@/lib/admin";
import { dismissReports, requireModerator } from "@/lib/comments";
import { badId, commentIdFrom, errorResponse, guardWrite, NO_STORE } from "@/lib/comments-route";

/** POST /api/comments/[id]/reports/dismiss: moderators (admins, or the lesson's teacher) clear a comment's reports. */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/comments/[id]/reports/dismiss">) {
  const id = await commentIdFrom(params);
  if (!id) return badId();
  const guard = await guardWrite(request, null);
  if (!guard.ok) return guard.response;
  try {
    await requireModerator(guard.userId, id);
    await dismissReports(id);
    await auditIfAdmin(guard.userId, "comment.dismiss-reports", { type: "comment", id }, {}, request);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
