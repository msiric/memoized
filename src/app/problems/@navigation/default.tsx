import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getProblemNavigationSnapshot } from '@/lib/problem-navigation-request'
import { getServerSession } from 'next-auth'
import { Wrapper } from './wrapper'

export default async function Navigation() {
  const session = await getServerSession(authOptions)

  const data = await getProblemNavigationSnapshot(session?.userId)

  return (
    <Wrapper
      navigation={data.navigation}
      allLessons={data.lessonIds}
      allProblems={data.problemIds}
    />
  )
}
