import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { and, eq, gte, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { defineQuery } from "next-sanity";

import { getOrm } from "@/lib/db";
import { comments, teacherProfiles, teacherProgress } from "@/lib/db/schema";
import { client } from "@/sanity/lib/client";

/*
 * Daily series for the admin Overview charts (prompts/admin-charts-and-hardening.md).
 * Aggregates only (no names, emails or ids). Days are UTC. Each series covers the chosen range,
 * and the period before it is counted too so the tiles can show the change. Callers must have
 * passed requireAdminPage first.
 */

const DAY = 86_400_000;

export const RANGES = [7, 30, 90] as const;
export type RangeDays = (typeof RANGES)[number];

/** Allow-listed ?range= value; anything else is 30 days. */
export function parseRange(value: unknown): RangeDays {
  const n = Number(value);
  return (RANGES as readonly number[]).includes(n) ? (n as RangeDays) : 30;
}

export type DayPoint = { day: string; value: number };
export type Series = { points: DayPoint[]; total: number; previous: number; partial?: boolean };

const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Midnight UTC `days` days before today's midnight (today counts as one of the days). */
function startOf(days: number) {
  const today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  return today - (days - 1) * DAY;
}

/** Fills every day of the range (zeros included) and splits the counts into this and the previous period. */
function toSeries(counts: Map<string, number>, range: RangeDays): Series {
  const start = startOf(range);
  const points: DayPoint[] = [];
  let total = 0;
  for (let i = 0; i < range; i++) {
    const day = dayKey(start + i * DAY);
    const value = counts.get(day) ?? 0;
    total += value;
    points.push({ day, value });
  }
  const prevStart = dayKey(start - range * DAY);
  const curStart = dayKey(start);
  let previous = 0;
  for (const [day, n] of counts) if (day >= prevStart && day < curStart) previous += n;
  return { points, total, previous };
}

const merge = (...maps: Map<string, number>[]) => {
  const out = new Map<string, number>();
  for (const m of maps) for (const [k, v] of m) out.set(k, (out.get(k) ?? 0) + v);
  return out;
};

/** One grouped statement per table: counts per UTC day since `since`. */
async function perDay(column: PgColumn, since: Date, where?: SQL) {
  const day = sql<string>`to_char(date_trunc('day', ${column} at time zone 'UTC'), 'YYYY-MM-DD')`;
  const rows = await getOrm()
    .select({ day, n: sql<number>`count(*)::int` })
    .from(column.table)
    .where(where ? and(gte(column, since), where) : gte(column, since))
    .groupBy(day);
  return new Map(rows.map((r) => [r.day, r.n]));
}

const SANITY_COMPLETIONS_QUERY = defineQuery(
  `*[_type == "progress"].lessons[completed == true && completedAt >= $since].completedAt`,
);

/** Editorial (Sanity) lesson completions per day. */
async function sanityCompletions(since: Date) {
  const stamps = await client.fetch(SANITY_COMPLETIONS_QUERY, { since: since.toISOString() }, { cache: "no-store" });
  const counts = new Map<string, number>();
  for (const s of (stamps ?? []) as (string | null)[]) {
    if (!s) continue;
    const day = s.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return counts;
}

const SIGNUP_CAP = 2000;

/**
 * Sign-ups per day from Clerk. Totals come from Clerk's counts (exact); the daily bars page
 * through at most SIGNUP_CAP users, and the series is marked partial past that.
 */
async function signups(range: RangeDays): Promise<Series> {
  const clerk = await clerkClient();
  const start = startOf(range);
  const prevStart = start - range * DAY;
  const [total, previous] = await Promise.all([
    clerk.users.getUserList({ createdAtAfter: start, limit: 1 }).then((r) => r.totalCount),
    clerk.users.getUserList({ createdAtAfter: prevStart, createdAtBefore: start, limit: 1 }).then((r) => r.totalCount),
  ]);
  const counts = new Map<string, number>();
  for (let offset = 0; offset < Math.min(total, SIGNUP_CAP); offset += 500) {
    const page = await clerk.users.getUserList({ createdAtAfter: start, limit: 500, offset, orderBy: "-created_at" });
    for (const u of page.data) {
      const day = dayKey(u.createdAt);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    if (page.data.length < 500) break;
  }
  const series = toSeries(counts, range);
  return { ...series, total, previous, partial: total > SIGNUP_CAP };
}

export async function overviewSeries(range: RangeDays) {
  const since = new Date(startOf(range) - range * DAY);
  const [signupSeries, commentCounts, teacherDone, editorialDone, teacherCounts] = await Promise.all([
    signups(range),
    perDay(comments.createdAt, since),
    perDay(teacherProgress.completedAt, since, eq(teacherProgress.completed, true)),
    sanityCompletions(since),
    perDay(teacherProfiles.createdAt, since),
  ]);
  return {
    signups: signupSeries,
    comments: toSeries(commentCounts, range),
    completions: toSeries(merge(teacherDone, editorialDone), range),
    newTeachers: toSeries(teacherCounts, range),
  };
}
