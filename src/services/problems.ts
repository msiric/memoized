import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { ProblemStatus } from '@/types'
import { filterAndSortProblems } from '@/utils/helpers'
import { ProblemDifficulty } from '@prisma/client'
import { getServerSession } from 'next-auth'

export interface ProblemFilter {
  difficulty?: ProblemDifficulty
  status?: ProblemStatus
  lesson?: string
  search?: string
  sortColumn?: string
  sortOrder?: 'asc' | 'desc'
}

export async function getProblems(filter: ProblemFilter = {}) {
  const session = await getServerSession(authOptions)

  const { difficulty, status, lesson, search, sortColumn, sortOrder } = filter

  const [problems, lessons] = await Promise.all([
    prisma.problem.findMany({
      include: {
        lesson: {
          select: {
            title: true,
            slug: true,
          },
        },
        problemProgress: {
          where: {
            userId: session?.userId ?? '',
          },
          select: {
            completed: true,
            completedAt: true,
          },
        },
      },
    }),
    prisma.lesson.findMany({
      orderBy: { title: 'asc' },
      select: { title: true, slug: true },
    }),
  ])

  const filteredProblems = filterAndSortProblems(problems, {
    difficulty,
    status,
    lesson,
    search,
    sortColumn,
    sortOrder,
  })

  return { filteredProblems, allProblems: problems, lessons }
}
