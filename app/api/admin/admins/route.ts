import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { addAdmin } from "@/lib/admin-actions";
import { AdminError, adminErrorResponse, assertCanActOn, audit, guardAdminWrite, NO_STORE } from "@/lib/admin";

/*
 * POST /api/admin/admins { email } (prompts/admin-console.md): the owner makes an existing
 * account an admin. Owner only, fresh reverification, audit-logged. Removing an admin is
 * POST /api/admin/users/[id] { action: "remove-admin" }.
 */
const Body = z.object({ email: z.string().trim().toLowerCase().email().max(254) }).strict();

export async function POST(request: NextRequest) {
  const guard = await guardAdminWrite(request, Body, { ownerOnly: true, sensitive: true });
  if (!guard.ok) return guard.response;
  const { ctx, body } = guard;

  try {
    const { data } = await (await clerkClient()).users.getUserList({ emailAddress: [body.email], limit: 2 });
    // Exact match only (the filter is a partial match).
    const user = data.find((u) => u.emailAddresses.some((e) => e.emailAddress.toLowerCase() === body.email));
    if (!user) throw new AdminError(404, "No account uses that email. They need to sign up first.");
    if (user.banned) throw new AdminError(400, "That account is banned.");
    await assertCanActOn(ctx, user.id);
    if (!(await addAdmin(user.id, ctx.userId))) throw new AdminError(409, "Already an admin.");

    await audit(ctx.userId, "user.make-admin", { type: "user", id: user.id }, { email: body.email }, request);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
