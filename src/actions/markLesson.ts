'use server'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export type MarkLessonArgs = {
  userId?: string
  lessonId?: string
  completed: boolean
}

export async function markLesson({
  userId,
  lessonId,
  completed,
}: MarkLessonArgs) {
  try {
    if (!userId) throw new Error('User unauthenticated')
    if (!lessonId) throw new Error('Lesson not found')

    const userProgress = await prisma.userProgress.upsert({
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

    return userProgress
  } catch (error) {
    console.error(error)
    throw new Error('Internal Server Error')
  }
}
