import { ProblemList } from '@/components/ProblemList'
import { ProblemDifficulty, ProblemType } from '@/lib/prisma-enums'
import { ProblemBankRow, ProblemStatus } from '@/types'
import { getProblemBankSnapshot } from '@/lib/catalog-request'
import { filterAndSortProblems } from '@/utils/helpers'

const ProblemsPage = async ({
  searchParams,
}: {
  searchParams: {
    search: string
    difficulty: ProblemDifficulty
    status: ProblemStatus
    lesson: string
    type: ProblemType
    sortColumn: string
    sortOrder: 'asc' | 'desc'
  }
}) => {
  const { search, difficulty, status, lesson, type, sortColumn, sortOrder } =
    searchParams

  const filter = {
    difficulty: difficulty as ProblemDifficulty,
    status: status as ProblemStatus,
    lesson: lesson as string,
    type: type as ProblemType,
    search: search as string,
    sortColumn: sortColumn || undefined,
    sortOrder: sortOrder || undefined,
  }

  const { allProblems, lessons } = await getProblemBankSnapshot()
  const filteredProblems = filterAndSortProblems(allProblems, filter)

  const rows: ProblemBankRow[] = allProblems.map(
    ({ id, contentId, title, href, type, difficulty, lessonId }) => ({
      id,
      contentId,
      title,
      href,
      type,
      difficulty,
      lessonId,
    }),
  )

  return (
    <ProblemList
      allProblems={rows}
      filteredProblemIds={filteredProblems.map((problem) => problem.id)}
      initialLessons={lessons}
    />
  )
}

export default ProblemsPage
