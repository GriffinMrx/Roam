import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin, setHidden } from "@/lib/comments";
import { badId, commentIdFrom, errorResponse, guardWrite, NO_STORE } from "@/lib/comments-route";

/** POST /api/comments/[id]/hide { hidden }: admins only (role checked server-side). */
const Body = z.object({ hidden: z.boolean() }).strict();

export async function POST(request: NextRequest, { params }: RouteContext<"/api/comments/[id]/hide">) {
  const id = await commentIdFrom(params);
  if (!id) return badId();
  const guard = await guardWrite(request, Body);
  if (!guard.ok) return guard.response;
  try {
    await requireAdmin(guard.userId);
    await setHidden(id, guard.body.hidden);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
