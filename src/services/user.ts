import prisma from '@/lib/prisma'
import { UserWithSubscriptionsAndProgress } from '@/types'
import { reportErrorSafely, ServiceError } from '@/lib/sentry'
import type { ProgressSnapshotResult } from '@/types/progress'
import {
  buildCurriculum,
  calculateProgress,
  checkSubscriptionStatus,
  isOwnerByEmail,
  sortCurriculum,
  sortProblemList,
  sortResources,
} from '@/utils/helpers'
import {
  getLessonsAndProblems,
  getLessonsWithProblems,
  getLessonsWithResourcesAndProblems,
} from './lesson'
import { Prisma, SubscriptionStatus } from '@prisma/client'

type ProgressUser = {
  id: string
  lessonProgress: { lessonId: string }[]
  problemProgress: { problemId: string }[]
}

async function readProgressUser<T extends ProgressUser>(
  userId: string | undefined,
  readUser: (userId: string) => Promise<T | null>,
): Promise<{ user: T | null; progress: ProgressSnapshotResult }> {
  if (userId === undefined) {
    return {
      user: null,
      progress: { status: 'anonymous', userId: null, completedLessons: [], completedProblems: [] },
    }
  }
  let user: T | null
  try {
    user = await readUser(userId)
  } catch (error) {
    if (!(error instanceof ServiceError) &&
        !(error instanceof Prisma.PrismaClientKnownRequestError) &&
        !(error instanceof Prisma.PrismaClientInitializationError)) throw error
    reportErrorSafely(error, { userId, feature: 'progress', action: 'read-snapshot' })
    return {
      user: null,
      progress: { status: 'unavailable', userId, message: 'Saved progress is unavailable. Please retry.' },
    }
  }
  if (!user) {
    reportErrorSafely('Authenticated progress user not found', { userId, feature: 'progress', action: 'read-snapshot' })
    return {
      user: null,
      progress: { status: 'unavailable', userId, message: 'Your account could not be loaded. Please sign in again.' },
    }
  }
  return {
    user,
    progress: {
      status: 'ready',
      userId: user.id,
      completedLessons: user.lessonProgress.map(({ lessonId }) => lessonId),
      completedProblems: user.problemProgress.map(({ problemId }) => problemId),
    },
  }
}

export const getUserProgressSnapshot = async (userId: string): Promise<ProgressSnapshotResult> => {
  const { progress } = await readProgressUser(userId, (id) => prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      lessonProgress: { where: { completed: true }, select: { lessonId: true } },
      problemProgress: { where: { completed: true }, select: { problemId: true } },
    },
  }))
  return progress
}

export const getUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    throw new ServiceError('Failed to retrieve user details')
  }

  return user
}

export const getUserWithSubscriptionDetails = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      customer: {
        select: {
          subscriptions: {
            orderBy: { startDate: 'desc' },
            take: 1,
          },
        },
      },
      lessonProgress: {
        where: {
          completed: true,
        },
        select: {
          lessonId: true,
          completed: true,
        },
      },
      problemProgress: {
        where: {
          completed: true,
        },
        select: {
          problemId: true,
          completed: true,
        },
      },
    },
  })

  if (!user) {
    return null
  }

  const isOwner = isOwnerByEmail(user?.email)

  const currentSubscription = user.customer?.subscriptions[0] ?? null
  const currentSubscriptionPlan = currentSubscription?.plan ?? null
  const currentSubscriptionStatus = currentSubscription
    ? checkSubscriptionStatus(currentSubscription)
    : null

  return {
    ...user,
    currentSubscriptionPlan,
    currentSubscriptionStatus,
    isOwner,
  }
}

export const getUserProgressWithCurriculum = async (userId?: string) => {
  const [{ user, progress: progressSnapshot }, { allLessons, allProblems }] = await Promise.all([
    readProgressUser(userId, getUserWithSubscriptionDetails),
    getLessonsAndProblems(),
  ])

  const curriculum = buildCurriculum(allLessons)
  const sortedContent = sortCurriculum(curriculum)

  const problems = allProblems.map(({ id }) => ({ id }))

  const progress = user
    ? calculateProgress(user, allLessons, allProblems)
    : null

  const enrichedUser = (
    user ? { ...user, ...progress } : null
  ) as UserWithSubscriptionsAndProgress

  return {
    user: enrichedUser,
    progress: progressSnapshot,
    curriculum: sortedContent,
    lessons: allLessons,
    problems,
  }
}

export const getUserProgressWithResources = async (userId?: string) => {
  const [{ user, progress: progressSnapshot }, { allLessons }] = await Promise.all([
    readProgressUser(userId, getUserWithSubscriptionDetails),
    getLessonsWithResourcesAndProblems(),
  ])

  const sortedContent = sortResources(allLessons)

  const lessons = sortedContent?.filter((lesson) => !!lesson.resources?.length)

  const problems = sortedContent?.flatMap((lesson) =>
    lesson.problems?.map(({ id, title, href, difficulty }) => ({
      id,
      title,
      href,
      difficulty,
    })),
  )

  const progress = user
    ? calculateProgress(user, allLessons, problems ?? 0)
    : null

  const enrichedUser = (
    user ? { ...user, ...progress } : null
  ) as UserWithSubscriptionsAndProgress

  return {
    user: enrichedUser,
    progress: progressSnapshot,
    lessons: lessons,
  }
}

export const getUserProgressWithProblems = async (userId?: string) => {
  const [{ user, progress: progressSnapshot }, { allLessons }] = await Promise.all([
    readProgressUser(userId, getUserWithSubscriptionDetails),
    getLessonsWithProblems(),
  ])

  const sortedContent = sortProblemList(allLessons)

  const problems = sortedContent?.flatMap((lesson) =>
    lesson.problems.map(({ id, title, href, difficulty }) => ({
      id,
      title,
      href,
      difficulty,
    })),
  )

  const progress = user
    ? calculateProgress(user, allLessons ?? [], problems ?? [])
    : null

  const enrichedUser = (
    user ? { ...user, ...progress } : null
  ) as UserWithSubscriptionsAndProgress

  return {
    user: enrichedUser,
    progress: progressSnapshot,
    problemList: sortedContent,
    lessons: allLessons,
    problems,
  }
}

/**
 * Check if a user has premium access (via subscription or owner status).
 */
export const checkPremiumAccess = async (userId?: string): Promise<boolean> => {
  if (!userId) return false

  const user = await getUserWithSubscriptionDetails(userId)
  if (!user) return false

  return user.isOwner || user.currentSubscriptionStatus === SubscriptionStatus.ACTIVE
}
