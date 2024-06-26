import { UserWithSubscriptionsAndProgress } from '@/services/user'
import { ProblemRow, ProblemStatus } from '@/types'
import {
  AccessOptions,
  ProblemDifficulty,
  SubscriptionStatus,
} from '@prisma/client'

const DIFFICULTY_ORDER = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
}

export interface ProblemFilter {
  difficulty?: ProblemDifficulty
  status?: ProblemStatus
  lesson?: string
  search?: string
  sortColumn?: string
  sortOrder?: 'asc' | 'desc'
}

export const isServer = typeof window === 'undefined'

export const remToPx = (remValue: number) => {
  const rootFontSize =
    typeof window === 'undefined'
      ? 16
      : parseFloat(window.getComputedStyle(document.documentElement).fontSize)

  return remValue * rootFontSize
}

export const toDateTime = (secs: number) => {
  var t = new Date(+0) // Unix epoch start.
  t.setSeconds(secs)
  return t
}

export const userHasAccess = (
  user: UserWithSubscriptionsAndProgress | null | undefined,
  access: AccessOptions | undefined,
) =>
  user === undefined ||
  access === undefined ||
  access === AccessOptions.FREE ||
  (access === AccessOptions.PREMIUM &&
    user?.currentSubscriptionStatus === SubscriptionStatus.ACTIVE)

export const capitalizeFirstLetter = (str: string) => {
  if (typeof str !== 'string' || str.length === 0) {
    return ''
  }
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export const getInitials = (name: string) => {
  if (typeof name !== 'string' || name.trim() === '') {
    return ''
  }

  name = name.trim().replace(/\s+/g, ' ')

  const words = name.split(' ')

  const initials = words.map((word) => {
    if (word.includes('-')) {
      return word
        .split('-')
        .map((part) => part.charAt(0).toUpperCase())
        .join('')
    } else {
      return word.charAt(0).toUpperCase()
    }
  })

  return initials.join('')
}

export const filterAndSortProblems = (
  problems: ProblemRow[],
  filter: ProblemFilter,
) => {
  const { difficulty, status, lesson, search, sortColumn, sortOrder } = filter

  let filteredProblems = [...problems]

  if (search) {
    filteredProblems = filteredProblems.filter((problem) =>
      problem.title.toLowerCase().includes(search.toLowerCase()),
    )
  }

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
      (problem) => lesson === problem.lesson.slug,
    )
  }

  if (sortColumn) {
    filteredProblems.sort((a, b) => {
      if (sortColumn === 'title') {
        return sortOrder === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title)
      }
      if (sortColumn === 'difficulty') {
        return sortOrder === 'asc'
          ? DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]
          : DIFFICULTY_ORDER[b.difficulty] - DIFFICULTY_ORDER[a.difficulty]
      }
      if (sortColumn === 'lesson') {
        return sortOrder === 'asc'
          ? a.lesson.title.localeCompare(b.lesson.title)
          : b.lesson.title.localeCompare(a.lesson.title)
      }
      return 0
    })
  }

  return filteredProblems
}
