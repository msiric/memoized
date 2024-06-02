import '@/styles/tailwind.css'
import { Section } from '@prisma/client'
import { glob } from 'fast-glob'
import { type Metadata } from 'next'
import { ReactNode } from 'react'
import { CourseProviders } from './providers'
import { CONTENT_FOLDER } from '@/constants'

export const metadata: Metadata = {
  title: {
    template: 'Course',
    default: 'Course',
  },
}

export type CourseLayoutProps = {
  header: ReactNode
  navigation: ReactNode
  lesson: ReactNode
}

export default async function CourseLayout({
  header,
  navigation,
  lesson,
}: CourseLayoutProps) {
  const pages = await glob('**/*.mdx', { cwd: `src/app/${CONTENT_FOLDER}` })
  const allSectionsEntries = (await Promise.all(
    pages.map(async (filename) => [
      '/' + filename.replace(/(^|\/)page\.mdx$/, ''),
      (await import(`../${CONTENT_FOLDER}/${filename}`)).sections,
    ]),
  )) as Array<[string, Array<Section>]>
  const allSections = Object.fromEntries(allSectionsEntries)

  return (
    <CourseProviders
      header={header}
      navigation={navigation}
      lesson={lesson}
      allSections={allSections}
    />
  )
}
