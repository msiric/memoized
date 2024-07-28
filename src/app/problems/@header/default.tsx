import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getUserProgressWithProblems } from '@/services/user'
import { LessonConfig, LessonWithProblems, ProblemConfig } from '@/types'
import { getServerSession } from 'next-auth'
import { Wrapper } from './wrapper'

export default async function Header() {
  const session = await getServerSession(authOptions)

  const data = await getUserProgressWithProblems(session?.userId)

  return (
    <Wrapper
      userData={data?.user}
      completedLessons={data?.user?.lessonProgress.map((item) => item.lessonId)}
      completedProblems={data?.user?.problemProgress.map(
        (item) => item.problemId,
      )}
      problemList={data?.problemList as LessonWithProblems[]}
      allLessons={data?.lessons as LessonConfig[]}
      allProblems={data?.problems as ProblemConfig[]}
    />
  )
}
