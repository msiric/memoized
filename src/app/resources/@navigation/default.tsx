import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getUserProgressWithResources } from '@/services/user'
import { Resource } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { Wrapper } from './wrapper'

export default async function Navigation() {
  const session = await getServerSession(authOptions)

  const data = await getUserProgressWithResources(session?.userId)

  return (
    <Wrapper userData={data?.user} resources={data?.resources as Resource[]} />
  )
}
