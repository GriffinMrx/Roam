import {bookmarks} from './documents/bookmarks'
import {category} from './documents/category'
import {course} from './documents/course'
import {courseReview} from './documents/course-review'
import {instructor} from './documents/instructor'
import {lesson} from './documents/lesson'
import {progress} from './documents/progress'
import {blockContent} from './objects/block-content'
import {courseModule} from './objects/module'
import {learningOutcome} from './objects/learning-outcome'
import {resource} from './objects/resource'

export const schemaTypes = [
  course,
  lesson,
  instructor,
  category,
  progress,
  bookmarks,
  courseReview,
  courseModule,
  learningOutcome,
  resource,
  blockContent,
]
