import { CONTENT_FOLDER, RESOURCES_FOLDER } from '@/constants'
import { completeCurriculum } from '@/constants/curriculum'
import prisma from '@/lib/prisma'
import {
  upsertCourse,
  upsertLesson,
  upsertProblem,
  upsertSection,
} from '@/services/lesson'
import { upsertResource } from '@/services/resource'
import { BannerType } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import slugify from 'slugify'

const ACTIVE_BANNERS = [
  {
    title: 'Memoized beta launch',
    message: 'Recurring subscriptions 50% off',
    type: BannerType.INFO,
    linkText: 'Check it out',
    linkUrl: '/premium',
    isActive: true,
    startDate: new Date(),
    endDate: new Date(2024, 11, 31, 23, 59, 0, 0), // 31st of Dec, 23:59:00
    priority: 1,
  },
]

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

        if (lesson.problems) {
          for (const problem of lesson.problems) {
            await upsertProblem(
              problem.href,
              problem.title,
              lessonRecord.id,
              problem.difficulty,
            )
          }
        }

        if (lesson.resources) {
          const resourcesDir = path.join(
            process.cwd(),
            `src/${RESOURCES_FOLDER}`,
          )

          for (const [resourceOrder, resource] of lesson.resources.entries()) {
            const {
              title: resourceTitle,
              description: resourceDescription,
              id: resourceId,
              href: resourceHref,
            } = resource
            const resourceSlug = slugify(resourceTitle, { lower: true })

            const resourcePath = path.join(resourcesDir, resourceId, 'page.mdx')
            if (!fs.existsSync(resourcePath)) {
              console.error(`File not found: ${resourcePath}`)
              continue
            }

            const resourceContent = fs.readFileSync(resourcePath, 'utf-8')

            await upsertResource(
              resourceSlug,
              resourceTitle,
              resourceDescription,
              resourceContent,
              resourceOrder,
              resourceHref,
              lessonAccess,
              lessonRecord.id,
            )
          }
        }

        console.log(`Synced: ${lessonTitle}`)
      }
    }
  }

  for (const banner of ACTIVE_BANNERS) {
    const existingBanner = await prisma.banner.findUnique({
      where: { title: banner.title },
    })

    if (!existingBanner) {
      await prisma.banner.create({
        data: banner,
      })
      console.log(`Created new Banner: ${banner.title}`)
    } else {
      console.log(`Banner already exists: ${banner.title}`)
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
