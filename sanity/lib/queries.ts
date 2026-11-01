import { defineQuery } from 'next-sanity'

/*
 * Derived values (module/lesson counts, durations, "Lesson 5.1" labels) are
 * computed here or in the UI from order, never stored. A lesson's course is
 * found by reverse reference.
 */

export const COURSES_QUERY = defineQuery(`
  *[_type == "course" && defined(slug.current)] | order(popular desc, title asc) {
    _id,
    _createdAt,
    title,
    "slug": slug.current,
    summary,
    coverImage,
    level,
    price,
    popular,
    studentCount,
    "category": category->{ title, "slug": slug.current },
    "moduleCount": count(modules),
    "lessonCount": count(modules[].lessons[]),
    "durationSeconds": math::sum(modules[].lessons[]->duration),
    "lessonTitles": modules[].lessons[]->title
  }
`)

export const COURSE_QUERY = defineQuery(`
  *[_type == "course" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    summary,
    coverImage,
    level,
    price,
    popular,
    studentCount,
    "instructor": instructor->{ name, "slug": slug.current, photo, expertise, bio },
    "category": category->{ title, "slug": slug.current },
    "lessonCount": count(modules[].lessons[]),
    "durationSeconds": math::sum(modules[].lessons[]->duration),
    "related": *[_type == "course" && defined(slug.current) && defined(^.category._ref) && category._ref == ^.category._ref && _id != ^._id] | order(popular desc, title asc) [0...3] {
      _id,
      title,
      "slug": slug.current,
      summary,
      coverImage,
      level,
      "moduleCount": count(modules),
      "durationSeconds": math::sum(modules[].lessons[]->duration)
    },
    modules[] {
      _key,
      title,
      summary,
      "durationSeconds": math::sum(lessons[]->duration),
      "lessons": lessons[]->{
        _id,
        title,
        "slug": slug.current,
        "durationSeconds": duration,
        freePreview
      }
    }
  }
`)

export const LESSON_QUERY = defineQuery(`
  *[_type == "lesson" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    summary,
    videoUrl,
    thumbnail,
    "durationSeconds": duration,
    freePreview,
    studentCount,
    notes,
    keyPoints,
    proTip,
    resources[] { _key, type, title, description, url },
    "course": *[_type == "course" && references(^._id)][0] {
      _id,
      title,
      "slug": slug.current,
      level,
      coverImage,
      "instructor": instructor->{ name, "slug": slug.current, photo, expertise },
      modules[] {
        _key,
        title,
        "durationSeconds": math::sum(lessons[]->duration),
        "lessons": lessons[]->{ _id, title, "slug": slug.current, "durationSeconds": duration }
      }
    }
  }
`)

export const INSTRUCTOR_QUERY = defineQuery(`
  *[_type == "instructor" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    photo,
    expertise,
    bio,
    "courses": *[_type == "course" && references(^._id) && defined(slug.current)] | order(popular desc, title asc) {
      _id,
      title,
      "slug": slug.current,
      summary,
      coverImage,
      level,
      studentCount,
      "moduleCount": count(modules),
      "lessonCount": count(modules[].lessons[]),
      "durationSeconds": math::sum(modules[].lessons[]->duration)
    }
  }
`)

export const CATEGORIES_QUERY = defineQuery(`
  *[_type == "category" && defined(slug.current)] | order(title asc) {
    _id,
    title,
    "slug": slug.current,
    description
  }
`)

export const COURSE_SLUGS_QUERY = defineQuery(`
  *[_type == "course" && defined(slug.current)] { "slug": slug.current }
`)

export const LESSON_SLUGS_QUERY = defineQuery(`
  *[_type == "lesson" && defined(slug.current)] { "slug": slug.current }
`)

export const INSTRUCTOR_SLUGS_QUERY = defineQuery(`
  *[_type == "instructor" && defined(slug.current)] { "slug": slug.current }
`)
