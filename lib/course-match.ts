/*
 * Instant course matching for the home filter and the /courses catalog. Token based:
 * every word must appear somewhere; where it appears decides the rank.
 */

export type MatchableCourse = {
  title: string;
  category: string;
  summary: string;
  level: string;
  lessonTitles: string[];
};

export function searchTokens(query: string) {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Lower is a better match: title, then category, then summary/level, then lesson titles.
 * `null` when some word matches nowhere.
 */
export function matchScore(course: MatchableCourse, tokens: string[]) {
  const fields = [
    course.title,
    course.category,
    `${course.summary} ${course.level}`,
    course.lessonTitles.join(" "),
  ].map((field) => field.toLowerCase());

  let total = 0;
  for (const token of tokens) {
    const index = fields.findIndex((field) => field.includes(token));
    if (index === -1) return null;
    total += index;
  }
  return total;
}
