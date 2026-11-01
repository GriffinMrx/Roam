/** Learner badges (prompts/onboarding-survey-review-and-phase-2.md). Safe on the client. */

export type BadgeView = { key: string; title: string; description: string; earnedAt: string | null };

/** Milestones, in the order My Learning shows them (locked ones dimmed). */
export const MILESTONES = [
  { key: "first-lesson", title: "First lesson", description: "Finish your first lesson.", lessons: 1, courses: 0 },
  { key: "ten-lessons", title: "10 lessons", description: "Finish 10 lessons.", lessons: 10, courses: 0 },
  { key: "first-course", title: "Course finisher", description: "Finish a whole course.", lessons: 0, courses: 1 },
  { key: "three-courses", title: "Triple finisher", description: "Finish 3 courses.", lessons: 0, courses: 3 },
] as const;

/** Course completion badges are keyed "course:<course id>". */
export const courseBadgeKey = (courseId: string) => `course:${courseId}`;

/** Fired on window when the server reports newly earned badges (the toaster listens). */
export const BADGE_EVENT = "roam:badges";
export type BadgeEventDetail = { badges: { key: string; title: string }[] };
