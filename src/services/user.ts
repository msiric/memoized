import prisma from '@/lib/prisma'
import { UserWithSubscriptionsAndProgress } from '@/types'
import { ServiceError } from '@/utils/error'
import {
  buildCurriculum,
  calculateProgress,
  checkSubscriptionStatus,
  sortCurriculum,
  sortProblemList,
} from '@/utils/helpers'

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

export const getLessonsAndProblems = async () => {
  const [allLessons, allProblems] = await Promise.all([
    prisma.lesson.findMany({
      select: {
        id: true,
        title: true,
        href: true,
        description: true,
        access: true,
        order: true,
        slug: true,
        section: {
          select: {
            id: true,
            title: true,
            href: true,
            body: true,
            order: true,
            slug: true,
            description: true,
            course: {
              select: {
                id: true,
                title: true,
                description: true,
                slug: true,
                order: true,
                href: true,
              },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    }),
    prisma.problem.findMany({
      select: { id: true, title: true, difficulty: true, href: true },
    }),
  ])
  return { allLessons, allProblems }
}

export const getLessonsWithProblems = async () => {
  const allLessons = await prisma.lesson.findMany({
    select: {
      id: true,
      title: true,
      href: true,
      description: true,
      access: true,
      slug: true,
      order: true,
      section: {
        select: {
          order: true,
        },
      },
      problems: {
        select: {
          id: true,
          title: true,
          href: true,
          difficulty: true,
        },
      },
    },
    orderBy: { order: 'asc' },
  })
  return { allLessons }
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
