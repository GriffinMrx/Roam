import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { getOrm } from "@/lib/db";
import { teacherBookmarks, teacherCourses, teacherLessons, teacherModules, teacherProgress } from "@/lib/db/schema";
import { EMPTY_PROGRESS, isComplete, type CourseProgress } from "@/lib/progress";
import { parseVideoUrl, youtubeThumbnail } from "@/lib/video";
import { approvedCourseIdsNow } from "./review";
import { TEACHER_COURSE_KEY, TEACHER_LESSON_KEY, teacherCourseKey, teacherLessonKey } from "./schema";
import { publishedLessonInfo } from "./store";

/*
 * Learner state on teacher courses (phase 2, prompts/onboarding-survey-review-and-phase-2.md):
 * progress and bookmarks in Neon, keyed by the Clerk user id from the session. Editorial
 * courses keep theirs in Sanity; these functions return the same shapes, so the progress
 * UI, My Learning, and saved lists work for both.
 */

const uuidOf = (key: string) => key.slice(3);
const NO_IMAGE: { _type: "image"; asset?: undefined } = { _type: "image" };

function coverFrom(lessons: { videoUrl: string }[]) {
  for (const lesson of lessons) {
    const video = parseVideoUrl(lesson.videoUrl);
    if (video?.provider === "youtube") return youtubeThumbnail(video.id);
  }
  return undefined;
}

/* ---------- Progress ---------- */

/** One learner's progress in one teacher course ("tc-<uuid>"). */
export async function readTeacherProgress(userId: string, courseKey: string): Promise<CourseProgress> {
  if (!TEACHER_COURSE_KEY.test(courseKey)) return EMPTY_PROGRESS;
  const rows = await getOrm()
    .select()
    .from(teacherProgress)
    .where(and(eq(teacherProgress.userId, userId), eq(teacherProgress.courseId, uuidOf(courseKey))))
    .orderBy(desc(teacherProgress.updatedAt));
  if (!rows.length) return EMPTY_PROGRESS;
  return {
    lessons: Object.fromEntries(
      rows.map((r) => [teacherLessonKey(r.lessonId), { position: r.position, duration: r.duration, completed: r.completed }]),
    ),
    lastLessonId: teacherLessonKey(rows[0].lessonId),
    lastPosition: rows[0].position,
  };
}

/** Saves watch progress on a live teacher lesson; once completed, it stays completed. */
export async function writeTeacherProgress(userId: string, lessonKey: string, position: number, duration: number, ended: boolean) {
  const info = TEACHER_LESSON_KEY.test(lessonKey) ? await publishedLessonInfo(lessonKey) : null;
  if (!info) return null;
  const orm = getOrm();
  const lessonId = uuidOf(lessonKey);
  const [prior] = await orm
    .select({ completed: teacherProgress.completed })
    .from(teacherProgress)
    .where(and(eq(teacherProgress.userId, userId), eq(teacherProgress.lessonId, lessonId)))
    .limit(1);
  const completed = Boolean(prior?.completed) || isComplete(position, duration, ended);
  const now = new Date();
  await orm
    .insert(teacherProgress)
    .values({ userId, lessonId, courseId: info.courseId, position, duration, completed, completedAt: completed ? now : null, updatedAt: now })
    .onConflictDoUpdate({
      target: [teacherProgress.userId, teacherProgress.lessonId],
      set: {
        position,
        duration,
        completed,
        completedAt: sql`coalesce(${teacherProgress.completedAt}, ${completed ? now : null})`,
        updatedAt: now,
      },
    });
  return { completed, newlyCompleted: completed && !prior?.completed };
}

/** Totals for badges: completed lessons, and courses with every lesson completed. */
export async function teacherCompletionStats(userId: string) {
  const rows = await getOrm()
    .select({
      courseId: teacherProgress.courseId,
      done: sql<number>`count(*) filter (where ${teacherProgress.completed})::int`,
      total: sql<number>`(select count(*)::int from ${teacherLessons} where ${teacherLessons.courseId} = ${teacherProgress.courseId})`,
    })
    .from(teacherProgress)
    .where(eq(teacherProgress.userId, userId))
    .groupBy(teacherProgress.courseId);
  return {
    completedLessons: rows.reduce((n, r) => n + r.done, 0),
    completedCourses: rows.filter((r) => r.total > 0 && r.done >= r.total).map((r) => teacherCourseKey(r.courseId)),
  };
}

