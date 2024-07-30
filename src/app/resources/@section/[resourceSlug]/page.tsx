import { RESOURCES_FOLDER } from '@/constants'
import { getResourceBySlug } from '@/services/resource'
import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'
// import readingTime from 'reading-time';

export default async function Lesson({
  params,
}: {
  params: { resourceSlug: string }
}) {
  const resource = await getResourceBySlug(params.resourceSlug)

  if (!resource) {
    return notFound()
  }

  const Page = dynamic(
    () =>
      import(`../../../../${RESOURCES_FOLDER}/${params.resourceSlug}/page.mdx`),
    {
      loading: () => (
        <section className="h-screen bg-white dark:bg-zinc-900">
          <div className="mx-auto h-full max-w-screen-xl px-4 py-8 sm:py-16 lg:px-6">
            <div className="align-center mx-auto flex h-full max-w-screen-sm flex-col justify-center text-center">
              <p className="mb-6 font-light text-gray-500 md:text-lg dark:text-gray-400">
                Fetching resource...
              </p>
            </div>
          </div>
        </section>
      ),
    },
  )

  return <Page />
}
