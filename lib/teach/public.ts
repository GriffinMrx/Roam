import "server-only";

import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { getOrm } from "@/lib/db";
import { teacherCourses, teacherLessons, teacherModules, teacherProfiles, teacherProgress } from "@/lib/db/schema";
import { parseVideoUrl, youtubeThumbnail } from "@/lib/video";
import type {
  BlockContent,
  COURSE_QUERY_RESULT,
  COURSES_QUERY_RESULT,
  INSTRUCTOR_QUERY_RESULT,
  LESSON_QUERY_RESULT,
} from "@/sanity.types";
import { getCategories } from "@/sanity/data";
import { sanityFetch } from "@/sanity/lib/fetch";
import { APPROVED_IDS_QUERY } from "./review";
import { teacherLessonKey } from "./schema";
import { TEACHER_CONTENT_TAG } from "./store";

/*
 * Public reads of published teacher courses, in the same shapes as the Sanity queries
 * (sanity/lib/queries.ts), so the catalog, course, lesson, and instructor pages render
 * them unchanged. Cached like Sanity content; teacher and admin writes refresh the tag.
 * Images are plain URLs (`coverUrl`, `photoUrl`); the Sanity image fields stay empty.
 *
 * "Published" means the course's Sanity review is approved (lib/teach/review.ts). That read
 * is a cached Sanity fetch inside these cached functions, so Sanity Live refreshes them the
 * moment an admin decides in Studio.
 */

/** Marks teacher content and carries plain image URLs. */
export type TeacherExtras = { teacher: true; coverUrl?: string; photoUrl?: string };

export type TeacherCourseCard = COURSES_QUERY_RESULT[number] & TeacherExtras;
export type TeacherCourse = NonNullable<COURSE_QUERY_RESULT> & TeacherExtras;
export type TeacherLesson = NonNullable<LESSON_QUERY_RESULT> & TeacherExtras & { courseCoverUrl?: string };
export type TeacherInstructor = NonNullable<INSTRUCTOR_QUERY_RESULT> & TeacherExtras & {
  headline: string;
  courses: (NonNullable<INSTRUCTOR_QUERY_RESULT>["courses"][number] & { coverUrl?: string })[];
};

const NO_IMAGE = { _type: "image" } as const;
const courseKey = (id: string) => `tc-${id}`;
type Level = "beginner" | "intermediate" | "advanced";
type ResourceType = NonNullable<NonNullable<LESSON_QUERY_RESULT>["resources"]>[number]["type"];

/** Paragraphs → plain Portable Text blocks for the existing renderer. */
function toBlocks(paragraphs: string[]): BlockContent {
  return paragraphs.filter(Boolean).map((text, i) => ({
    _type: "block" as const,
    _key: `p${i}`,
    style: "normal" as const,
    markDefs: [],
    children: [{ _type: "span" as const, _key: `s${i}`, text, marks: [] }],
  }));
}

/** The first YouTube lesson's thumbnail is the course cover (no image uploads). */
function coverFrom(lessons: { videoUrl: string }[]) {
  for (const lesson of lessons) {
    const video = parseVideoUrl(lesson.videoUrl);
    if (video?.provider === "youtube") return youtubeThumbnail(video.id);
  }
  return undefined;
}

async function categoryMap() {
  const categories = await getCategories();
  return new Map(categories.map((c) => [c.slug, { title: c.title ?? "", slug: c.slug ?? "" }]));
}

type LessonRow = typeof teacherLessons.$inferSelect;

/** Lessons of these courses, in module then lesson order. */
async function lessonsOf(courseIds: string[]) {
  if (!courseIds.length) return { modules: [], lessons: [] as LessonRow[] };
  const orm = getOrm();
  const [modules, lessons] = await Promise.all([
    orm.select().from(teacherModules).where(inArray(teacherModules.courseId, courseIds)).orderBy(asc(teacherModules.position)),
    orm.select().from(teacherLessons).where(inArray(teacherLessons.courseId, courseIds)).orderBy(asc(teacherLessons.position)),
  ]);
  const moduleOrder = new Map(modules.map((m) => [m.id, m.position]));
  lessons.sort((a, b) => (moduleOrder.get(a.moduleId) ?? 0) - (moduleOrder.get(b.moduleId) ?? 0) || a.position - b.position);
  return { modules, lessons };
}

const sum = (rows: { durationSeconds: number }[]) => rows.reduce((n, r) => n + r.durationSeconds, 0);

/** Approved course ids through the cached Sanity fetch, so Sanity Live refreshes everything that uses them. */
async function approvedCourseIds(): Promise<string[]> {
  const ids = await sanityFetch({ query: APPROVED_IDS_QUERY });
  return (ids ?? []).filter((id): id is string => typeof id === "string");
}

