import {
  CONTENT_FOLDER,
  COURSES_PREFIX,
  SAMPLES_FOLDER,
  SLUGIFY_OPTIONS,
} from '@/constants'
import { completeCurriculum } from '@/constants/curriculum'
import prisma from '@/lib/prisma'
import {
  upsertCourse,
  upsertLesson,
  upsertProblem,
  upsertSection,
} from '@/services/lesson'
import { Lesson } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import slugify from 'slugify'
import { InputJsonValue } from '@prisma/client/runtime/library'
import { isProduction } from '../utils/helpers'
import { serialize } from 'next-mdx-remote-client/serialize'

slugify.extend({ '/': '-' })

/**
 * Serialize MDX content with error handling
 */
async function serializeMdxContent(content: string, filePath?: string) {
  if (!content || content.trim().length === 0) {
    console.log('⚠️ Empty content, skipping serialization')
    return null
  }

  try {
    const { mdxOptions } = await import('@/mdx/index.mjs')

    console.log('✅ Serializing MDX content...')

    const serialized = await serialize({
      source: content,
      options: {
        mdxOptions,
        scope: {},
      },
    })

    return serialized
  } catch (error) {
    console.error('❌ MDX serialization failed:', error)
    console.error('Content preview:', content.substring(0, 200) + '...')
    console.error('File path:', filePath || 'Unknown')

    if (isProduction()) {
      const { reportMdxError } = await import('@/lib/error-tracking')
      reportMdxError(
        error instanceof Error ? error : new Error(String(error)),
        {
          contentLength: content.length,
          filePath: filePath,
          operation: 'compilation',
        },
      )
    }

    throw new Error(
      `MDX serialization failed for ${filePath || 'unknown file'}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Determine content path based on available content
 */
function getContentPath() {
  const mainContentPath = path.join(process.cwd(), 'src', CONTENT_FOLDER)
  const sampleContentPath = path.join(process.cwd(), 'src', SAMPLES_FOLDER)

  // Check if we have content in main directory (submodule or sample content)
  const hasMainContent =
    fs.existsSync(mainContentPath) &&
    (fs.existsSync(path.join(mainContentPath, 'js-track')) ||
      fs.existsSync(path.join(mainContentPath, 'dsa-track')))

  if (hasMainContent) {
    console.log('📂 Using content from main directory')
    return { path: mainContentPath, isSample: false }
  } else if (fs.existsSync(sampleContentPath)) {
    console.log('📂 Using sample content for development')
    return { path: sampleContentPath, isSample: true }
  } else {
    throw new Error(
      'No content found! Run `yarn setup:content` to get sample content.',
    )
  }
}

/**
 * Read lesson configuration from _lessons.json file
 */
function getDetailedLessonConfig(sectionPath: string) {
  const lessonsConfigPath = path.join(sectionPath, '_lessons.json')
  if (fs.existsSync(lessonsConfigPath)) {
    try {
      const rawConfig = fs.readFileSync(lessonsConfigPath, 'utf-8')
      const config = JSON.parse(rawConfig)

      // Validate configuration structure
      if (!config.lessons || !Array.isArray(config.lessons)) {
        console.warn(
          `⚠️ Invalid configuration structure in ${lessonsConfigPath}`,
        )
        return []
      }

      // Validate each lesson has required fields
      const validLessons = config.lessons.filter((lesson: Lesson) => {
        if (!lesson.id || !lesson.title || !lesson.access) {
          console.warn(
            `⚠️ Lesson missing required fields in ${lessonsConfigPath}:`,
            lesson,
          )
          return false
        }
        return true
      })

      return validLessons
    } catch (error) {
      console.warn(`⚠️ Failed to parse ${lessonsConfigPath}:`, error)
      return []
    }
  }

  return []
}

/**
 * Main content sync function
 */
async function syncWithJsonStructure(contentInfo: {
  path: string
  isSample: boolean
}) {
  let courseOrder = 0
  let sectionOrder = 0
  let lessonOrder = 0
  let totalLessons = 0
  let processedLessons = 0

  // Calculate total lessons for progress tracking
  for (const course of completeCurriculum) {
    for (const section of course.sections) {
      const sectionPath = path.join(contentInfo.path, course.id, section.id)
      const lessons = getDetailedLessonConfig(sectionPath)
      totalLessons += lessons.length
    }
  }

  console.log(`🎯 Starting content sync: ${totalLessons} lessons to process`)

  for (const course of completeCurriculum) {
    const {
      id: courseId,
      title: courseTitle,
      description: courseDescription,
      href: courseHref,
    } = course
    const courseSlug = slugify(courseTitle, SLUGIFY_OPTIONS)

    // Try to read course page content
    const courseFilePath = path.join(contentInfo.path, courseId, 'page.mdx')
    let courseBody = `# ${courseTitle}\n\n${courseDescription || ''}`

    if (fs.existsSync(courseFilePath)) {
      courseBody = fs.readFileSync(courseFilePath, 'utf8')
    }

    console.log(`📚 Processing course: ${courseTitle}`)

    const serializedContent = await serializeMdxContent(
      courseBody,
      courseFilePath,
    )

    const courseOrderValue = courseOrder++

    const courseRecord = await upsertCourse(
      courseSlug,
      courseTitle,
      courseDescription,
      courseBody,
      courseHref,
      courseOrderValue,
      serializedContent as InputJsonValue,
    )

    console.log(`✅ Synced course: ${courseTitle}`)

    for (const section of course.sections) {
      const {
        title: sectionTitle,
        description: sectionDescription,
        id: sectionId,
        href: sectionHref,
      } = section
      const sectionSlug = slugify(sectionTitle, SLUGIFY_OPTIONS)
      const sectionPath = path.join(contentInfo.path, courseId, sectionId)
      const sectionFilePath = path.join(sectionPath, 'page.mdx')

      if (!fs.existsSync(sectionFilePath)) {
        console.error(`File not found: ${sectionFilePath}`)
        continue
      }

      const sectionContent = fs.readFileSync(sectionFilePath, 'utf-8')
      const serializedSectionContent = await serializeMdxContent(
        sectionContent,
        sectionFilePath,
      )

      const sectionOrderValue = sectionOrder++

      const sectionRecord = await upsertSection(
        sectionSlug,
        sectionTitle,
        sectionDescription,
        sectionContent,
        sectionOrderValue,
        sectionHref,
        courseRecord.id,
        serializedSectionContent as InputJsonValue,
      )

      console.log(`✅ Synced section: ${sectionTitle}`)

      // Get detailed lesson configuration from JSON
      const detailedLessons = getDetailedLessonConfig(sectionPath)

      for (const lesson of detailedLessons) {
        const lessonSlug = slugify(lesson.title, SLUGIFY_OPTIONS)
        const lessonPath = path.join(sectionPath, lesson.id, 'page.mdx')

        if (!fs.existsSync(lessonPath)) {
          console.warn(`⚠️ Lesson file not found: ${lessonPath}`)
          continue
        }

        const lessonContent = fs.readFileSync(lessonPath, 'utf-8')
        const serializedLessonContent = await serializeMdxContent(
          lessonContent,
          lessonPath,
        )
        const lessonHref = `${COURSES_PREFIX}/${courseSlug}/${sectionSlug}/${lessonSlug}`

        // Convert access level from string to enum
        const accessLevel = lesson.access === 'FREE' ? 'FREE' : 'PREMIUM'

        const lessonOrderValue = lessonOrder++

        const lessonRecord = await upsertLesson(
          lessonSlug,
          lesson.title,
          lesson.description,
          lessonContent,
          serializedLessonContent as InputJsonValue,
          lessonOrderValue,
          accessLevel,
          lessonHref,
          sectionRecord.id,
        )

        processedLessons++
        console.log(
          `✅ Synced lesson: ${lesson.title} (${processedLessons}/${totalLessons})`,
        )

        // Process problems from JSON
        if (lesson.problems && lesson.problems.length > 0) {
          for (const problem of lesson.problems) {
            const problemSlug = slugify(problem.title, SLUGIFY_OPTIONS)
            const problemLink = `${COURSES_PREFIX}/${courseSlug}/${sectionSlug}/${lessonSlug}#${problemSlug}`

            // Serialize problem answer at build time for better performance
            const serializedAnswer =
              problem.answer && problem.answer.trim().length > 0
                ? await serializeMdxContent(problem.answer, problemLink)
                : null

            await upsertProblem(
              problemSlug,
              problem.href || '',
              problemLink,
              problem.title,
              problem.difficulty,
              problem.question,
              problem.answer,
              problem.type,
              lessonRecord.id,
              serializedAnswer as InputJsonValue,
            )
            console.log(`✅ Synced problem: ${problem.title}`)
          }
        }
      }
    }
  }

  console.log('🎉 Content sync completed!')
}

/**
 * Main sync function - entry point
 */
export async function syncContent(): Promise<void> {
  const contentInfo = getContentPath()
  console.log('🆕 Using JSON-based lesson configuration')
  return await syncWithJsonStructure(contentInfo)
}

// CLI interface
if (require.main === module) {
  syncContent()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
