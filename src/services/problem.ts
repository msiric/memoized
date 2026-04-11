import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { filterAndSortProblems } from '@/utils/helpers'
import { getServerSession } from 'next-auth'
import { revalidateProblemProgress } from '@/lib/cache'
import { ServiceError } from '@/lib/error-tracking'
import { ProblemFilter } from '../types'

export type MarkProblemArgs = {
  userId: string
  problemId: string
  completed: boolean
}

export const markProblemProgress = async ({
  userId,
  problemId,
  completed,
}: MarkProblemArgs) => {
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    select: { id: true },
  })

  if (!problem) {
    throw new ServiceError('Problem not found', true, {
      feature: 'problem',
      action: 'mark-progress',
    })
  }

  const result = await prisma.userProblemProgress.upsert({
    where: {
      userId_problemId: {
        userId,
        problemId,
      },
    },
    update: {
      completed,
      completedAt: new Date(),
    },
    create: {
      userId,
      problemId,
      completed,
      completedAt: new Date(),
    },
  })

  revalidateProblemProgress({ userId, problemId })

  return result
}

const getAllProblemsAndLessons = async () => {
  const [problems, lessons] = await Promise.all([
    prisma.problem.findMany({
      select: {
        id: true,
        title: true,
        href: true,
        link: true,
        difficulty: true,
        question: true,
        type: true,
        slug: true,
        serializedAnswer: true,
        lesson: {
          select: {
            title: true,
            slug: true,
            href: true,
          },
        },
      },
    }),
    prisma.lesson.findMany({
      orderBy: { title: 'asc' },
      select: { title: true, slug: true },
    }),
  ])
  return { problems, lessons }
}

export const getProblems = async (filter: ProblemFilter = {}) => {
  const session = await getServerSession(authOptions)
  const userId = session?.userId

  const { difficulty, status, lesson, type, search, sortColumn, sortOrder } =
    filter

  if (!userId) {
    const { problems, lessons } = await getAllProblemsAndLessons()
    
    const problemsWithEmptyProgress = problems.map(p => ({
      ...p,
      problemProgress: [],
    }))

    const filteredProblems = filterAndSortProblems(problemsWithEmptyProgress, {
      difficulty,
      status,
      lesson,
      type,
      search,
      sortColumn,
      sortOrder,
    })

    return { filteredProblems, allProblems: problemsWithEmptyProgress, lessons }
  }

  const [problems, lessons] = await Promise.all([
    prisma.problem.findMany({
      select: {
        id: true,
        title: true,
        href: true,
        link: true,
        difficulty: true,
        question: true,
        type: true,
        slug: true,
        serializedAnswer: true,
        lesson: {
          select: {
            title: true,
            slug: true,
            href: true,
          },
        },
        problemProgress: {
          where: {
            userId,
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
    type,
    search,
    sortColumn,
    sortOrder,
  })

  return { filteredProblems, allProblems: problems, lessons }
}