/** Learners with any progress, per course (phase 2 teacher stats). */
async function studentCounts(courseIds: string[]) {
  if (!courseIds.length) return new Map<string, number>();
  const rows = await getOrm()
    .select({ courseId: teacherProgress.courseId, n: sql<number>`count(distinct ${teacherProgress.userId})::int` })
    .from(teacherProgress)
    .where(inArray(teacherProgress.courseId, courseIds))
    .groupBy(teacherProgress.courseId);
  return new Map(rows.map((r) => [r.courseId, r.n]));
}

/* ---------- Catalog ---------- */

export async function publishedTeacherCourses(): Promise<TeacherCourseCard[]> {
  "use cache";
  cacheTag(TEACHER_CONTENT_TAG);
  cacheLife("max");

  const approved = await approvedCourseIds();
  if (!approved.length) return [];
  const courses = await getOrm()
    .select()
    .from(teacherCourses)
    .where(inArray(teacherCourses.id, approved))
    .orderBy(asc(teacherCourses.title));
  const ids = courses.map((c) => c.id);
  const [{ modules, lessons }, categories, students] = await Promise.all([lessonsOf(ids), categoryMap(), studentCounts(ids)]);

  return courses.map((c) => {
    const own = lessons.filter((l) => l.courseId === c.id);
    return {
      teacher: true,
      _id: courseKey(c.id),
      _createdAt: (c.publishedAt ?? c.createdAt).toISOString(),
      title: c.title,
      slug: c.slug,
      summary: c.summary,
      coverImage: NO_IMAGE,
      coverUrl: coverFrom(own),
      level: c.level as Level,
      price: c.price,
      popular: false,
      studentCount: students.get(c.id) ?? 0,
      category: categories.get(c.categorySlug ?? "") ?? { title: "", slug: "" },
      moduleCount: modules.filter((m) => m.courseId === c.id).length,
      lessonCount: own.length,
      durationSeconds: sum(own),
      lessonTitles: own.map((l) => l.title),
    };
  });
}

/* ---------- Course page ---------- */

export async function publishedTeacherCourse(slug: string): Promise<TeacherCourse | null> {
  "use cache";
  cacheTag(TEACHER_CONTENT_TAG);
  cacheLife("max");

  const approved = await approvedCourseIds();
  if (!approved.length) return null;
  const orm = getOrm();
  const [row] = await orm
    .select({ course: teacherCourses, profile: teacherProfiles })
    .from(teacherCourses)
    .innerJoin(teacherProfiles, eq(teacherProfiles.userId, teacherCourses.ownerId))
    .where(and(eq(teacherCourses.slug, slug), inArray(teacherCourses.id, approved)))
    .limit(1);
  if (!row) return null;
  const { course, profile } = row;

  const [{ modules, lessons }, categories, relatedRows] = await Promise.all([
    lessonsOf([course.id]),
    categoryMap(),
    course.categorySlug
      ? orm
          .select()
          .from(teacherCourses)
          .where(
            and(
              inArray(teacherCourses.id, approved),
              eq(teacherCourses.categorySlug, course.categorySlug),
              ne(teacherCourses.id, course.id),
            ),
          )
          .orderBy(asc(teacherCourses.title))
          .limit(3)
      : Promise.resolve([]),
  ]);
  const [related, students] = await Promise.all([lessonsOf(relatedRows.map((r) => r.id)), studentCounts([course.id])]);

  return {
    teacher: true,
    _id: courseKey(course.id),
    title: course.title,
    slug: course.slug,
    summary: course.summary,
    coverImage: NO_IMAGE,
    coverUrl: coverFrom(lessons),
    level: course.level as Level,
    price: course.price,
    popular: false,
    studentCount: students.get(course.id) ?? 0,
    instructor: {
      name: profile.name,
      slug: profile.slug,
      photo: null,
      expertise: profile.expertise,
      bio: toBlocks(profile.bio.split(/\n{2,}/)),
    },
    photoUrl: profile.photoUrl ?? undefined,
    category: categories.get(course.categorySlug ?? "") ?? { title: "", slug: "" },
    lessonCount: lessons.length,
    durationSeconds: sum(lessons),
    related: relatedRows.map((r) => {
      const own = related.lessons.filter((l) => l.courseId === r.id);
      return {
        _id: courseKey(r.id),
        title: r.title,
        slug: r.slug,
        summary: r.summary,
        coverImage: NO_IMAGE,
        coverUrl: coverFrom(own),
        level: r.level as Level,
        moduleCount: related.modules.filter((m) => m.courseId === r.id).length,
        durationSeconds: sum(own),
      };
    }),
    modules: modules.map((m) => {
      const own = lessons.filter((l) => l.moduleId === m.id);
      return {
        _key: m.id,
        title: m.title,
        summary: m.summary || null,
        durationSeconds: sum(own),
        lessons: own.map((l) => ({
          _id: teacherLessonKey(l.id),
          title: l.title,
          slug: l.slug,
          durationSeconds: l.durationSeconds,
          freePreview: l.freePreview,
        })),
      };
    }),
  };
}

