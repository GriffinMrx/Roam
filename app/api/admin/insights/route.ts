import { NextResponse } from "next/server";

import { audit, guardAdminRead } from "@/lib/admin";
import { surveyCsv } from "@/lib/user-profile";

/** GET /api/admin/insights: onboarding answers as CSV (no user ids). Admins only, audit-logged. */
export async function GET(request: Request) {
  const guard = await guardAdminRead();
  if (!guard.ok) return guard.response;

  const csv = await surveyCsv();
  await audit(guard.ctx.userId, "survey.export", { type: "survey", id: "all" }, {}, request);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="roam-survey-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
