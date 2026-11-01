import { z } from "zod";

import { parseVideoUrl } from "@/lib/video";

/*
 * Teacher course shapes and limits, shared by the editor (live checks) and the server
 * routes (the real enforcement). Safe on the client: no secrets, no database.
 */

export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export const RESOURCE_TYPES = ["documentation", "guide", "article", "link", "repository", "download"] as const;
export const COURSE_STATUSES = ["draft", "pending", "published", "rejected"] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const LIMITS = {
  coursesPerTeacher: 20,
  modules: 12,
  lessonsPerModule: 30,
  notes: 20,
  keyPoints: 6,
  resources: 8,
} as const;

const text = (max: number) => z.string().trim().max(max);
const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    try {
      return new URL(v).protocol === "https:";
    } catch {
      return false;
    }
  }, "Use an https:// link");
/** Empty while drafting; otherwise a YouTube, Vimeo, or Bunny link the player supports. */
const videoUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || parseVideoUrl(v) !== null, "Paste a YouTube, Vimeo, or Bunny video link");

export const ResourceInput = z
  .object({
    type: z.enum(RESOURCE_TYPES),
    title: text(120).min(1, "Add a title"),
    description: text(240),
    url: httpsUrl,
  })
  .strict();

export const LessonInput = z
  .object({
    id: z.string().uuid().optional(),
    title: text(120),
    summary: text(240),
    videoUrl,
    durationSeconds: z.number().int().min(0).max(86_400),
    freePreview: z.boolean(),
    notes: z.array(text(2000)).max(LIMITS.notes),
    keyPoints: z.array(text(200)).max(LIMITS.keyPoints),
    proTip: text(500),
    resources: z.array(ResourceInput).max(LIMITS.resources),
  })
  .strict();

export const ModuleInput = z
  .object({
    id: z.string().uuid().optional(),
    title: text(120),
    summary: text(240),
    lessons: z.array(LessonInput).max(LIMITS.lessonsPerModule),
  })
  .strict();

/** What "Save" sends: the whole course. Drafts may be incomplete. */
export const CourseInput = z
  .object({
    title: text(120).min(1, "Give the course a title"),
    summary: text(240),
    level: z.enum(LEVELS),
    price: z.number().int().min(0).max(10_000),
    categorySlug: z.string().regex(/^[a-z0-9-]{1,96}$/).nullable(),
    modules: z.array(ModuleInput).max(LIMITS.modules),
  })
  .strict();

export type ResourceDraft = z.infer<typeof ResourceInput>;
export type LessonDraft = z.infer<typeof LessonInput>;
export type ModuleDraft = z.infer<typeof ModuleInput>;
export type CourseDraft = z.infer<typeof CourseInput>;

export const TeacherProfileInput = z
  .object({
    name: text(80).min(1, "Add your name"),
    headline: text(120),
    bio: text(2000),
    expertise: z.array(text(40).min(1)).max(8),
  })
  .strict();
export type TeacherProfileDraft = z.infer<typeof TeacherProfileInput>;

/** Everything a course needs before it can be submitted for review; empty when ready. */
export function submitProblems(course: CourseDraft): string[] {
  const problems: string[] = [];
  if (!course.summary) problems.push("Add a course summary.");
  if (!course.categorySlug) problems.push("Choose a category.");
  if (course.modules.length === 0) problems.push("Add at least one module.");
  course.modules.forEach((m, i) => {
    const where = `Module ${i + 1}`;
    if (!m.title) problems.push(`${where}: add a title.`);
    if (m.lessons.length === 0) problems.push(`${where}: add at least one lesson.`);
    m.lessons.forEach((l, j) => {
      const at = `Lesson ${i + 1}.${j + 1}`;
      if (!l.title) problems.push(`${at}: add a title.`);
      if (!l.videoUrl) problems.push(`${at}: add a video link.`);
      if (l.durationSeconds <= 0) problems.push(`${at}: add the video length.`);
    });
  });
  return problems;
}

/** Teacher lessons are addressed as "tl-<uuid>" outside the database (comments, players). */
export const TEACHER_LESSON_PREFIX = "tl-";
export const teacherLessonKey = (id: string) => `${TEACHER_LESSON_PREFIX}${id}`;
/** Teacher courses are "tc-<uuid>" outside the database (pages, progress, bookmarks). */
export const teacherCourseKey = (id: string) => `tc-${id}`;
export const TEACHER_COURSE_KEY = /^tc-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const TEACHER_LESSON_KEY = /^tl-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
