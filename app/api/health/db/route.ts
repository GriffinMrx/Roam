import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";

/**
 * GET /api/health/db — confirms the app can reach Neon Postgres. Returns only ok/latency,
 * never connection details or error text (those stay in the server log).
 */
export async function GET() {
  const started = Date.now();
  try {
    await getDb().query("select 1");
    return NextResponse.json(
      { ok: true, latencyMs: Date.now() - started },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("Database health check failed", error);
    return NextResponse.json({ ok: false }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
