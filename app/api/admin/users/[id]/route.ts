import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { addAdmin, deleteAccount, removeAdmin, setBanned, signOutEverywhere } from "@/lib/admin-actions";
import { AdminError, adminErrorResponse, adminNotFound, assertCanActOn, audit, guardAdminWrite, NO_STORE } from "@/lib/admin";
import { getAdminUser } from "@/lib/admin-data";
import { isAdmin } from "@/lib/roles";

/*
 * POST /api/admin/users/[id] { action, confirm? } (prompts/admin-console.md)
 *   ban | unban | sign-out              admins (not on themselves, owners, or other admins)
 *   make-admin | remove-admin | delete  owner only; delete needs confirm: "DELETE"
 * Every action needs a fresh Clerk reverification and is written to the audit log.
 */
const OWNER_ONLY = new Set(["make-admin", "remove-admin", "delete"]);

const Body = z
  .object({
    action: z.enum(["ban", "unban", "sign-out", "make-admin", "remove-admin", "delete"]),
    confirm: z.string().max(20).optional(),
  })
  .strict();

const UserId = z.string().regex(/^user_[A-Za-z0-9]{10,64}$/);

export async function POST(request: NextRequest, { params }: RouteContext<"/api/admin/users/[id]">) {
  const id = UserId.safeParse((await params).id);
  if (!id.success) return adminNotFound();

  // Owner-only actions are decided after parsing; the guard first proves the caller is an admin.
  const guard = await guardAdminWrite(request, Body, { sensitive: true });
  if (!guard.ok) return guard.response;
  const { ctx, body } = guard;
  if (OWNER_ONLY.has(body.action) && !ctx.owner) return adminNotFound();

  try {
    const target = await getAdminUser(id.data);
    if (!target) throw new AdminError(404, "User not found.");
    await assertCanActOn(ctx, id.data);

    let details: Record<string, unknown> = { name: target.row.name };
    switch (body.action) {
      case "ban":
      case "unban":
        await setBanned(id.data, body.action === "ban");
        break;
      case "sign-out":
        details = { ...details, sessions: await signOutEverywhere(id.data) };
        break;
      case "make-admin":
        if (target.row.banned) throw new AdminError(400, "Unban this account before making it an admin.");
        if (!(await addAdmin(id.data, ctx.userId))) throw new AdminError(409, "Already an admin.");
        break;
      case "remove-admin":
        if (!(await isAdmin(id.data))) throw new AdminError(409, "Not an admin.");
        await removeAdmin(id.data);
        break;
      case "delete":
        if (body.confirm !== "DELETE") throw new AdminError(400, 'Type "DELETE" to confirm.');
        details = { ...details, email: target.row.email };
        await deleteAccount(id.data);
        break;
    }

    await audit(ctx.userId, `user.${body.action}`, { type: "user", id: id.data }, details, request);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
