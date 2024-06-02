import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getUserProgressWithLessons } from '@/services/user'
import { Curriculum, LessonConfig } from '@/types'
import { Section } from '@prisma/client'
import { glob } from 'fast-glob'
import { getServerSession } from 'next-auth'
import { Wrapper } from './wrapper'
import { CONTENT_FOLDER } from '@/constants'

export default async function Navigation() {
  const session = await getServerSession(authOptions)

  const data = await getUserProgressWithLessons(session?.userId)

  const pages = await glob('**/*.mdx', { cwd: `src/${CONTENT_FOLDER}` })
  const allSectionsEntries = (await Promise.all(
    pages.map(async (filename) => [
      '/' + filename.replace(/(^|\/)page\.mdx$/, ''),
      (await import(`../../../${CONTENT_FOLDER}/${filename}`)).sections,
    ]),
  )) as Array<[string, Array<Section>]>
  const allSections = Object.fromEntries(allSectionsEntries)

  return (
    <Wrapper
      allSections={allSections}
      userData={data?.user}
      completedLessons={data?.user?.progress.map((item) => item.lessonId)}
      fullCurriculum={data?.curriculum as Curriculum[]}
      allLessons={data?.lessons as LessonConfig[]}
    />
  )
}
