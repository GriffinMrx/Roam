import "server-only";

import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

/*
 * Neon Postgres for app data that isn't editorial content (AGENTS §5: server only).
 * Uses node-postgres over the pooled connection string (DATABASE_URL, the -pooler
 * host), per the Neon skill for Next.js on Vercel. attachDatabasePool lets Vercel Fluid
 * compute close idle clients before a function suspends; elsewhere it is a no-op.
 * Migrations must use DATABASE_URL_UNPOOLED instead (session features don't survive pooling).
 */

const globalForDb = globalThis as unknown as { pgPool?: Pool; orm?: NodePgDatabase<typeof schema> };

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing environment variable: DATABASE_URL");
  // pg already treats Neon's sslmode=require as verify-full (full certificate checks);
  // saying so explicitly keeps that behavior and silences pg's alias warning.
  const connectionString = url.replace(/([?&]sslmode=)(require|prefer|verify-ca)/, "$1verify-full");
  const pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 10_000 });
  attachDatabasePool(pool);
  return pool;
}

/** One pool per server process (reused across dev hot reloads). */
export function getDb() {
  globalForDb.pgPool ??= createPool();
  return globalForDb.pgPool;
}

/** Typed Drizzle queries over the same pool. */
export function getOrm() {
  globalForDb.orm ??= drizzle(getDb(), { schema });
  return globalForDb.orm;
}
