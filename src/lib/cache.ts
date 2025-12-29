import { revalidatePath, revalidateTag } from 'next/cache'
import { COURSES_PREFIX } from '@/constants'

export const CacheTags = {
  USER: 'user',
  USER_SUBSCRIPTION: 'user-subscription',
  ACCOUNT: 'account',

  SUBSCRIPTION: 'subscription',
  BANNERS: 'banners',
} as const

export const buildTag = {
  user: (userId: string) => `user-${userId}` as const,
  customer: (customerId: string) => `customer-${customerId}` as const,
  subscription: (subscriptionId: string) =>
    `subscription-${subscriptionId}` as const,
  account: (accountId: string) => `account-${accountId}` as const,
  lesson: (lessonId: string) => `lesson-${lessonId}` as const,
  problem: (problemId: string) => `problem-${problemId}` as const,
}

type SubscriptionCacheParams = {
  customerId: string
  userId: string
  subscriptionId: string
}

export const revalidateSubscription = ({
  customerId,
  userId,
  subscriptionId,
}: SubscriptionCacheParams): void => {
  revalidateTag(CacheTags.SUBSCRIPTION)
  revalidateTag(buildTag.subscription(subscriptionId))
  revalidateTag(buildTag.customer(customerId))
  revalidateTag(buildTag.user(userId))
  revalidateTag(CacheTags.USER_SUBSCRIPTION)
  revalidateTag(CacheTags.USER)
  revalidateTag(CacheTags.ACCOUNT)
}

type CustomerCacheParams = {
  userId: string
  stripeCustomerId: string
}

export const revalidateCustomer = ({
  userId,
  stripeCustomerId,
}: CustomerCacheParams): void => {
  revalidateTag(buildTag.user(userId))
  revalidateTag(buildTag.customer(stripeCustomerId))
}

type AccountCacheParams = {
  userId: string
  providerAccountId: string
}

export const revalidateAccount = ({
  userId,
  providerAccountId,
}: AccountCacheParams): void => {
  revalidateTag(CacheTags.ACCOUNT)
  revalidateTag(buildTag.account(providerAccountId))
  revalidateTag(CacheTags.USER)
  revalidateTag(buildTag.user(userId))
}

type ProgressCacheParams = {
  userId: string
}

type LessonProgressCacheParams = ProgressCacheParams & {
  lessonId: string
}

export const revalidateLessonProgress = ({
  userId,
  lessonId,
}: LessonProgressCacheParams): void => {
  revalidatePath(COURSES_PREFIX, 'layout')
  revalidateTag(buildTag.user(userId))
  revalidateTag(buildTag.lesson(lessonId))
}

type ProblemProgressCacheParams = ProgressCacheParams & {
  problemId: string
}

export const revalidateProblemProgress = ({
  userId,
  problemId,
}: ProblemProgressCacheParams): void => {
  revalidatePath(COURSES_PREFIX, 'layout')
  revalidateTag(buildTag.user(userId))
  revalidateTag(buildTag.problem(problemId))
}

export const revalidateBanners = (): void => {
  revalidateTag(CacheTags.BANNERS)
}
