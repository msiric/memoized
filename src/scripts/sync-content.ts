import { CONTENT_FOLDER } from '@/constants'
import { completeCurriculum } from '@/constants/curriculum'
import prisma from '@/lib/prisma'
import {
  upsertCourse,
  upsertLesson,
  upsertProblem,
  upsertSection,
} from '@/services/lesson'
import fs from 'fs'
import path from 'path'
import slugify from 'slugify'

const syncContent = async () => {
  const contentDir = path.join(process.cwd(), `src/${CONTENT_FOLDER}`)

  for (const [courseOrder, course] of completeCurriculum.entries()) {
    const { title: courseTitle, description: courseDescription } = course
    const courseSlug = slugify(courseTitle, { lower: true })

    const courseRecord = await upsertCourse(
      courseSlug,
      courseTitle,
      courseDescription,
      courseOrder,
    )

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

      const sectionRecord = await upsertSection(
        sectionSlug,
        sectionTitle,
        sectionDescription,
        sectionContent,
        sectionOrder,
        sectionHref,
        courseRecord.id,
      )

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

        const lessonRecord = await upsertLesson(
          lessonSlug,
          lessonTitle,
          lessonDescription,
          lessonContent,
          lessonOrder,
          lessonAccess,
          lessonHref,
          sectionRecord.id,
        )

        for (const problem of lesson.problems) {
          await upsertProblem(
            problem.href,
            problem.title,
            lessonRecord.id,
            problem.difficulty,
          )
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
