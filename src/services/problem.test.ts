import prisma from '@/lib/prisma'
import {
  ProblemFilter,
  getProblems,
  markProblemProgress,
} from '@/services/problem'
import { filterAndSortProblems } from '@/utils/helpers'
import { ProblemDifficulty } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { Mock, afterEach, describe, expect, it, vi } from 'vitest'

// Mocking the Prisma client and getServerSession
vi.mock('@/lib/prisma', () => {
  const actualPrisma = vi.importActual('@/lib/prisma')
  return {
    ...actualPrisma,
    default: {
      userProblemProgress: {
        upsert: vi.fn(),
      },
      problem: {
        findMany: vi.fn(),
      },
      lesson: {
        findMany: vi.fn(),
      },
    },
  }
})

vi.mock('next-auth', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('next-auth')
  return {
    ...actual,
    getServerSession: vi.fn(),
  }
})

vi.mock('@/utils/helpers', () => ({
  filterAndSortProblems: vi.fn(),
}))

describe('Problem Services', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('markProblemProgress', () => {
    it('should mark problem progress', async () => {
      const mockProgress = {
        userId: '1',
        problemId: '1',
        completed: true,
        completedAt: new Date(),
      }
      ;(prisma.userProblemProgress.upsert as Mock).mockResolvedValue(
        mockProgress,
      )

      const progress = await markProblemProgress({
        userId: '1',
        problemId: '1',
        completed: true,
      })
      expect(progress).toEqual(mockProgress)
      expect(prisma.userProblemProgress.upsert).toHaveBeenCalledWith({
        where: {
          userId_problemId: {
            userId: '1',
            problemId: '1',
          },
        },
        update: {
          completed: true,
          completedAt: expect.any(Date),
        },
        create: {
          userId: '1',
          problemId: '1',
          completed: true,
          completedAt: expect.any(Date),
        },
      })
    })
  })

  describe('getProblems', () => {
    it('should return filtered and sorted problems', async () => {
      const mockSession = { userId: '1' }
      ;(getServerSession as Mock).mockResolvedValue(mockSession)

      const mockProblems = [
        {
          id: '1',
          lesson: { title: 'Lesson 1', slug: 'lesson-1' },
          problemProgress: [{ completed: true, completedAt: new Date() }],
        },
      ]
      const mockLessons = [{ title: 'Lesson 1', slug: 'lesson-1' }]
      ;(prisma.problem.findMany as Mock).mockResolvedValue(mockProblems)
      ;(prisma.lesson.findMany as Mock).mockResolvedValue(mockLessons)

      const filteredProblems = [mockProblems[0]]
      ;(filterAndSortProblems as Mock).mockReturnValue(filteredProblems)

      const filter: ProblemFilter = {
        difficulty: ProblemDifficulty.EASY,
        status: 'TODO',
        lesson: 'lesson-1',
        search: 'problem',
        sortColumn: 'title',
        sortOrder: 'asc',
      }

      const result = await getProblems(filter)
      expect(result).toEqual({
        filteredProblems,
        allProblems: mockProblems,
        lessons: mockLessons,
      })
      expect(prisma.problem.findMany).toHaveBeenCalled()
      expect(prisma.lesson.findMany).toHaveBeenCalledWith({
        orderBy: { title: 'asc' },
        select: { title: true, slug: true },
      })
      expect(filterAndSortProblems).toHaveBeenCalledWith(mockProblems, filter)
    })

    it('should handle missing session', async () => {
      ;(getServerSession as Mock).mockResolvedValue(null)

      const mockProblems = [
        {
          id: '1',
          lesson: { title: 'Lesson 1', slug: 'lesson-1' },
          problemProgress: [],
        },
      ]
      const mockLessons = [{ title: 'Lesson 1', slug: 'lesson-1' }]
      ;(prisma.problem.findMany as Mock).mockResolvedValue(mockProblems)
      ;(prisma.lesson.findMany as Mock).mockResolvedValue(mockLessons)

      const filteredProblems = [mockProblems[0]]
      ;(filterAndSortProblems as Mock).mockReturnValue(filteredProblems)

      const filter: ProblemFilter = {
        difficulty: ProblemDifficulty.EASY,
        status: 'TODO',
        lesson: 'lesson-1',
        search: 'problem',
        sortColumn: 'title',
        sortOrder: 'asc',
      }

      const result = await getProblems(filter)
      expect(result).toEqual({
        filteredProblems,
        allProblems: mockProblems,
        lessons: mockLessons,
      })
      expect(prisma.problem.findMany).toHaveBeenCalled()
      expect(prisma.lesson.findMany).toHaveBeenCalledWith({
        orderBy: { title: 'asc' },
        select: { title: true, slug: true },
      })
      expect(filterAndSortProblems).toHaveBeenCalledWith(mockProblems, filter)
    })
  })
})
