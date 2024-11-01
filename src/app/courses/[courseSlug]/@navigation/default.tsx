import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getUserProgressWithCurriculum } from '@/services/user'
import { Curriculum, LessonConfig, ProblemConfig } from '@/types'
import { getServerSession } from 'next-auth'
import { Wrapper } from './wrapper'

export default async function Navigation({
  params,
}: {
  params: { courseSlug: string }
}) {
  const { courseSlug } = params
  const session = await getServerSession(authOptions)

  const data = await getUserProgressWithCurriculum(session?.userId)

  return (
    <Wrapper
      userData={data?.user}
      courseSlug={courseSlug}
      fullCurriculum={data?.curriculum as Curriculum[]}
      allLessons={data?.lessons as LessonConfig[]}
      allProblems={data?.problems as ProblemConfig[]}
    />
  )
}
