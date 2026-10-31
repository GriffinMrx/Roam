import 'server-only'

import { sanityFetch } from './lib/fetch'
import {
  CATEGORIES_QUERY,
  COURSE_QUERY,
  COURSE_SLUGS_QUERY,
  COURSES_QUERY,
  INSTRUCTOR_QUERY,
  INSTRUCTOR_SLUGS_QUERY,
  LESSON_QUERY,
  LESSON_SLUGS_QUERY,
} from './lib/queries'

// Read-only content access for pages. Every function runs on the server only.

export function getCourses() {
  return sanityFetch({
    query: COURSES_QUERY,
    tags: ['course', 'lesson', 'category'],
  })
}

export function getCourse(slug: string) {
  return sanityFetch({
    query: COURSE_QUERY,
    params: { slug },
    tags: ['course', 'lesson', 'instructor', 'category'],
  })
}

export function getLesson(slug: string) {
  return sanityFetch({
    query: LESSON_QUERY,
    params: { slug },
    tags: ['lesson', 'course', 'instructor'],
  })
}

export function getInstructor(slug: string) {
  return sanityFetch({
    query: INSTRUCTOR_QUERY,
    params: { slug },
    tags: ['instructor', 'course', 'lesson'],
  })
}

export function getCategories() {
  return sanityFetch({ query: CATEGORIES_QUERY, tags: ['category'] })
}

export function getCourseSlugs() {
  return sanityFetch({ query: COURSE_SLUGS_QUERY, tags: ['course'] })
}

export function getLessonSlugs() {
  return sanityFetch({ query: LESSON_SLUGS_QUERY, tags: ['lesson'] })
}

export function getInstructorSlugs() {
  return sanityFetch({ query: INSTRUCTOR_SLUGS_QUERY, tags: ['instructor'] })
}
