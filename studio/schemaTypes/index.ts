import {category} from './documents/category'
import {course} from './documents/course'
import {instructor} from './documents/instructor'
import {lesson} from './documents/lesson'
import {blockContent} from './objects/block-content'
import {courseModule} from './objects/module'
import {outcome} from './objects/outcome'
import {resource} from './objects/resource'

export const schemaTypes = [
  course,
  lesson,
  instructor,
  category,
  courseModule,
  outcome,
  resource,
  blockContent,
]
