import { ProblemDifficulty } from '@prisma/client'

export const APP_NAME = 'Memoized'

export const SUPPORT_EMAIL = 'support@memoized.io'
export const INFO_EMAIL = 'info@memoized.io'
export const FEEDBACK_EMAIL = 'feedback@memoized.io'

export const COURSES_PREFIX = '/courses'
export const PROBLEMS_PREFIX = '/problems'
export const RESOURCES_PREFIX = '/resources'
export const PREMIUM_PREFIX = "/premium"

export const DSA_TRACK_PREFIX = '/dsa-track'
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

export const PRACTICE_PROBLEMS_PREFIX = '#practice-problems'

export const CONTENT_FOLDER = 'content'
export const SAMPLES_FOLDER = 'samples'

export const RESOURCES_FOLDER = 'resources'

export const PREMIUM_QUERY_PARAM = 'upgradedToPremium'
export const SESSION_QUERY_PARAM = 'sessionId'

export const DIFFICULTY_ORDER = {
  [ProblemDifficulty.EASY]: 1,
  [ProblemDifficulty.MEDIUM]: 2,
  [ProblemDifficulty.HARD]: 3,
}

export const SLUGIFY_OPTIONS = {
  replacement: '-', // replace spaces with -
  lower: true, // convert to lower case
  strict: true, // strip special characters except replacement
  trim: true, // trim leading and trailing replacement chars
  // No need to use charmap since the forward slash will be replaced by default
}
