import { NextResponse, type NextRequest } from "next/server";

import { dismissReports, requireAdmin } from "@/lib/comments";
import { badId, commentIdFrom, errorResponse, guardWrite, NO_STORE } from "@/lib/comments-route";

/** POST /api/comments/[id]/reports/dismiss: admins only, clears a comment's reports. */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/comments/[id]/reports/dismiss">) {
  const id = await commentIdFrom(params);
  if (!id) return badId();
  const guard = await guardWrite(request, null);
  if (!guard.ok) return guard.response;
  try {
    await requireAdmin(guard.userId);
    await dismissReports(id);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
