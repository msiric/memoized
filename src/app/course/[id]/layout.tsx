import { Layout } from '@/components/Layout'
import { type Section } from '@/components/SectionProvider'
import '@/styles/tailwind.css'
import glob from 'fast-glob'
import { type Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: 'Course',
    default: 'Course',
  },
}

export default async function CourseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pages = await glob('**/*.mdx', { cwd: 'src/app/(course)' })
  const allSectionsEntries = (await Promise.all(
    pages.map(async (filename) => [
      '/' + filename.replace(/(^|\/)page\.mdx$/, ''),
      (await import(`../../(course)/${filename}`)).sections,
    ]),
  )) as Array<[string, Array<Section>]>
  const allSections = Object.fromEntries(allSectionsEntries)

  return (
    <div className="h-full w-full">
      <Layout allSections={allSections}>{children}</Layout>
    </div>
  )
}
