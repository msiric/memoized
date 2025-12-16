export const DEFAULT_VALUES = {
  USER: 'user',
  CUSTOMER: 'customer',
  ACCOUNT: 'account',
  LESSON: 'lesson',
  SUBSCRIPTION: 'subscription',
  USER_LESSON_PROGRESS: 'userLessonProgress',
  COURSE: 'course',
  SECTION: 'section',
  PROBLEM: 'problem',
  USER_PROBLEM_PROGRESS: 'userProblemProgress',
  BANNER: 'banner',
}

export const USER_SELECTION = {
  ACTIVE_STATUS: true,
  STRIPPED_INFO: () => [`id`],
  ESSENTIAL_INFO: [`id`, `name`, `email`, `image`, `createdAt`, `updatedAt`],
  FULL_INFO: [
    `id`,
    `name`,
    `email`,
    `image`,
    `createdAt`,
    `updatedAt`,
    `accounts`,
    `customer`,
    `lessonProgress`,
    `problemProgress`,
  ],
}

export const CUSTOMER_SELECTION = {
  STRIPPED_INFO: [`id`],
  ESSENTIAL_INFO: [`id`, `stripeCustomerId`, `userId`],
  FULL_INFO: [`id`, `stripeCustomerId`, `userId`, `subscriptions`],
}

export const ACCOUNT_SELECTION = {
  ESSENTIAL_INFO: [
    `id`,
    `userId`,
    `provider`,
    `providerAccountId`,
    `createdAt`,
  ],
}

export const LESSON_SELECTION = {
  ESSENTIAL_INFO: [
    `id`,
    `order`,
    `href`,
    `title`,
    `description`,
    `slug`,
    `access`,
    `createdAt`,
    `updatedAt`,
    `sectionId`,
  ],
}

export const SUBSCRIPTION_SELECTION = {
  STRIPPED_INFO: [`id`, `plan`, `status`],
  ESSENTIAL_INFO: [
    `id`,
    `stripeSubscriptionId`,
    `plan`,
    `status`,
    `startDate`,
    `endDate`,
  ],
}

export const USER_LESSON_PROGRESS_SELECTION = {
  ESSENTIAL_INFO: [`id`, `userId`, `lessonId`, `completed`, `completedAt`],
}

export const COURSE_SELECTION = {
  ESSENTIAL_INFO: [
    `id`,
    `order`,
    `title`,
    `description`,
    `href`,
    `slug`,
    `createdAt`,
    `updatedAt`,
  ],
}

export const SECTION_SELECTION = {
  ESSENTIAL_INFO: [
    `id`,
    `order`,
    `title`,
    `description`,
    `href`,
    `body`,
    `slug`,
    `courseId`,
    `createdAt`,
    `updatedAt`,
  ],
}

export const PROBLEM_SELECTION = {
  ESSENTIAL_INFO: [
    `id`,
    `title`,
    `href`,
    `difficulty`,
    `lessonId`,
    `createdAt`,
    `updatedAt`,
  ],
}

export const USER_PROBLEM_PROGRESS_SELECTION = {
  ESSENTIAL_INFO: [`id`, `userId`, `problemId`, `completed`, `completedAt`],
}

export const BANNER_SELECTION = {
  ESSENTIAL_INFO: [
    `id`,
    `title`,
    `message`,
    `type`,
    `linkText`,
    `linkUrl`,
    `isActive`,
    `startDate`,
    `endDate`,
    `priority`,
  ],
}