/* ---------- Lesson page ---------- */

export async function publishedTeacherLesson(slug: string): Promise<TeacherLesson | null> {
  "use cache";
  cacheTag(TEACHER_CONTENT_TAG);
  cacheLife("max");

  const approved = await approvedCourseIds();
  if (!approved.length) return null;
  const orm = getOrm();
  const [row] = await orm
    .select({ lesson: teacherLessons, course: teacherCourses, profile: teacherProfiles })
    .from(teacherLessons)
    .innerJoin(teacherCourses, eq(teacherCourses.id, teacherLessons.courseId))
    .innerJoin(teacherProfiles, eq(teacherProfiles.userId, teacherCourses.ownerId))
    .where(and(eq(teacherLessons.slug, slug), inArray(teacherCourses.id, approved)))
    .limit(1);
  if (!row) return null;
  const { lesson, course, profile } = row;
  const { modules, lessons } = await lessonsOf([course.id]);

  return {
    teacher: true,
    _id: teacherLessonKey(lesson.id),
    title: lesson.title,
    slug: lesson.slug,
    summary: lesson.summary || null,
    videoUrl: lesson.videoUrl,
    thumbnail: null,
    durationSeconds: lesson.durationSeconds,
    freePreview: lesson.freePreview,
    studentCount: 0,
    notes: toBlocks(lesson.notes),
    keyPoints: lesson.keyPoints,
    proTip: lesson.proTip || null,
    resources: lesson.resources.map((r, i) => ({
      _key: `r${i}`,
      type: r.type as ResourceType,
      title: r.title,
      description: r.description || null,
      url: r.url,
    })),
    photoUrl: profile.photoUrl ?? undefined,
    courseCoverUrl: coverFrom(lessons),
    course: {
      _id: courseKey(course.id),
      title: course.title,
      slug: course.slug,
      level: course.level as Level,
      coverImage: NO_IMAGE,
      instructor: { name: profile.name, slug: profile.slug, photo: null, expertise: profile.expertise },
      modules: modules.map((m) => {
        const own = lessons.filter((l) => l.moduleId === m.id);
        return {
          _key: m.id,
          title: m.title,
          durationSeconds: sum(own),
          lessons: own.map((l) => ({
            _id: teacherLessonKey(l.id),
            title: l.title,
            slug: l.slug,
            durationSeconds: l.durationSeconds,
          })),
        };
      }),
    },
  };
}

/* ---------- Instructor page ---------- */

export async function teacherInstructor(slug: string): Promise<TeacherInstructor | null> {
  "use cache";
  cacheTag(TEACHER_CONTENT_TAG);
  cacheLife("max");

  const orm = getOrm();
  const [profile] = await orm.select().from(teacherProfiles).where(eq(teacherProfiles.slug, slug)).limit(1);
  if (!profile) return null;
  const approved = await approvedCourseIds();
  const courses = approved.length
    ? await orm
        .select()
        .from(teacherCourses)
        .where(and(eq(teacherCourses.ownerId, profile.userId), inArray(teacherCourses.id, approved)))
        .orderBy(asc(teacherCourses.title))
    : [];
  const ids = courses.map((c) => c.id);
  const [{ modules, lessons }, students] = await Promise.all([lessonsOf(ids), studentCounts(ids)]);

  return {
    teacher: true,
    _id: `tp-${profile.userId}`,
    name: profile.name,
    slug: profile.slug,
    headline: profile.headline,
    photo: null,
    photoUrl: profile.photoUrl ?? undefined,
    expertise: profile.expertise,
    bio: profile.bio ? toBlocks(profile.bio.split(/\n{2,}/)) : null,
    courses: courses.map((c) => {
      const own = lessons.filter((l) => l.courseId === c.id);
      return {
        _id: courseKey(c.id),
        title: c.title,
        slug: c.slug,
        summary: c.summary,
        coverImage: NO_IMAGE,
        coverUrl: coverFrom(own),
        level: c.level as Level,
        studentCount: students.get(c.id) ?? 0,
        moduleCount: modules.filter((m) => m.courseId === c.id).length,
        lessonCount: own.length,
        durationSeconds: sum(own),
      };
    }),
  };
}
