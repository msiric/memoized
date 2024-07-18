import { ProblemList } from '@/components/ProblemList'
import { ProblemDifficulty } from '@prisma/client'
import { ProblemStatus } from '@/types'
import { getProblems } from '@/services/problem'

const ProblemsPage = async ({
  searchParams,
}: {
  searchParams: {
    search: string
    difficulty: ProblemDifficulty
    status: ProblemStatus
    lesson: string
    sortColumn: string
    sortOrder: 'asc' | 'desc'
  }
}) => {
  const { search, difficulty, status, lesson, sortColumn, sortOrder } =
    searchParams

  const filter = {
    difficulty: difficulty as ProblemDifficulty,
    status: status as ProblemStatus,
    lesson: lesson as string,
    search: search as string,
    sortColumn: sortColumn || undefined,
    sortOrder: sortOrder || undefined,
  }

  const { allProblems, filteredProblems, lessons } = await getProblems(filter)

  return (
    <ProblemList
      allProblems={allProblems}
      filteredProblems={filteredProblems}
      initialLessons={lessons}
    />
  )
}

export default ProblemsPage
