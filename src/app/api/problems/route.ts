import prisma from '@/lib/prisma'
import { ProblemStatus } from '@/types'
import { ProblemDifficulty } from '@prisma/client'
import { NextRequest } from 'next/server'

export interface ProblemFilter {
  difficulty?: ProblemDifficulty
  status?: ProblemStatus
  tags?: string[]
  search?: string
  sortColumn?: string
  sortOrder?: 'asc' | 'desc'
}

export async function getProblems(filter: ProblemFilter = {}) {
  const { difficulty, status, tags, search, sortColumn, sortOrder } = filter

  const where: Record<string, unknown> = {}

  if (difficulty) {
    where.difficulty = difficulty
  }

  if (status) {
    where.problemProgress = {
      some: {
        completed: status === 'COMPLETED',
      },
    }
  }

  if (tags && tags.length > 0) {
    where.lesson = {
      slug: { in: tags },
    }
  }

  if (search) {
    where.title = {
      contains: search,
      mode: 'insensitive',
    }
  }

  let orderBy: Record<string, unknown> = {}

  if (sortColumn && sortOrder) {
    if (sortColumn === 'tags') {
      orderBy = {
        lesson: {
          title: sortOrder,
        },
      }
    } else {
      orderBy = { [sortColumn]: sortOrder }
    }
  }

  const problems = await prisma.problem.findMany({
    where,
    orderBy,
    include: {
      lesson: {
        select: {
          title: true,
        },
      },
      problemProgress: {
        select: {
          completed: true,
        },
      },
    },
  })

  return problems
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const difficulty = searchParams.get('difficulty')
  const status = searchParams.get('status')
  const tags = searchParams.get('tags')
  const search = searchParams.get('search')
  const sortColumn = searchParams.get('sortColumn')
  const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null

  const filter: ProblemFilter = {
    difficulty: difficulty as ProblemDifficulty,
    status: status as ProblemStatus,
    tags: tags ? (tags as string).split(',') : undefined,
    search: search as string,
    sortColumn: sortColumn || undefined,
    sortOrder: sortOrder || undefined,
  }

  try {
    const problems = await getProblems(filter)
    return new Response(JSON.stringify({ problems }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Failed to fetch problems:', error)
    return new Response('Internal Server Error', {
      status: 500,
    })
  }
}
