import prisma from '@/lib/prisma'
import { UserWithSubscriptionsAndProgress } from '@/types'
import { ServiceError } from '@/utils/error'
import {
  buildCurriculum,
  calculateProgress,
  checkSubscriptionStatus,
  sortCurriculum,
  sortProblemList,
  sortResources,
} from '@/utils/helpers'
import {
  getLessonsAndProblems,
  getLessonsWithProblems,
  getLessonsWithResourcesAndProblems,
} from './lesson'

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

export const getUserWithSubscriptions = async (userId: string) => {
  return getUserWithSubscriptionDetails(userId)
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

  const currentSubscription = user.customer?.subscriptions[0] ?? null
  const currentSubscriptionPlan = currentSubscription?.plan ?? null
  const currentSubscriptionStatus = currentSubscription
    ? checkSubscriptionStatus(currentSubscription)
    : null

  return {
    ...user,
    currentSubscriptionPlan,
    currentSubscriptionStatus,
  }
}

export const getUserProgressWithCurriculum = async (userId?: string) => {
  const [user, { allLessons, allProblems }] = await Promise.all([
    userId ? getUserWithSubscriptionDetails(userId) : Promise.resolve(null),
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
    curriculum: sortedContent,
    lessons: allLessons,
    problems,
  }
}

export const getUserProgressWithResources = async (userId?: string) => {
  const [user, { allLessons }] = await Promise.all([
    userId ? getUserWithSubscriptionDetails(userId) : Promise.resolve(null),
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
    lessons: lessons,
  }
}

export const getUserProgressWithProblems = async (userId?: string) => {
  const [user, { allLessons }] = await Promise.all([
    userId ? getUserWithSubscriptionDetails(userId) : Promise.resolve(null),
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
    problemList: sortedContent,
    lessons: allLessons,
    problems,
  }
}