/** Progress "documents" in the shape My Learning reads from Sanity (sanity/my-learning.ts). */
export async function teacherLearningDocs(userId: string) {
  const orm = getOrm();
  const progress = await orm
    .select()
    .from(teacherProgress)
    .where(eq(teacherProgress.userId, userId))
    .orderBy(desc(teacherProgress.updatedAt));
  const approved = new Set(await approvedCourseIdsNow());
  const courseIds = [...new Set(progress.map((p) => p.courseId))].filter((id) => approved.has(id));
  if (!courseIds.length) return [];
  const [courses, modules, lessons] = await Promise.all([
    orm.select().from(teacherCourses).where(inArray(teacherCourses.id, courseIds)),
    orm.select().from(teacherModules).where(inArray(teacherModules.courseId, courseIds)).orderBy(asc(teacherModules.position)),
    orm.select().from(teacherLessons).where(inArray(teacherLessons.courseId, courseIds)).orderBy(asc(teacherLessons.position)),
  ]);

  return courseIds.flatMap((courseId) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return [];
    const own = progress.filter((p) => p.courseId === courseId);
    const latest = own[0];
    const courseLessons = lessons.filter((l) => l.courseId === courseId);
    return [
      {
        _id: `teacher-progress.${userId}.${courseId}`,
        updatedAt: latest.updatedAt.toISOString(),
        lessons: own.map((p) => ({ id: teacherLessonKey(p.lessonId), position: p.position, duration: p.duration, completed: p.completed })),
        lastLessonId: teacherLessonKey(latest.lessonId),
        lastPosition: latest.position,
        course: {
          _id: teacherCourseKey(course.id),
          title: course.title,
          slug: course.slug,
          coverImage: NO_IMAGE,
          coverUrl: coverFrom(courseLessons),
          level: course.level as "beginner" | "intermediate" | "advanced",
          modules: modules
            .filter((m) => m.courseId === courseId)
            .map((m) => ({
              _key: m.id,
              title: m.title,
              lessons: courseLessons
                .filter((l) => l.moduleId === m.id)
                .map((l) => ({
                  _id: teacherLessonKey(l.id),
                  title: l.title,
                  slug: l.slug,
                  durationSeconds: l.durationSeconds,
                  thumbnail: null,
                  videoUrl: l.videoUrl,
                })),
            })),
        },
      },
    ];
  });
}

/* ---------- Bookmarks ---------- */

export async function teacherBookmarkIds(userId: string) {
  const rows = await getOrm().select({ id: teacherBookmarks.targetId }).from(teacherBookmarks).where(eq(teacherBookmarks.userId, userId));
  return rows.map((r) => r.id);
}

/** Save or unsave a live teacher course or lesson; false when the target isn't live. */
export async function setTeacherBookmark(userId: string, id: string, saved: boolean) {
  const orm = getOrm();
  if (!saved) {
    await orm.delete(teacherBookmarks).where(and(eq(teacherBookmarks.userId, userId), eq(teacherBookmarks.targetId, id)));
    return true;
  }
  const approved = await approvedCourseIdsNow();
  let live = false;
  if (TEACHER_COURSE_KEY.test(id)) live = approved.includes(uuidOf(id));
  else if (TEACHER_LESSON_KEY.test(id)) live = (await publishedLessonInfo(id)) !== null;
  if (!live) return false;
  await orm.insert(teacherBookmarks).values({ userId, targetId: id }).onConflictDoNothing();
  return true;
}

/** Saved teacher courses and lessons, in the shapes of sanity/bookmarks.ts readSaved. */
export async function teacherSaved(userId: string) {
  const orm = getOrm();
  const rows = await orm
    .select()
    .from(teacherBookmarks)
    .where(eq(teacherBookmarks.userId, userId))
    .orderBy(desc(teacherBookmarks.savedAt));
  const approved = new Set(await approvedCourseIdsNow());
  const courseUuids = rows.filter((r) => TEACHER_COURSE_KEY.test(r.targetId)).map((r) => uuidOf(r.targetId));
  const lessonUuids = rows.filter((r) => TEACHER_LESSON_KEY.test(r.targetId)).map((r) => uuidOf(r.targetId));
  const savedLessons = lessonUuids.length ? await orm.select().from(teacherLessons).where(inArray(teacherLessons.id, lessonUuids)) : [];
  const allCourseIds = [...new Set([...courseUuids, ...savedLessons.map((l) => l.courseId)])].filter((id) => approved.has(id));
  if (!allCourseIds.length) return { courses: [], lessons: [] };
  const [courses, modules, lessons] = await Promise.all([
    orm.select().from(teacherCourses).where(inArray(teacherCourses.id, allCourseIds)),
    orm.select().from(teacherModules).where(inArray(teacherModules.courseId, allCourseIds)).orderBy(asc(teacherModules.position)),
    orm.select().from(teacherLessons).where(inArray(teacherLessons.courseId, allCourseIds)).orderBy(asc(teacherLessons.position)),
  ]);
  const lessonsOf = (courseId: string) => lessons.filter((l) => l.courseId === courseId);
  const modulesOf = (courseId: string) =>
    modules
      .filter((m) => m.courseId === courseId)
      .map((m) => ({ lessonIds: lessons.filter((l) => l.moduleId === m.id).map((l) => teacherLessonKey(l.id)) }));

  return {
    courses: courseUuids
      .map((id) => courses.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((c) => ({
        _id: teacherCourseKey(c.id),
        title: c.title,
        slug: c.slug,
        summary: c.summary,
        coverImage: NO_IMAGE,
        coverUrl: coverFrom(lessonsOf(c.id)),
        level: c.level as "beginner" | "intermediate" | "advanced",
        moduleCount: modules.filter((m) => m.courseId === c.id).length,
        durationSeconds: lessonsOf(c.id).reduce((n, l) => n + l.durationSeconds, 0),
      })),
    lessons: lessonUuids
      .map((id) => savedLessons.find((l) => l.id === id))
      .filter((l): l is NonNullable<typeof l> => Boolean(l) && approved.has(l!.courseId))
      .map((l) => {
        const course = courses.find((c) => c.id === l.courseId);
        return {
          _id: teacherLessonKey(l.id),
          title: l.title,
          slug: l.slug,
          durationSeconds: l.durationSeconds,
          freePreview: l.freePreview,
          course: course
            ? { title: course.title, coverImage: NO_IMAGE, coverUrl: coverFrom(lessonsOf(course.id)), modules: modulesOf(course.id) }
            : null,
        };
      }),
  };
}
