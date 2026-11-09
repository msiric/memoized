import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { filterAndSortProblems } from '@/utils/helpers'
import { getServerSession } from 'next-auth'
import { revalidateProblemProgress } from '@/lib/cache'
import { ServiceError } from '@/lib/sentry'
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

// Bodies are excluded: sending all 508 serialized questions and answers made
// /problems a 32 MB document. The drawer fetches one problem via getProblemContent.
const problemListSelect = {
  id: true,
  lessonId: true,
  contentId: true,
  title: true,
  href: true,
  difficulty: true,
  type: true,
  lesson: {
    select: {
      title: true,
      slug: true,
      href: true,
    },
  },
} as const

export const getProblemContent = async (id: string) =>
  prisma.problem.findUnique({
    where: { id },
    select: {
      id: true,
      question: true,
      serializedQuestion: true,
      serializedAnswer: true,
    },
  })

const getAllProblemsAndLessons = async () => {
  const [problems, lessons] = await Promise.all([
    prisma.problem.findMany({ select: problemListSelect }),
    prisma.lesson.findMany({
      orderBy: { title: 'asc' },
      select: { id: true, title: true, slug: true, href: true },
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
        ...problemListSelect,
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
      select: { id: true, title: true, slug: true, href: true },
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
