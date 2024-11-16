import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { CONTENT_FOLDER } from '@/constants'
import { getSectionBySlug } from '@/services/lesson'
import { getUserWithSubscriptions } from '@/services/user'
import { getServerSession } from 'next-auth'
import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'
import { JSXElementConstructor } from 'react'

export default async function Section({
  params,
}: {
  params: { sectionSlug: string; courseSlug: string }
}) {
  const session = await getServerSession(authOptions)

  const [section, user] = await Promise.all([
    getSectionBySlug(params.sectionSlug),
    session && getUserWithSubscriptions(session.userId),
  ])

  if (!section) {
    return notFound()
  }

  const Page = dynamic(
    () =>
      import(
        `../../../../${CONTENT_FOLDER}/${params.courseSlug}/${params.sectionSlug}/page.mdx`
      ),
    {
      loading: () => (
        <section className="h-screen bg-white dark:bg-zinc-900">
          <div className="mx-auto h-full max-w-screen-xl px-4 py-8 sm:py-16 lg:px-6">
            <div className="align-center mx-auto flex h-full max-w-screen-sm flex-col justify-center text-center">
              <p className="mb-6 font-light text-gray-500 md:text-lg dark:text-gray-400">
                Fetching section...
              </p>
            </div>
          </div>
        </section>
      ),
    },
  ) as unknown as JSXElementConstructor<{
    userId?: string
    sectionId: string
  }>

  return <Page userId={user?.id} sectionId={section.id} />
}
