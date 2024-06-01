import prisma from '@/lib/prisma'
import { Subscription } from '@prisma/client'

export async function getUserWithCalculatedFields(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        orderBy: { startDate: 'desc' },
        take: 1,
      },
      progress: true,
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const currentSubscription =
    user.subscriptions.length > 0 ? user.subscriptions[0] : null
  const currentSubscriptionStatus = currentSubscription
    ? checkSubscriptionStatus(currentSubscription)
    : null

  const totalLessons = await prisma.lesson.count()
  const completedLessons = user.progress.filter((p) => p.completed).length
  const currentProgress =
    totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0

  return {
    ...user,
    currentSubscription: currentSubscriptionStatus,
    currentProgress,
  }
}

function checkSubscriptionStatus(subscription: Subscription) {
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
