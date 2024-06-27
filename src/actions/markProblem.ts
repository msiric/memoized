'use server'

import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export type MarkProblemArgs = {
  problemId?: string
  completed: boolean
}

export async function markProblem({ problemId, completed }: MarkProblemArgs) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) throw new Error('User unauthenticated')
    if (!problemId) throw new Error('Problem not found')

    const userId = session.userId

    await prisma.userProblemProgress.upsert({
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

    return {
      message: true,
    }
  } catch (error) {
    console.error(error)
    throw new Error('Internal Server Error')
  }
}
