import { defineConfig } from "drizzle-kit";

/*
 * Drizzle Kit (schema → SQL migrations in /drizzle). Migrations use the DIRECT connection
 * (DATABASE_URL_UNPOOLED), per the Neon skill: pooled connections drop session state.
 * Test on a Neon branch first by setting DATABASE_URL_UNPOOLED for that command only.
 */
const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("Set DATABASE_URL_UNPOOLED (direct Neon connection) to run migrations.");

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
});
