import { CONTENT_FOLDER } from '@/constants'
import '@/styles/tailwind.css'
import { Section } from '@prisma/client'
import { glob } from 'fast-glob'
import { type Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ReactNode } from 'react'
import { getCourseBySlug } from '../../../services/course'
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
  params: { courseSlug: string }
  children: ReactNode
}

export default async function CourseLayout({
  header,
  navigation,
  params,
  children,
}: CourseLayoutProps) {
  const { courseSlug } = params

  const course = await getCourseBySlug(courseSlug)

  if (!course) {
    return notFound()
  }

  const pages = await glob('**/*.mdx', {
    cwd: `src/${CONTENT_FOLDER}/${courseSlug}`,
  })

  const allSectionsEntries = (await Promise.all(
    pages.map(async (filename) => [
      '/' + filename.replace(/(^|\/)page\.mdx$/, ''),
      (await import(`../../../${CONTENT_FOLDER}/${courseSlug}/${filename}`))
        .sections,
    ]),
  )) as Array<[string, Array<Section>]>

  const allSections = Object.fromEntries(allSectionsEntries)

  return (
    <CourseProviders
      header={header}
      navigation={navigation}
      allSections={allSections}
    >
      {children}
    </CourseProviders>
  )
}
