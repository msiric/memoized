import prisma from '@/lib/prisma'
import { Curriculum, SubscriptionStatus } from '@/types'
import { Prisma, Subscription, SubscriptionPlan } from '@prisma/client'

export async function getUserWithSubscriptions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        orderBy: { startDate: 'desc' },
        take: 1,
      },
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const currentSubscription =
    (user?.subscriptions?.length ?? 0) > 0 ? user?.subscriptions[0] : null

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

export type UserWithSubscriptionsAndProgress = Prisma.UserGetPayload<{
  include: {
    subscriptions: {
      orderBy: { startDate: 'desc' }
      take: 1
    }
    lessonProgress: {
      where: {
        completed: true
      }
    }
  }
}> & {
  currentSubscriptionPlan: SubscriptionPlan | null
  currentSubscriptionStatus: SubscriptionStatus | null
  currentProgress: number
}

export async function getUserProgressWithLessons(userId?: string) {
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptions: {
            orderBy: { startDate: 'desc' },
            take: 1,
          },
          lessonProgress: {
            where: {
              completed: true,
            },
          },
        },
      })
    : null

  const currentSubscription =
    (user?.subscriptions?.length ?? 0) > 0 ? user?.subscriptions[0] : null

  const currentSubscriptionPlan = currentSubscription
    ? currentSubscription.plan
    : null

  const currentSubscriptionStatus = currentSubscription
    ? checkSubscriptionStatus(currentSubscription)
    : null

  const allLessons = await prisma.lesson.findMany({
    include: {
      section: {
        include: {
          course: true,
        },
      },
    },
  })

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

  const completedLessons = user?.lessonProgress.filter((p) => p.completed)
    .length
  const currentProgress =
    allLessons?.length > 0
      ? (completedLessons ?? 0 / allLessons.length) * 100
      : 0

  return {
    user: user
      ? {
          ...user,
          currentSubscriptionPlan,
          currentSubscriptionStatus,
          currentProgress,
        }
      : null,
    curriculum,
    lessons,
  }
}

function checkSubscriptionStatus(
  subscription: Subscription,
): SubscriptionStatus {
  const now = new Date()
  if (subscription.status === 'ACTIVE') {
    return 'ACTIVE'
  } else if (subscription.status === 'CANCELED') {
    return 'CANCELED'
  } else if (subscription.endDate && new Date(subscription.endDate) <= now) {
    return 'EXPIRED'
  } else {
    return 'UNKNOWN'
  }
}
