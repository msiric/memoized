import { meiliSearch } from '@/lib/meili'
import prisma from '@/lib/prisma'

const indexLessons = async () => {
  try {
    await meiliSearch.deleteIndex('lessons')
    console.log('Existing index deleted')
  } catch (error) {
    console.log('No existing index to delete, or deletion failed')
  }

  const lessons = await prisma.lesson.findMany({
    include: { section: true },
  })

  const documentsToIndex = lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    body: lesson.body,
    access: lesson.access,
    sectionTitle: lesson.section.title,
    href: `/course/${lesson.section.slug}/${lesson.slug}`,
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
