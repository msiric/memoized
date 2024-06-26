import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getUserProgressWithLessons } from '@/services/user'
import { Curriculum, LessonConfig, ProblemConfig } from '@/types'
import { getServerSession } from 'next-auth'
import { Wrapper } from './wrapper'

export default async function Header() {
  const session = await getServerSession(authOptions)

  const data = await getUserProgressWithLessons(session?.userId)

  return (
    <Wrapper
      userData={data?.user}
      completedLessons={data?.user?.lessonProgress.map((item) => item.lessonId)}
      completedProblems={data?.user?.problemProgress.map(
        (item) => item.problemId,
      )}
      fullCurriculum={data?.curriculum as Curriculum[]}
      allLessons={data?.lessons as LessonConfig[]}
      allProblems={data?.problems as ProblemConfig[]}
    />
  )
}
