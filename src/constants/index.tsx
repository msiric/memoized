import { ProblemDifficulty } from '@prisma/client'

export const APP_NAME = 'Memoized'

export const COURSE_PREFIX = '/course'

export const RESOURCES_PREFIX = '/resources'

export const BUILT_IN_DATA_STRUCTURES_PREFIX = '/built-in-data-structures'
export const USER_DEFINED_DATA_STRUCTURES_PREFIX =
  '/user-defined-data-structures'
export const COMMON_TECHNIQUES_PREFIX = '/common-techniques'
export const ADVANCED_TOPICS_PREFIX = '/advanced-topics'

export const CONTENT_FOLDER = 'content'

export const RESOURCES_FOLDER = 'resources'

export const PREMIUM_QUERY_PARAM = 'upgradedToPremium'
export const SESSION_QUERY_PARAM = 'sessionId'

export const DIFFICULTY_ORDER = {
  [ProblemDifficulty.EASY]: 1,
  [ProblemDifficulty.MEDIUM]: 2,
  [ProblemDifficulty.HARD]: 3,
}
