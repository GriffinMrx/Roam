import "server-only";

import { eq, inArray } from "drizzle-orm";
import { defineQuery } from "next-sanity";

import { getOrm } from "@/lib/db";
import { teacherCourses, userBadges } from "@/lib/db/schema";
import { teacherCompletionStats } from "@/lib/teach/learner";
import { client } from "@/sanity/lib/client";
import { courseBadgeKey, MILESTONES, type BadgeView } from "./badges-shared";

/*
 * Badges are earned from progress on both kinds of course: editorial progress in Sanity and
 * teacher-course progress in Neon. They're stored in Neon (user_badges) so each one has an
 * earned date and is awarded (and toasted) once. Keyed by the Clerk user id from the session.
 */

const SANITY_COMPLETION_QUERY = defineQuery(`
  *[_type == "progress" && userId == $userId && defined(course->_id)] {
    "courseId": course._ref,
    "title": course->title,
    "done": count(lessons[completed == true]),
    "total": count(course->modules[].lessons[])
  }
`);
const COURSE_TITLES_QUERY = defineQuery(`*[_type == "course" && _id in $ids] { _id, title }`);

async function completion(userId: string) {
  const [sanityRows, teacher] = await Promise.all([
    client.fetch(SANITY_COMPLETION_QUERY, { userId }, { cache: "no-store" }),
    teacherCompletionStats(userId),
  ]);
  const editorialCourses = (sanityRows ?? [])
    .filter((r) => r.courseId && (r.total ?? 0) > 0 && (r.done ?? 0) >= (r.total ?? 0))
    .map((r) => r.courseId as string);
  return {
    lessons: (sanityRows ?? []).reduce((n, r) => n + (r.done ?? 0), 0) + teacher.completedLessons,
    courses: [...editorialCourses, ...teacher.completedCourses],
  };
}

/** Course titles for course badges, from Sanity and Neon. */
async function courseTitles(courseIds: string[]) {
  const editorial = courseIds.filter((id) => id.startsWith("course."));
  const teacher = courseIds.filter((id) => id.startsWith("tc-")).map((id) => id.slice(3));
  const [sanityRows, neonRows] = await Promise.all([
    editorial.length ? client.fetch(COURSE_TITLES_QUERY, { ids: editorial }, { cache: "no-store" }) : [],
    teacher.length
      ? getOrm().select({ id: teacherCourses.id, title: teacherCourses.title }).from(teacherCourses).where(inArray(teacherCourses.id, teacher))
      : [],
  ]);
  return new Map<string, string>([
    ...(sanityRows ?? []).map((r) => [r._id, r.title ?? "a course"] as [string, string]),
    ...neonRows.map((r) => [`tc-${r.id}`, r.title] as [string, string]),
  ]);
}

function titleFor(key: string, titles: Map<string, string>) {
  const milestone = MILESTONES.find((m) => m.key === key);
  if (milestone) return milestone.title;
  return `Finished ${titles.get(key.slice("course:".length)) ?? "a course"}`;
}

/**
 * Awards every badge the learner's progress has earned and isn't stored yet. Returns the
 * newly earned ones (for the toast). Cheap to call again: existing badges are skipped.
 */
export async function awardBadges(userId: string) {
  const { lessons, courses } = await completion(userId);
  const earned = [
    ...MILESTONES.filter((m) => lessons >= m.lessons && courses.length >= m.courses).map((m) => m.key),
    ...courses.map(courseBadgeKey),
  ];
  if (!earned.length) return [];
  const inserted = await getOrm()
    .insert(userBadges)
    .values(earned.map((badge) => ({ userId, badge })))
    .onConflictDoNothing()
    .returning({ badge: userBadges.badge });
  if (!inserted.length) return [];
  const titles = await courseTitles(inserted.filter((b) => b.badge.startsWith("course:")).map((b) => b.badge.slice(7)));
  return inserted.map((b) => ({ key: b.badge, title: titleFor(b.badge, titles) }));
}

/** Every milestone (earned or locked) and every earned course badge, for My Learning. */
export async function listBadges(userId: string): Promise<{ milestones: BadgeView[]; courses: BadgeView[] }> {
  // Credit progress made before badges existed.
  await awardBadges(userId);
  const rows = await getOrm().select().from(userBadges).where(eq(userBadges.userId, userId));
  const earned = new Map(rows.map((r) => [r.badge, r.earnedAt.toISOString()]));
  const courseRows = rows.filter((r) => r.badge.startsWith("course:")).sort((a, b) => b.earnedAt.getTime() - a.earnedAt.getTime());
  const titles = await courseTitles(courseRows.map((r) => r.badge.slice(7)));
  return {
    milestones: MILESTONES.map((m) => ({ key: m.key, title: m.title, description: m.description, earnedAt: earned.get(m.key) ?? null })),
    courses: courseRows.map((r) => ({
      key: r.badge,
      title: titleFor(r.badge, titles),
      description: "Course completed",
      earnedAt: r.earnedAt.toISOString(),
    })),
  };
}
