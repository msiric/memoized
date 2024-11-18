import { ProblemDifficulty } from '@prisma/client'

export const APP_NAME = 'Memoized'

export const COURSES_PREFIX = '/courses'
export const PROBLEMS_PREFIX = '/problems'
export const RESOURCES_PREFIX = '/resources'

export const DSA_TRACK_PREFIX = '/dsa-track'
export const FRONTEND_TRACK_PREFIX = '/frontend-track'
export const JS_TRACK_PREFIX = '/js-track'

export const BUILT_IN_DATA_STRUCTURES_PREFIX = '/built-in-data-structures'
export const USER_DEFINED_DATA_STRUCTURES_PREFIX =
  '/user-defined-data-structures'
export const COMMON_TECHNIQUES_PREFIX = '/common-techniques'
export const ADVANCED_TOPICS_PREFIX = '/advanced-topics'

export const BROWSER_AND_WEB_APIS_PREFIX = '/browser-and-web-apis'
export const JAVASCRIPT_MECHANICS_PREFIX = '/javascript-mechanics'
export const TYPESCRIPT_ADVANCED_CONCEPTS_PREFIX =
  '/typescript-advanced-concepts'
export const MODERN_FRONTEND_DEVELOPMENT_PREFIX = '/modern-frontend-development'

export const CORE_FUNDAMENTALS_PREFIX = '/core-fundamentals'
export const ADVANCED_CONCEPTS_PREFIX = '/advanced-concepts'
export const TYPESCRIPT_INTRODUCTION_PREFIX = '/typescript-introduction'
export const FRONTEND_DEVELOPMENT_PREFIX = '/frontend-development'

export const CONTENT_FOLDER = 'content'

export const RESOURCES_FOLDER = 'resources'

export const PREMIUM_QUERY_PARAM = 'upgradedToPremium'
export const SESSION_QUERY_PARAM = 'sessionId'

export const DIFFICULTY_ORDER = {
  [ProblemDifficulty.EASY]: 1,
  [ProblemDifficulty.MEDIUM]: 2,
  [ProblemDifficulty.HARD]: 3,
}
