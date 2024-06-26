import { ProblemList } from '@/components/ProblemList'
import { getProblems } from '../api/problems/route'
import { ProblemDifficulty } from '@prisma/client'
import { ProblemStatus } from '@/types'

const ProblemsPage = async ({
  searchParams,
}: {
  searchParams: {
    search: string
    difficulty: ProblemDifficulty
    status: ProblemStatus
    tags: string
  }
}) => {
  const { search, difficulty, status, tags } = searchParams

  const filter = {
    search: search as string,
    difficulty: difficulty as ProblemDifficulty,
    status: status as ProblemStatus,
    tags: tags ? (tags as string).split(',') : undefined,
  }

  const problems = await getProblems(filter)

  return <ProblemList initialProblems={problems} />
}

export default ProblemsPage
