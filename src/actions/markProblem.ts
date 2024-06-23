'use server'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export type MarkProblemArgs = {
  userId?: string
  problemId?: string
  completed: boolean
}

export async function markProblem({
  userId,
  problemId,
  completed,
}: MarkProblemArgs) {
  try {
    if (!userId) throw new Error('User unauthenticated')
    if (!problemId) throw new Error('Problem not found')

    const userProblemProgress = await prisma.userProblemProgress.upsert({
      where: {
        userId_problemId: {
          userId: userId,
          problemId: problemId,
        },
      },
      update: {
        completed: completed,
        completedAt: new Date(),
      },
      create: {
        userId: userId,
        problemId: problemId,
        completed: completed,
        completedAt: new Date(),
      },
    })

    return userProblemProgress
  } catch (error) {
    console.error(error)
    throw new Error('Internal Server Error')
  }
}
