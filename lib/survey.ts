import { z } from "zod";

/*
 * Onboarding survey (prompts/onboarding-survey-review-and-phase-2.md): who learners are,
 * where they found Roam, and what they want, for recommendations and admin insights.
 * Shared by the onboarding UI and the server route. Safe on the client.
 */

export const PERSONAS = [
  { value: "high-school", label: "High school student" },
  { value: "college", label: "College or university student" },
  { value: "professional", label: "Working professional" },
  { value: "career-switcher", label: "Career switcher" },
  { value: "educator", label: "Teacher or educator" },
  { value: "other", label: "Other" },
] as const;

export const HEARD_FROM = [
  { value: "search", label: "Search engine" },
  { value: "youtube", label: "YouTube" },
  { value: "social", label: "TikTok or Instagram" },
  { value: "x", label: "X (Twitter)" },
  { value: "friend", label: "Friend or colleague" },
  { value: "school-work", label: "School or workplace" },
  { value: "other", label: "Other" },
] as const;

export const GOALS = [
  { value: "new-skill", label: "Learn a new skill" },
  { value: "career", label: "Advance my career" },
  { value: "school", label: "Help with school" },
  { value: "personal", label: "Personal interest" },
  { value: "teach", label: "Teach others" },
] as const;

export const EXPERIENCE = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

export const WEEKLY_TIME = [
  { value: "under-1", label: "Under 1 hour" },
  { value: "1-3", label: "1–3 hours" },
  { value: "3-5", label: "3–5 hours" },
  { value: "5-plus", label: "5+ hours" },
] as const;

const valuesOf = <T extends readonly { value: string }[]>(options: T) =>
  options.map((o) => o.value) as unknown as [T[number]["value"], ...T[number]["value"][]];

export const SurveyInput = z
  .object({
    intent: z.enum(["learn", "teach"]),
    persona: z.enum(valuesOf(PERSONAS)),
    heardFrom: z.enum(valuesOf(HEARD_FROM)).nullable(),
    heardFromOther: z.string().trim().max(120).nullable(),
    goals: z.array(z.enum(valuesOf(GOALS))).max(GOALS.length),
    /** Category slugs (Sanity). */
    interests: z.array(z.string().regex(/^[a-z0-9-]{1,96}$/)).max(20),
    level: z.enum(valuesOf(EXPERIENCE)).nullable(),
    weeklyTime: z.enum(valuesOf(WEEKLY_TIME)).nullable(),
  })
  .strict();

export type SurveyAnswers = z.infer<typeof SurveyInput>;

/** A course card in the onboarding recommendations. */
export type RecommendedCourse = {
  slug: string;
  title: string;
  summary: string;
  level: string;
  duration: string;
  category: string;
  imageUrl?: string;
};
