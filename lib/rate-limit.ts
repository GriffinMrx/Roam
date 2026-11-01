import "server-only";

import { getDb } from "@/lib/db";

/*
 * Write limits kept in Postgres (prompts/admin-charts-and-hardening.md), so they hold across
 * server instances and restarts, unlike the in-memory counters they replace. The user id
 * always comes from the Clerk session, never from the request.
 */

export type Bucket = "admin-write" | "teach-write";

/**
 * Records one write and says whether the user is over `limit` writes in the last `windowSeconds`.
 * One statement: it counts the recent rows and inserts a new one only while under the limit.
 */
export async function overLimit(userId: string, bucket: Bucket, limit: number, windowSeconds: number) {
  const { rows } = await getDb().query<{ n: number }>(
    `with recent as (
       select count(*)::int as n from rate_events
       where user_id = $1 and bucket = $2 and created_at > now() - make_interval(secs => $3)
     ), added as (
       insert into rate_events (user_id, bucket) select $1, $2 where (select n from recent) < $4 returning 1
     )
     select n from recent`,
    [userId, bucket, windowSeconds, limit],
  );
  // Now and then, drop rows no window looks at any more.
  if (Math.random() < 0.02) {
    void getDb()
      .query(`delete from rate_events where created_at < now() - interval '1 day'`)
      .catch((error) => console.error("Pruning rate_events failed", error));
  }
  return (rows[0]?.n ?? 0) >= limit;
}
