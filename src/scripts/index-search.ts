import { meiliSearch } from '@/lib/meili'
import prisma from '@/lib/prisma'
import { COURSES_PREFIX } from '../constants'

const indexLessons = async () => {
  try {
    await meiliSearch.deleteIndex('lessons')
    console.log('Existing index deleted')
  } catch (_error) {
    console.log('No existing index to delete, or deletion failed')
  }

  const lessons = await prisma.lesson.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      body: true,
      access: true,
      slug: true,
      section: {
        select: { course: { select: { slug: true } }, title: true, slug: true },
      },
    },
  })

  const documentsToIndex = lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    body: lesson.body,
    access: lesson.access,
    sectionTitle: lesson.section.title,
    href: `${COURSES_PREFIX}/${lesson.section.course.slug}/${lesson.section.slug}/${lesson.slug}`,
  }))

  const index = meiliSearch.index('lessons')

  await index.updateFilterableAttributes(['access'])

  await index.addDocuments(documentsToIndex)

  console.log('Indexing complete')
}

indexLessons()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
