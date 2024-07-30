import { RESOURCES_FOLDER } from '@/constants'
import dynamic from 'next/dynamic'

export default async function Resources() {
  const Page = dynamic(
    () => import(`../../../${RESOURCES_FOLDER}/intro/page.mdx`),
    {
      loading: () => (
        <section className="h-screen bg-white dark:bg-zinc-900">
          <div className="mx-auto h-full max-w-screen-xl px-4 py-8 sm:py-16 lg:px-6">
            <div className="align-center mx-auto flex h-full max-w-screen-sm flex-col justify-center text-center">
              <p className="mb-6 font-light text-gray-500 md:text-lg dark:text-gray-400">
                Fetching introduction...
              </p>
            </div>
          </div>
        </section>
      ),
    },
  )

  return <Page />
}
