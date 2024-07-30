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
  getLessonsAndProblemsCounts,
  getLessonsWithProblems,
} from './lesson'
import { getResources } from './resource'

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
  const user = userId ? await getUserWithSubscriptionDetails(userId) : null
  const { allLessons, allProblems } = await getLessonsAndProblems()

  const curriculum = buildCurriculum(allLessons)
  const sortedContent = sortCurriculum(curriculum)

  const lessons = allLessons.map(
    ({ id, href, title, description, access }) => ({
      id,
      href,
      title,
      description,
      access,
    }),
  )

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
    lessons,
    problems,
  }
}

export const getUserProgressWithResources = async (userId?: string) => {
  const user = userId ? await getUserWithSubscriptionDetails(userId) : null
  const [{ allResources }, { lessonCount, problemCount }] = await Promise.all([
    getResources(),
    getLessonsAndProblemsCounts(),
  ])

  const sortedContent = sortResources(allResources)

  const progress = user
    ? calculateProgress(user, lessonCount, problemCount)
    : null

  const enrichedUser = (
    user ? { ...user, ...progress } : null
  ) as UserWithSubscriptionsAndProgress

  return {
    user: enrichedUser,
    resources: sortedContent,
  }
}

export const getUserProgressWithProblems = async (userId?: string) => {
  const user = userId ? await getUserWithSubscriptionDetails(userId) : null
  const { allLessons } = await getLessonsWithProblems()

  const sortedContent = sortProblemList(allLessons)

  const lessons = sortedContent?.map(
    ({ id, href, title, description, access }) => ({
      id,
      href,
      title,
      description,
      access,
    }),
  )

  const problems = sortedContent?.flatMap((lesson) =>
    lesson.problems.map(({ id, title, href, difficulty }) => ({
      id,
      title,
      href,
      difficulty,
    })),
  )

  const progress = user
    ? calculateProgress(user, lessons ?? [], problems ?? [])
    : null

  const enrichedUser = (
    user ? { ...user, ...progress } : null
  ) as UserWithSubscriptionsAndProgress

  return {
    user: enrichedUser,
    problemList: sortedContent,
    lessons,
    problems,
  }
}
