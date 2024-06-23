import { CONTENT_FOLDER } from '@/constants'
import { completeCurriculum } from '@/constants/curriculum'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import slugify from 'slugify'

const prisma = new PrismaClient()

async function syncContent() {
  const contentDir = path.join(process.cwd(), `src/${CONTENT_FOLDER}`)

  for (const [courseOrder, course] of completeCurriculum.entries()) {
    const { title: courseTitle, description: courseDescription } = course
    const courseSlug = slugify(courseTitle, { lower: true })

    const courseRecord = await prisma.course.upsert({
      where: { slug: courseSlug },
      update: {
        title: courseTitle,
        description: courseDescription,
        order: courseOrder,
        href: '',
      },
      create: {
        title: courseTitle,
        description: courseDescription,
        order: courseOrder,
        slug: courseSlug,
        href: '',
      },
    })

    for (const [sectionOrder, section] of course.sections.entries()) {
      const {
        title: sectionTitle,
        description: sectionDescription,
        id: sectionId,
        href: sectionHref,
        lessons: courseLessons,
      } = section
      const sectionSlug = slugify(sectionTitle, { lower: true })

      const sectionPath = path.join(contentDir, sectionId, 'page.mdx')
      if (!fs.existsSync(sectionPath)) {
        console.error(`File not found: ${sectionPath}`)
        continue
      }

      const sectionContent = fs.readFileSync(sectionPath, 'utf-8')

      const sectionRecord = await prisma.section.upsert({
        where: { slug: sectionSlug },
        update: {
          title: sectionTitle,
          description: sectionDescription,
          body: sectionContent,
          order: sectionOrder,
          href: sectionHref,
          courseId: courseRecord.id,
        },
        create: {
          title: sectionTitle,
          description: sectionDescription,
          body: sectionContent,
          slug: sectionSlug,
          order: sectionOrder,
          href: sectionHref,
          courseId: courseRecord.id,
        },
      })

      for (const [lessonOrder, lesson] of courseLessons.entries()) {
        const {
          title: lessonTitle,
          description: lessonDescription,
          id: lessonId,
          access: lessonAccess,
          href: lessonHref,
        } = lesson
        const lessonSlug = slugify(lessonTitle, { lower: true })

        const lessonPath = path.join(contentDir, lessonId, 'page.mdx')
        if (!fs.existsSync(lessonPath)) {
          console.error(`File not found: ${lessonPath}`)
          continue
        }

        const lessonContent = fs.readFileSync(lessonPath, 'utf-8')

        const practiceProblems = lesson.problems

        const lessonRecord = await prisma.lesson.upsert({
          where: { slug: lessonSlug },
          update: {
            title: lessonTitle,
            description: lessonDescription,
            order: lessonOrder,
            body: lessonContent,
            access: lessonAccess,
            href: lessonHref,
            sectionId: sectionRecord.id,
          },
          create: {
            title: lessonTitle,
            description: lessonDescription,
            order: lessonOrder,
            slug: lessonSlug,
            body: lessonContent,
            access: lessonAccess,
            href: lessonHref,
            sectionId: sectionRecord.id,
          },
        })

        for (const problem of practiceProblems) {
          await prisma.problem.upsert({
            where: { href: problem.href },
            update: {
              title: problem.title,
              lessonId: lessonRecord.id,
              difficulty: problem.difficulty,
            },
            create: {
              title: problem.title,
              href: problem.href,
              lessonId: lessonRecord.id,
              difficulty: problem.difficulty,
            },
          })
        }

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
