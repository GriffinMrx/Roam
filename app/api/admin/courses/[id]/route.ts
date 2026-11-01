import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { AdminError, adminErrorResponse, adminNotFound, audit, guardAdminWrite, NO_STORE } from "@/lib/admin";
import { decideReview, type ReviewStatus } from "@/lib/teach/review";
import { courseIdFrom } from "@/lib/teach/route";

/*
 * POST /api/admin/courses/[id] { action: approve | reject | unpublish, note? }
 * Admins only (lib/admin.ts: server-side role check, 404 for others), audit-logged. Writes the
 * decision to the course's Sanity review document, the same one the Studio Course Review
 * tool edits, so both stay in sync.
 */
const Body = z
  .object({
    action: z.enum(["approve", "reject", "unpublish"]),
    note: z.string().trim().max(1000).default(""),
  })
  .strict()
  .refine((b) => b.action === "approve" || b.note.length > 0, { message: "Add a note for the teacher" });

const STATUS: Record<"approve" | "reject" | "unpublish", ReviewStatus> = {
  approve: "approved",
  reject: "changesRequested",
  unpublish: "unpublished",
};

export async function POST(request: NextRequest, { params }: RouteContext<"/api/admin/courses/[id]">) {
  const id = await courseIdFrom(params);
  if (!id) return adminNotFound();
  const guard = await guardAdminWrite(request, Body);
  if (!guard.ok) return guard.response;

  try {
    if (!(await decideReview(id, STATUS[guard.body.action], guard.body.note))) {
      throw new AdminError(404, "This course hasn't been submitted for review.");
    }
    await audit(guard.ctx.userId, `course.${guard.body.action}`, { type: "course", id }, { note: guard.body.note }, request);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
