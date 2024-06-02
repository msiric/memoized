import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { Layout } from '@/components/Layout'
import { type Section } from '@/components/SectionProvider'
import { getUserProgressWithLessons } from '@/services/user'
import '@/styles/tailwind.css'
import { Curriculum, LessonConfig } from '@/types'
import glob from 'fast-glob'
import { type Metadata } from 'next'
import { getServerSession } from 'next-auth'

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

  const session = await getServerSession(authOptions)

  const data = await getUserProgressWithLessons(session?.userId)

  return (
    <div className="h-full w-full">
      <Layout
        allSections={allSections}
        userData={data?.user}
        completedLessons={data?.user?.progress.map((item) => item.lessonId)}
        fullCurriculum={data?.curriculum as Curriculum[]}
        allLessons={data?.lessons as LessonConfig[]}
      >
        {children}
      </Layout>
    </div>
  )
}
