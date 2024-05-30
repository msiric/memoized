import { completeCurriculum } from '@/constants'
import { AccessOptions, PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import slugify from 'slugify'

const prisma = new PrismaClient()

async function syncContent() {
  const contentDir = path.join(process.cwd(), 'src/app/(course)')

  for (let course of completeCurriculum) {
    const { title: courseTitle, description: courseDescription } = course
    const courseSlug = slugify(courseTitle, { lower: true })

    const courseRecord = await prisma.course.upsert({
      where: { slug: courseSlug },
      update: {
        title: courseTitle,
        description: courseDescription,
      },
      create: {
        title: courseTitle,
        description: courseDescription,
        slug: courseSlug,
      },
    })

    for (let section of course.sections) {
      const {
        title: sectionTitle,
        description: sectionDescription,
        lessons: courseLessons,
      } = section
      const sectionSlug = slugify(sectionTitle, { lower: true })

      const sectionRecord = await prisma.section.upsert({
        where: { slug: sectionSlug },
        update: {
          title: sectionTitle,
          description: sectionDescription,
          courseId: courseRecord.id,
        },
        create: {
          title: sectionTitle,
          description: sectionDescription,
          slug: sectionSlug,
          courseId: courseRecord.id,
        },
      })

      for (let lesson of courseLessons) {
        const {
          title: lessonTitle,
          description: lessonDescription,
          href: lessonHref,
        } = lesson
        const lessonSlug = slugify(lessonTitle, { lower: true })

        const filePath = path.join(contentDir, lessonHref, 'page.mdx')
        if (!fs.existsSync(filePath)) {
          console.error(`File not found: ${filePath}`)
          continue
        }

        const fileContents = fs.readFileSync(filePath, 'utf-8')

        await prisma.lesson.upsert({
          where: { slug: lessonSlug },
          update: {
            title: lessonTitle,
            description: lessonDescription,
            body: fileContents,
            access: AccessOptions.FREE,
            sectionId: sectionRecord.id,
          },
          create: {
            title: lessonTitle,
            description: lessonDescription,
            slug: lessonSlug,
            body: fileContents,
            access: AccessOptions.FREE,
            sectionId: sectionRecord.id,
          },
        })

        console.log(`Synced: ${lessonTitle}`)
      }
    }
  }

  await prisma.$disconnect()
}

syncContent()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
