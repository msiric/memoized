'use server'

import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export type MarkLessonArgs = {
  lessonId?: string
  completed: boolean
}

export async function markLesson({ lessonId, completed }: MarkLessonArgs) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) throw new Error('User unauthenticated')
    if (!lessonId) throw new Error('Lesson not found')

    const userId = session.userId

    const userLessonProgress = await prisma.userLessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: userId,
          lessonId: lessonId,
        },
      },
      update: {
        completed: completed,
        completedAt: new Date(),
      },
      create: {
        userId: userId,
        lessonId: lessonId,
        completed: completed,
        completedAt: new Date(),
      },
    })

    return userLessonProgress
  } catch (error) {
    console.error(error)
    throw new Error('Internal Server Error')
  }
}
