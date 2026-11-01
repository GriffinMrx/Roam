import "server-only";

import type { SanityImageSource } from "@sanity/image-url";

import {
  publishedTeacherCourse,
  publishedTeacherCourses,
  publishedTeacherLesson,
  teacherInstructor,
} from "@/lib/teach/public";
import type { COURSE_QUERY_RESULT, COURSES_QUERY_RESULT, INSTRUCTOR_QUERY_RESULT, LESSON_QUERY_RESULT } from "@/sanity.types";
import { getCourse, getCourses, getInstructor, getLesson } from "@/sanity/data";
import { urlFor } from "@/sanity/lib/image";

/*
 * What the public pages read: editorial courses from Sanity first, then published teacher
 * courses from Neon (prompts/teachers-phase-1.md). Both are cached; teacher items carry
 * `teacher: true` and plain image URLs instead of Sanity images.
 */

type Img = { coverUrl?: string };
type Extras = Img & { teacher?: boolean; photoUrl?: string };

export type CatalogCourse = COURSES_QUERY_RESULT[number] & Extras;
export type CourseDetail = Omit<NonNullable<COURSE_QUERY_RESULT>, "related"> &
  Extras & { related: (NonNullable<COURSE_QUERY_RESULT>["related"][number] & Img)[] };
export type LessonDetail = NonNullable<LESSON_QUERY_RESULT> & Extras & { courseCoverUrl?: string };
export type InstructorDetail = Omit<NonNullable<INSTRUCTOR_QUERY_RESULT>, "courses"> &
  Extras & { headline?: string; courses: (NonNullable<INSTRUCTOR_QUERY_RESULT>["courses"][number] & Img)[] };

export async function getAllCourses(): Promise<CatalogCourse[]> {
  const [editorial, teacher] = await Promise.all([getCourses(), publishedTeacherCourses()]);
  return [...editorial, ...teacher];
}

export async function getCourseDetail(slug: string): Promise<CourseDetail | null> {
  return (await getCourse(slug)) ?? (await publishedTeacherCourse(slug));
}

export async function getLessonDetail(slug: string): Promise<LessonDetail | null> {
  return (await getLesson(slug)) ?? (await publishedTeacherLesson(slug));
}

export async function getInstructorDetail(slug: string): Promise<InstructorDetail | null> {
  return (await getInstructor(slug)) ?? (await teacherInstructor(slug));
}

/** A Sanity image cropped to size, or the plain URL teacher content uses; undefined if neither. */
export function imageSrc(
  image: { asset?: unknown } | null | undefined,
  url: string | undefined,
  width: number,
  height: number,
) {
  if (image?.asset) return urlFor(image as SanityImageSource).width(width).height(height).fit("crop").url();
  return url;
}
