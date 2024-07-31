import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getUserProgressWithResources } from '@/services/user'
import { LessonWithResourcesAndProblems } from '@/types'
import { getServerSession } from 'next-auth'
import { Wrapper } from './wrapper'

export default async function Navigation() {
  const session = await getServerSession(authOptions)

  const data = await getUserProgressWithResources(session?.userId)

  return (
    <Wrapper
      userData={data?.user}
      resourceList={data?.lessons as LessonWithResourcesAndProblems[]}
    />
  )
}
