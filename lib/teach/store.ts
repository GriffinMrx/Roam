import "server-only";

import { and, asc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { defineQuery } from "next-sanity";

import { getOrm } from "@/lib/db";
import {
  comments,
  teacherBookmarks,
  teacherCourses,
  teacherLessons,
  teacherModules,
  teacherProfiles,
  teacherProgress,
} from "@/lib/db/schema";
import { client } from "@/sanity/lib/client";
import {
  approvedCourseIdsNow,
  deleteReview,
  effectiveStatus,
  openReview,
  refreshReviewSnapshot,
  reviewsFor,
  type Review,
  type ReviewSnapshot,
} from "./review";
import {
  LIMITS,
  submitProblems,
  teacherCourseKey,
  teacherLessonKey,
  type CourseDraft,
  type CourseStatus,
  type ResourceDraft,
  type TeacherProfileDraft,
} from "./schema";

/*
 * Teacher courses in Neon (prompts/teachers-phase-1.md). Every function takes the acting
 * user's id from the Clerk session (never from a request body); ownership is enforced in
 * the SQL WHERE clauses. Changes that can affect public pages refresh the cache tag.
 *
 * Publishing is decided in Sanity (lib/teach/review.ts): the Neon status only records
 * whether the teacher has submitted ("draft" → "pending"); the admin's review decides
 * Published / Changes needed (prompts/onboarding-survey-review-and-phase-2.md).
 */

/** Cache tag for every public read of teacher content (lib/teach/public.ts). */
export const TEACHER_CONTENT_TAG = "teacher-content";
const refreshPublic = () => revalidateTag(TEACHER_CONTENT_TAG, { expire: 0 });

export class TeachError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/* ---------- Slugs ---------- */

const SANITY_SLUG_TAKEN = defineQuery(`count(*[_type == $type && slug.current == $slug]) > 0`);
const CATEGORY_TITLE_QUERY = defineQuery(`*[_type == "category" && slug.current == $slug][0].title`);

export function slugify(input: string) {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return base || "untitled";
}

type SlugKind = "course" | "lesson" | "instructor";

/** A slug free in both Sanity (editorial) and Neon (teacher) content: base, base-2, base-3, … */
async function uniqueSlug(kind: SlugKind, title: string, reserved: Set<string> = new Set()) {
  const orm = getOrm();
  const base = slugify(title);
  for (let n = 1; n < 200; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (reserved.has(slug)) continue;
    const table = kind === "course" ? teacherCourses : kind === "lesson" ? teacherLessons : teacherProfiles;
    const [taken] = await orm.select({ one: sql`1` }).from(table).where(eq(table.slug, slug)).limit(1);
    if (taken) continue;
    if (await client.fetch(SANITY_SLUG_TAKEN, { type: kind, slug }, { cache: "no-store" })) continue;
    reserved.add(slug);
    return slug;
  }
  throw new TeachError(409, "Couldn't find a free web address for that title. Try a different one.");
}

/* ---------- Teacher profile ---------- */

export async function getTeacherProfile(userId: string) {
  const [row] = await getOrm().select().from(teacherProfiles).where(eq(teacherProfiles.userId, userId)).limit(1);
  return row ?? null;
}

export async function saveTeacherProfile(userId: string, input: TeacherProfileDraft, photoUrl: string | null) {
  const orm = getOrm();
  const existing = await getTeacherProfile(userId);
  const values = {
    name: input.name,
    headline: input.headline,
    bio: input.bio,
    expertise: input.expertise,
    photoUrl,
    updatedAt: new Date(),
  };
  if (existing) {
    await orm.update(teacherProfiles).set(values).where(eq(teacherProfiles.userId, userId));
  } else {
    await orm.insert(teacherProfiles).values({ userId, slug: await uniqueSlug("instructor", input.name), ...values });
  }
  refreshPublic();
}

export async function requireTeacher(userId: string) {
  const profile = await getTeacherProfile(userId);
  if (!profile) throw new TeachError(403, "Become a teacher first.");
  return profile;
}

/* ---------- Owner: courses ---------- */

export async function listOwnCourses(userId: string) {
  const orm = getOrm();
  const rows = await orm
    .select({
      id: teacherCourses.id,
      title: teacherCourses.title,
      slug: teacherCourses.slug,
      submitted: sql<boolean>`${teacherCourses.status} <> 'draft'`,
      updatedAt: teacherCourses.updatedAt,
      lessonCount: sql<number>`(select count(*)::int from ${teacherLessons} where ${teacherLessons.courseId} = ${teacherCourses.id})`,
      // Teacher stats (phase 2): learners with any progress, and lessons they completed.
      students: sql<number>`(select count(distinct ${teacherProgress.userId})::int from ${teacherProgress} where ${teacherProgress.courseId} = ${teacherCourses.id})`,
      completions: sql<number>`(select count(*)::int from ${teacherProgress} where ${teacherProgress.courseId} = ${teacherCourses.id} and ${teacherProgress.completed})`,
    })
    .from(teacherCourses)
    .where(eq(teacherCourses.ownerId, userId))
    .orderBy(sql`${teacherCourses.updatedAt} desc`);
  const reviews = await reviewsFor(rows.map((r) => r.id));
  return rows.map((row) => {
    const review = reviews.get(row.id);
    return { ...row, status: effectiveStatus(row.submitted, review), reviewNote: review?.note ?? null };
  });
}

export async function createCourse(userId: string, title: string) {
  await requireTeacher(userId);
  const orm = getOrm();
  const [{ count }] = await orm
    .select({ count: sql<number>`count(*)::int` })
    .from(teacherCourses)
    .where(eq(teacherCourses.ownerId, userId));
  if (count >= LIMITS.coursesPerTeacher) {
    throw new TeachError(400, `You can have up to ${LIMITS.coursesPerTeacher} courses.`);
  }
  const [row] = await orm
    .insert(teacherCourses)
    .values({ ownerId: userId, title, slug: await uniqueSlug("course", title) })
    .returning({ id: teacherCourses.id });
  return row.id;
}

export type OwnCourse = CourseDraft & {
  id: string;
  slug: string;
  status: CourseStatus;
  reviewNote: string | null;
  /** Changes on every save; the editor remounts on it to pick up new module and lesson ids. */
  version: string;
  /** Public lesson slugs by lesson id, for "view lesson" links once published. */
  lessonSlugs: Record<string, string>;
};

/** The full course for its editor: the owner only (null otherwise). */
export async function getOwnCourse(userId: string, id: string): Promise<OwnCourse | null> {
  const orm = getOrm();
  const [course] = await orm
    .select()
    .from(teacherCourses)
    .where(and(eq(teacherCourses.id, id), eq(teacherCourses.ownerId, userId)))
    .limit(1);
  if (!course) return null;
  return assembleCourse(course, (await reviewsFor([course.id])).get(course.id));
}

async function assembleCourse(course: typeof teacherCourses.$inferSelect, review: Review | undefined): Promise<OwnCourse> {
  const orm = getOrm();
  const [modules, lessons] = await Promise.all([
    orm.select().from(teacherModules).where(eq(teacherModules.courseId, course.id)).orderBy(asc(teacherModules.position)),
    orm.select().from(teacherLessons).where(eq(teacherLessons.courseId, course.id)).orderBy(asc(teacherLessons.position)),
  ]);
  return {
    id: course.id,
    slug: course.slug,
    status: effectiveStatus(course.status !== "draft", review),
    reviewNote: review?.note ?? null,
    version: course.updatedAt.toISOString(),
    title: course.title,
    summary: course.summary,
    level: course.level as CourseDraft["level"],
    price: course.price,
    categorySlug: course.categorySlug,
    lessonSlugs: Object.fromEntries(lessons.map((l) => [l.id, l.slug])),
    modules: modules.map((m) => ({
      id: m.id,
      title: m.title,
      summary: m.summary,
      lessons: lessons
        .filter((l) => l.moduleId === m.id)
        .map((l) => ({
          id: l.id,
          title: l.title,
          summary: l.summary,
          videoUrl: l.videoUrl,
          durationSeconds: l.durationSeconds,
          freePreview: l.freePreview,
          notes: l.notes,
          keyPoints: l.keyPoints,
          proTip: l.proTip,
          resources: l.resources.map((r) => ({ ...r, type: r.type as ResourceDraft["type"] })),
        })),
    })),
  };
}

/**
 * Saves the whole course from the editor. Existing modules and lessons keep their ids
 * (and so their URLs and discussions); removed ones are deleted with their comments.
 */
export async function saveCourse(userId: string, id: string, input: CourseDraft) {
  const orm = getOrm();
  const status = await orm.transaction(async (tx) => {
    const [course] = await tx
      .select({ id: teacherCourses.id, status: teacherCourses.status })
      .from(teacherCourses)
      .where(and(eq(teacherCourses.id, id), eq(teacherCourses.ownerId, userId)))
      .for("update")
      .limit(1);
    if (!course) throw new TeachError(404, "Course not found.");

    await tx
      .update(teacherCourses)
      .set({
        title: input.title,
        summary: input.summary,
        level: input.level,
        price: input.price,
        categorySlug: input.categorySlug,
        updatedAt: new Date(),
      })
      .where(eq(teacherCourses.id, id));

    const existingModules = new Set(
      (await tx.select({ id: teacherModules.id }).from(teacherModules).where(eq(teacherModules.courseId, id))).map((m) => m.id),
    );
    const existingLessons = new Set(
      (await tx.select({ id: teacherLessons.id }).from(teacherLessons).where(eq(teacherLessons.courseId, id))).map((l) => l.id),
    );

    // Lessons that are gone: delete their discussions too (comments live in the same database).
    const keptLessons = new Set(input.modules.flatMap((m) => m.lessons.map((l) => l.id)).filter((x): x is string => !!x && existingLessons.has(x)));
    const removedLessons = [...existingLessons].filter((x) => !keptLessons.has(x));
    if (removedLessons.length) {
      await tx.delete(comments).where(inArray(comments.lessonId, removedLessons.map(teacherLessonKey)));
      await tx.delete(teacherLessons).where(inArray(teacherLessons.id, removedLessons));
    }
    const reserved = new Set<string>();
    const finalModules: string[] = [];
    for (const [mi, m] of input.modules.entries()) {
      let moduleId = m.id && existingModules.has(m.id) ? m.id : null;
      if (moduleId) {
        await tx.update(teacherModules).set({ position: mi, title: m.title, summary: m.summary }).where(eq(teacherModules.id, moduleId));
      } else {
        const [row] = await tx
          .insert(teacherModules)
          .values({ courseId: id, position: mi, title: m.title, summary: m.summary })
          .returning({ id: teacherModules.id });
        moduleId = row.id;
      }
      finalModules.push(moduleId);
      for (const [li, l] of m.lessons.entries()) {
        const fields = {
          moduleId,
          position: li,
          title: l.title,
          summary: l.summary,
          videoUrl: l.videoUrl,
          durationSeconds: l.durationSeconds,
          freePreview: l.freePreview,
          notes: l.notes.filter(Boolean),
          keyPoints: l.keyPoints.filter(Boolean),
          proTip: l.proTip,
          resources: l.resources,
        };
        if (l.id && keptLessons.has(l.id)) {
          await tx.update(teacherLessons).set(fields).where(eq(teacherLessons.id, l.id));
        } else {
          const slug = await uniqueSlug("lesson", l.title || "lesson", reserved);
          await tx.insert(teacherLessons).values({ courseId: id, slug, ...fields });
        }
      }
    }
    // Only now drop modules that are gone: any lesson moved out of them has been re-parented above.
    await tx
      .delete(teacherModules)
      .where(finalModules.length ? and(eq(teacherModules.courseId, id), notInArray(teacherModules.id, finalModules)) : eq(teacherModules.courseId, id));
    return course.status;
  });
  // Submitted courses: keep the admin's snapshot current, and refresh public pages
  // (live edits to an approved course show at once).
  if (status !== "draft") {
    const course = await getOwnCourse(userId, id);
    const profile = await getTeacherProfile(userId);
    if (course && profile) await refreshReviewSnapshot(await reviewSnapshot(course, profile));
    refreshPublic();
  }
}

/** What admins review in Studio: the course outline as it is now. */
async function reviewSnapshot(
  course: OwnCourse,
  profile: NonNullable<Awaited<ReturnType<typeof getTeacherProfile>>>,
): Promise<ReviewSnapshot> {
  const categoryTitle = course.categorySlug
    ? await client.fetch(CATEGORY_TITLE_QUERY, { slug: course.categorySlug }, { cache: "no-store" })
    : null;
  return {
    courseId: course.id,
    courseSlug: course.slug,
    title: course.title,
    summary: course.summary,
    teacherName: profile.name,
    teacherSlug: profile.slug,
    categoryTitle: categoryTitle ?? "",
    level: course.level,
    price: course.price,
    outline: course.modules.map((m) => ({
      title: m.title,
      lessons: m.lessons.map((l) => ({
        title: l.title,
        durationSeconds: l.durationSeconds,
        videoUrl: l.videoUrl,
        freePreview: l.freePreview,
      })),
    })),
  };
}

export async function submitCourse(userId: string, id: string) {
  const [course, profile] = await Promise.all([getOwnCourse(userId, id), getTeacherProfile(userId)]);
  if (!course || !profile) throw new TeachError(404, "Course not found.");
  if (course.status === "published") throw new TeachError(400, "This course is already published.");
  const problems = submitProblems(course);
  if (problems.length) throw new TeachError(400, problems[0]);
  await getOrm()
    .update(teacherCourses)
    .set({ status: "pending", submittedAt: new Date() })
    .where(and(eq(teacherCourses.id, id), eq(teacherCourses.ownerId, userId)));
  await openReview(await reviewSnapshot(course, profile));
}

/** Owner, or an admin (ownerId null): the course, its lessons, their discussions, bookmarks, and review. */
export async function deleteCourse(id: string, ownerId: string | null) {
  const orm = getOrm();
  await orm.transaction(async (tx) => {
    const [course] = await tx
      .select({ id: teacherCourses.id })
      .from(teacherCourses)
      .where(ownerId ? and(eq(teacherCourses.id, id), eq(teacherCourses.ownerId, ownerId)) : eq(teacherCourses.id, id))
      .limit(1);
    if (!course) throw new TeachError(404, "Course not found.");
    const lessons = await tx.select({ id: teacherLessons.id }).from(teacherLessons).where(eq(teacherLessons.courseId, id));
    const lessonKeys = lessons.map((l) => teacherLessonKey(l.id));
    if (lessonKeys.length) await tx.delete(comments).where(inArray(comments.lessonId, lessonKeys));
    // Progress cascades with the lessons; bookmarks hold plain ids, so remove them here.
    await tx.delete(teacherBookmarks).where(inArray(teacherBookmarks.targetId, [teacherCourseKey(id), ...lessonKeys]));
    await tx.delete(teacherCourses).where(eq(teacherCourses.id, id));
  });
  await deleteReview(id);
  refreshPublic();
}

/* ---------- Admin review (decisions are made in Sanity: lib/teach/review.ts) ---------- */

/** Submitted courses with their current decision, for /admin/courses. */
export async function reviewQueue() {
  const orm = getOrm();
  const rows = await orm
    .select({
      course: teacherCourses,
      teacherName: teacherProfiles.name,
      teacherSlug: teacherProfiles.slug,
    })
    .from(teacherCourses)
    .leftJoin(teacherProfiles, eq(teacherProfiles.userId, teacherCourses.ownerId))
    // Drafts are the teacher's private work: the queue shows submitted courses only.
    .where(sql`${teacherCourses.status} <> 'draft'`)
    .orderBy(sql`coalesce(${teacherCourses.submittedAt}, ${teacherCourses.updatedAt}) desc`)
    .limit(200);
  const reviews = await reviewsFor(rows.map((r) => r.course.id));
  const order: Record<CourseStatus, number> = { pending: 0, published: 1, rejected: 2, draft: 3 };
  const courses = await Promise.all(
    rows.map(async (r) => ({
      ...(await assembleCourse(r.course, reviews.get(r.course.id))),
      teacherName: r.teacherName ?? "Unknown teacher",
      teacherSlug: r.teacherSlug,
      submittedAt: r.course.submittedAt?.toISOString() ?? null,
    })),
  );
  return courses.sort((a, b) => order[a.status] - order[b.status]);
}

/* ---------- Lessons, for comments and access ---------- */

const uuidFromKey = (key: string) => key.slice(3);

/** Live teacher lesson by "tl-<uuid>" key, with its owner; null when unknown or not approved. */
export async function publishedLessonInfo(key: string) {
  const [row] = await getOrm()
    .select({ freePreview: teacherLessons.freePreview, ownerId: teacherCourses.ownerId, courseId: teacherCourses.id })
    .from(teacherLessons)
    .innerJoin(teacherCourses, eq(teacherCourses.id, teacherLessons.courseId))
    .where(eq(teacherLessons.id, uuidFromKey(key)))
    .limit(1);
  if (!row || !(await approvedCourseIdsNow()).includes(row.courseId)) return null;
  return row;
}

/** Owner of a teacher lesson (any status), by "tl-<uuid>" key. */
export async function lessonOwner(key: string) {
  const [row] = await getOrm()
    .select({ ownerId: teacherCourses.ownerId })
    .from(teacherLessons)
    .innerJoin(teacherCourses, eq(teacherCourses.id, teacherLessons.courseId))
    .where(eq(teacherLessons.id, uuidFromKey(key)))
    .limit(1);
  return row?.ownerId ?? null;
}

/** Every lesson key a teacher owns (their moderation scope). */
export async function ownLessonKeys(userId: string) {
  const rows = await getOrm()
    .select({ id: teacherLessons.id })
    .from(teacherLessons)
    .innerJoin(teacherCourses, eq(teacherCourses.id, teacherLessons.courseId))
    .where(eq(teacherCourses.ownerId, userId));
  return rows.map((r) => teacherLessonKey(r.id));
}

/** Titles and public slugs for teacher lesson keys (moderation lists). */
export async function teacherLessonTitles(keys: string[]) {
  const ids = keys.map(uuidFromKey);
  if (!ids.length) return [];
  const rows = await getOrm()
    .select({ id: teacherLessons.id, title: teacherLessons.title, slug: teacherLessons.slug })
    .from(teacherLessons)
    .where(inArray(teacherLessons.id, ids));
  return rows.map((r) => ({ _id: teacherLessonKey(r.id), title: r.title, slug: r.slug }));
}

/** Slugs of approved free-preview teacher lessons (the proxy lets these through signed out). */
export async function freePreviewTeacherLessonSlugs() {
  const approved = await approvedCourseIdsNow();
  if (!approved.length) return [];
  const rows = await getOrm()
    .select({ slug: teacherLessons.slug })
    .from(teacherLessons)
    .where(and(eq(teacherLessons.freePreview, true), inArray(teacherLessons.courseId, approved)));
  return rows.map((r) => r.slug);
}
