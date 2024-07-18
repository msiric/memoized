import prisma from '@/lib/prisma'
import { Curriculum } from '@/types'
import { ServiceError } from '@/utils/error'
import { checkSubscriptionStatus } from '@/utils/helpers'

export const getUserWithSubscriptions = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      customer: {
        include: {
          subscriptions: {
            orderBy: { startDate: 'desc' },
            take: 1,
          },
        },
      },
    },
  })

  if (!user) {
    throw new ServiceError('Failed to retrieve user details')
  }

  const currentSubscription =
    (user?.customer?.subscriptions?.length ?? 0) > 0
      ? user?.customer?.subscriptions[0]
      : null

  const currentSubscriptionPlan = currentSubscription
    ? currentSubscription.plan
    : null

  const currentSubscriptionStatus = currentSubscription
    ? checkSubscriptionStatus(currentSubscription)
    : null

  return {
    ...user,
    currentSubscriptionPlan,
    currentSubscriptionStatus,
  }
}

export const getUserProgressWithLessons = async (userId?: string) => {
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        include: {
          customer: {
            include: {
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
    : null

  const currentSubscription =
    (user?.customer?.subscriptions?.length ?? 0) > 0
      ? user?.customer?.subscriptions[0]
      : null

  const currentSubscriptionPlan = currentSubscription
    ? currentSubscription.plan
    : null

  const currentSubscriptionStatus = currentSubscription
    ? checkSubscriptionStatus(currentSubscription)
    : null

  const [allLessons, allProblems] = await Promise.all([
    prisma.lesson.findMany({
      include: {
        section: {
          include: {
            course: true,
          },
        },
      },
    }),
    prisma.problem.findMany(),
  ])

  const curriculum: Curriculum[] = allLessons.reduce<Curriculum[]>(
    (acc, lesson) => {
      const {
        id: courseId,
        slug: courseSlug,
        title: courseTitle,
        order: courseOrder,
        description: courseDescription,
      } = lesson.section.course
      const {
        id: sectionId,
        slug: sectionSlug,
        title: sectionTitle,
        order: sectionOrder,
        description: sectionDescription,
        href: sectionHref,
      } = lesson.section
      const {
        id: lessonId,
        slug: lessonSlug,
        title: lessonTitle,
        order: lessonOrder,
        description: lessonDescription,
        access: lessonAccess,
        href: lessonHref,
      } = lesson

      let course = acc.find((course) => course.id === courseId)
      if (!course) {
        course = {
          id: courseId,
          slug: courseSlug,
          title: courseTitle,
          description: courseDescription,
          order: courseOrder,
          sections: [],
        }
        acc.push(course)
      }

      let section = course.sections.find((sec) => sec.id === sectionId)
      if (!section) {
        section = {
          id: sectionId,
          slug: sectionSlug,
          title: sectionTitle,
          description: sectionDescription,
          order: sectionOrder,
          href: sectionHref,
          lessons: [],
        }
        course.sections.push(section)
      }

      section.lessons.push({
        id: lessonId,
        slug: lessonSlug,
        title: lessonTitle,
        href: lessonHref,
        description: lessonDescription,
        access: lessonAccess,
        order: lessonOrder,
      })

      return acc
    },
    [],
  )

  const lessons = allLessons.map((item) => ({
    id: item.id,
    href: item.href,
    title: item.title,
    description: item.description,
    access: item.access,
  }))

  const problems = allProblems.map((item) => ({
    id: item.id,
  }))

  const completedLessons = user?.lessonProgress.filter(
    (p) => p.completed,
  ).length
  const currentLessonProgress =
    allLessons?.length > 0
      ? (completedLessons ?? 0 / allLessons.length) * 100
      : 0

  const completedProblems = user?.problemProgress.filter(
    (p) => p.completed,
  ).length
  const currentProblemProgress =
    allProblems?.length > 0
      ? (completedProblems ?? 0 / allProblems.length) * 100
      : 0

  return {
    user: user
      ? {
          ...user,
          currentSubscriptionPlan,
          currentSubscriptionStatus,
          currentLessonProgress,
          currentProblemProgress,
        }
      : null,
    curriculum,
    lessons,
    problems,
  }
}

export const getUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new ServiceError('Failed to retrieve user details')
  }

  return user
}
