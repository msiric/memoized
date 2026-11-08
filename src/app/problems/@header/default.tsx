import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getProblemNavigationSnapshot } from '@/lib/problem-navigation-request'
import { getServerSession } from 'next-auth'
import { Wrapper } from './wrapper'

export default async function Header() {
  const session = await getServerSession(authOptions)

  const data = await getProblemNavigationSnapshot(session?.userId)

  return (
    <Wrapper
      userData={data.user}
      progressData={data.progress}
    />
  )
}
