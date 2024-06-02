import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PremiumCTA } from '@/components/PremiumCTA'
import prisma from '@/lib/prisma'
import { getUserWithSubscriptions } from '@/services/user'
import { AccessOptions, SubscriptionStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'
import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'
import { JSXElementConstructor } from 'react'

export default async function Lesson({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  const [lesson, user] = await Promise.all([
    prisma.lesson.findUnique({ where: { slug: params.id } }),
    session && getUserWithSubscriptions(session.userId),
  ])

  if (!lesson) {
    notFound()
  }

  if (
    lesson.access === AccessOptions.PREMIUM &&
    user?.currentSubscription !== SubscriptionStatus.ACTIVE
  ) {
    return <PremiumCTA heading={lesson.title} />
  }

  const Page = dynamic(
    () => import(`@/app/(course)/${params.id}/page.mdx`),
  ) as unknown as JSXElementConstructor<{
    userId?: string
    lessonId: string
  }>

  return <Page userId={user?.id} lessonId={lesson.id} />
}
