import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

import { DEFAULT_PREFERENCES, PLAYBACK_RATES, type Preferences } from "./preferences-shared";

/*
 * Learner preferences, stored in the Clerk user's private metadata: readable and
 * writable only with the server secret key, never by the browser (AGENTS §5, §12).
 */

export const PreferencesSchema = z.object({
  playbackRate: z.union(PLAYBACK_RATES.map((rate) => z.literal(rate)) as [z.ZodLiteral<number>, ...z.ZodLiteral<number>[]]),
  captions: z.boolean(),
  resume: z.boolean(),
});

/** Stored values merged over the defaults; anything invalid falls back to the defaults. */
export async function readPreferences(userId: string): Promise<Preferences> {
  const user = await (await clerkClient()).users.getUser(userId);
  const stored = (user.privateMetadata as { preferences?: unknown }).preferences;
  const parsed = PreferencesSchema.safeParse({ ...DEFAULT_PREFERENCES, ...(stored as object | undefined) });
  return parsed.success ? (parsed.data as Preferences) : DEFAULT_PREFERENCES;
}

export async function writePreferences(userId: string, preferences: Preferences) {
  // Deep-merges into private metadata; other private keys are untouched.
  await (await clerkClient()).users.updateUserMetadata(userId, { privateMetadata: { preferences } });
}
