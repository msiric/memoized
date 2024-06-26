import prisma from '@/lib/prisma'
import { ProblemStatus } from '@/types'
import { ProblemDifficulty } from '@prisma/client'

export interface ProblemFilter {
  difficulty?: ProblemDifficulty
  status?: ProblemStatus
  lesson?: string
  search?: string
  sortColumn?: string
  sortOrder?: 'asc' | 'desc'
}

export async function getProblems(filter: ProblemFilter = {}) {
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
          select: {
            completed: true,
          },
        },
      },
    }),
    prisma.lesson.findMany({
      orderBy: { title: 'asc' },
      select: { title: true, slug: true },
    }),
  ])

  let filteredProblems = problems

  if (difficulty) {
    filteredProblems = filteredProblems.filter(
      (problem) => problem.difficulty === difficulty,
    )
  }

  if (status) {
    filteredProblems = filteredProblems.filter((problem) =>
      status === 'COMPLETED'
        ? problem.problemProgress.some((progress) => progress.completed)
        : problem.problemProgress.every((progress) => !progress.completed),
    )
  }

  if (lesson) {
    filteredProblems = filteredProblems.filter(
      (problem) => problem.lesson.slug === lesson,
    )
  }

  if (search) {
    filteredProblems = filteredProblems.filter((problem) =>
      problem.title.toLowerCase().includes(search.toLowerCase()),
    )
  }

  if (sortColumn && sortOrder) {
    const difficultyOrder = {
      EASY: 1,
      MEDIUM: 2,
      HARD: 3,
    }

    filteredProblems.sort((a, b) => {
      if (sortColumn === 'title') {
        return sortOrder === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title)
      }
      if (sortColumn === 'difficulty') {
        return sortOrder === 'asc'
          ? difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
          : difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty]
      }
      if (sortColumn === 'lesson') {
        return sortOrder === 'asc'
          ? a.lesson.title.localeCompare(b.lesson.title)
          : b.lesson.title.localeCompare(a.lesson.title)
      }
      return 0
    })
  }

  return { filteredProblems, allProblems: problems, lessons }
}
