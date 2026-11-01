import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { getAllCourses, imageSrc } from "@/lib/catalog";
import { getOrm } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { formatDuration, formatLevel } from "@/lib/format";
import type { RecommendedCourse, SurveyAnswers } from "@/lib/survey";

/*
 * Onboarding answers (Neon user_profiles), keyed by the Clerk user id from the session.
 * Read for recommendations and the admin insights page; written only by POST /api/onboarding.
 */

export async function getUserProfile(userId: string) {
  const [row] = await getOrm().select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return row ?? null;
}

export async function saveUserProfile(userId: string, answers: SurveyAnswers) {
  const values = {
    intent: answers.intent,
    persona: answers.persona,
    heardFrom: answers.heardFrom,
    heardFromOther: answers.heardFrom === "other" ? answers.heardFromOther || null : null,
    goals: answers.goals,
    interests: answers.interests,
    level: answers.level,
    weeklyTime: answers.weeklyTime,
    updatedAt: new Date(),
  };
  await getOrm()
    .insert(userProfiles)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: userProfiles.userId, set: values });
}

/** Up to `limit` courses for these answers: chosen topics first, then matching level, then popular. */
export async function recommendCourses(
  answers: Pick<SurveyAnswers, "interests" | "level">,
  limit = 4,
): Promise<RecommendedCourse[]> {
  const courses = await getAllCourses();
  const interests = new Set(answers.interests);
  return courses
    .filter((c) => c.slug)
    .map((c, index) => ({
      course: c,
      score:
        (interests.has(c.category?.slug ?? "") ? 10 : 0) +
        (answers.level && c.level === answers.level ? 3 : 0) +
        (c.popular ? 2 : 0) -
        index / 1000, // stable: catalog order breaks ties
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ course }) => ({
      slug: course.slug,
      title: course.title ?? "",
      summary: course.summary ?? "",
      level: formatLevel(course.level),
      duration: formatDuration(course.durationSeconds),
      category: course.category?.title ?? "",
      imageUrl: imageSrc(course.coverImage, course.coverUrl, 800, 450),
    }));
}

/* ---------- Admin insights ---------- */

type Count = { value: string; count: number };

async function countsOf(column: typeof userProfiles.persona | typeof userProfiles.heardFrom | typeof userProfiles.level | typeof userProfiles.weeklyTime | typeof userProfiles.intent) {
  const rows = await getOrm()
    .select({ value: sql<string>`coalesce(${column}, '')`, count: sql<number>`count(*)::int` })
    .from(userProfiles)
    .groupBy(sql`1`)
    .orderBy(sql`2 desc`);
  return rows as Count[];
}

async function arrayCounts(column: typeof userProfiles.goals | typeof userProfiles.interests) {
  const rows = await getOrm()
    .select({ value: sql<string>`v`, count: sql<number>`count(*)::int` })
    .from(sql`${userProfiles}, unnest(${column}) as v`)
    .groupBy(sql`v`)
    .orderBy(sql`2 desc`);
  return rows as Count[];
}

/** Totals per answer for /admin/insights. Aggregates only: no ids, names, or emails. */
export async function surveyInsights() {
  const orm = getOrm();
  const [[{ total }], intent, persona, heardFrom, level, weeklyTime, goals, interests, weekly, others] = await Promise.all([
    orm.select({ total: sql<number>`count(*)::int` }).from(userProfiles),
    countsOf(userProfiles.intent),
    countsOf(userProfiles.persona),
    countsOf(userProfiles.heardFrom),
    countsOf(userProfiles.level),
    countsOf(userProfiles.weeklyTime),
    arrayCounts(userProfiles.goals),
    arrayCounts(userProfiles.interests),
    orm
      .select({
        week: sql<string>`to_char(date_trunc('week', ${userProfiles.createdAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(userProfiles)
      .groupBy(sql`1`)
      .orderBy(sql`1 desc`)
      .limit(12),
    orm
      .select({ text: userProfiles.heardFromOther })
      .from(userProfiles)
      .where(sql`${userProfiles.heardFromOther} is not null`)
      .orderBy(desc(userProfiles.createdAt))
      .limit(30),
  ]);
  return {
    total,
    intent,
    persona,
    heardFrom,
    level,
    weeklyTime,
    goals,
    interests,
    weekly,
    heardFromOther: others.map((o) => o.text ?? "").filter(Boolean),
  };
}

/** Every response as CSV rows (answers and dates only, no user ids, names, or emails). */
export async function surveyCsv() {
  const rows = await getOrm().select().from(userProfiles).orderBy(desc(userProfiles.createdAt));
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = ["created_at", "intent", "persona", "heard_from", "heard_from_other", "goals", "interests", "level", "weekly_time"];
  const lines = rows.map((r) =>
    [
      r.createdAt.toISOString(),
      r.intent,
      r.persona ?? "",
      r.heardFrom ?? "",
      r.heardFromOther ?? "",
      r.goals.join("; "),
      r.interests.join("; "),
      r.level ?? "",
      r.weeklyTime ?? "",
    ]
      .map(cell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}
