import { CONTENT_FOLDER } from '@/constants'
import '@/styles/tailwind.css'
import { Section } from '@prisma/client'
import { glob } from 'fast-glob'
import { type Metadata } from 'next'
import { ReactNode } from 'react'
import { CourseProviders } from './providers'

export const metadata: Metadata = {
  title: {
    template: 'Course',
    default: 'Course',
  },
}

export type CourseLayoutProps = {
  header: ReactNode
  navigation: ReactNode
  section: ReactNode
}

export default async function CourseLayout({
  header,
  navigation,
  section,
}: CourseLayoutProps) {
  const pages = await glob('**/*.mdx', { cwd: `src/${CONTENT_FOLDER}` })
  const allSectionsEntries = (await Promise.all(
    pages.map(async (filename) => [
      '/' + filename.replace(/(^|\/)page\.mdx$/, ''),
      (await import(`../../${CONTENT_FOLDER}/${filename}`)).sections,
    ]),
  )) as Array<[string, Array<Section>]>
  const allSections = Object.fromEntries(allSectionsEntries)

  return (
    <CourseProviders
      header={header}
      navigation={navigation}
      section={section}
      allSections={allSections}
    />
  )
}
