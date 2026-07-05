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
import { Lesson, Prisma, ProblemDifficulty, ProblemType } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import slugify from 'slugify'
import { InputJsonValue } from '@prisma/client/runtime/library'
import { isProduction } from '../utils/helpers'
import { serialize } from 'next-mdx-remote-client/serialize'

type SerializedJson = Prisma.NullableJsonNullValueInput | InputJsonValue

slugify.extend({ '/': '-' })

type PreparedCourse = {
  contentId: string
  slug: string
  title: string
  description: string
  body: string
  href: string
  order: number
  serializedBody: SerializedJson
}

type PreparedSection = {
  contentId: string
  slug: string
  title: string
  description: string
  body: string
  href: string
  order: number
  courseSlug: string
  serializedBody: SerializedJson
}

type PreparedLesson = {
  contentId: string
  slug: string
  title: string
  description: string
  body: string
  href: string
  order: number
  access: 'FREE' | 'PREMIUM'
  sectionContentId: string
  serializedBody: SerializedJson
}

type PreparedProblem = {
  contentId: string
  slug: string
  href: string
  link: string
  title: string
  difficulty: ProblemDifficulty
  question: string
  answer: string
  type: ProblemType
  lessonContentId: string
  serializedAnswer: SerializedJson
}

type PreparedContent = {
  courses: PreparedCourse[]
  sections: PreparedSection[]
  lessons: PreparedLesson[]
  problems: PreparedProblem[]
}

/**
 * Serialize MDX content with error handling
 */
async function serializeMdxContent(content: string, filePath?: string): Promise<SerializedJson> {
  if (!content || content.trim().length === 0) {
    console.log('⚠️ Empty content, skipping serialization')
    return Prisma.DbNull
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

    return serialized as unknown as InputJsonValue
  } catch (error) {
    console.error('❌ MDX serialization failed:', error)
    console.error('Content preview:', content.substring(0, 200) + '...')
    console.error('File path:', filePath || 'Unknown')

    if (isProduction()) {
      const { reportMdxError } = await import('@/lib/sentry')
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
 * Phase 1: Read and serialize all content into in-memory structures.
 * No database operations happen here. If serialization fails, no DB state changes.
 */
async function prepareContent(contentInfo: {
  path: string
  isSample: boolean
}): Promise<PreparedContent> {
  const prepared: PreparedContent = {
    courses: [],
    sections: [],
    lessons: [],
    problems: [],
  }

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

  console.log(`🎯 Preparing content: ${totalLessons} lessons to serialize`)

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

    console.log(`📚 Serializing course: ${courseTitle}`)

    const serializedContent = await serializeMdxContent(
      courseBody,
      courseFilePath,
    )

    prepared.courses.push({
      contentId: courseId,
      slug: courseSlug,
      title: courseTitle,
      description: courseDescription,
      body: courseBody,
      href: courseHref,
      order: courseOrder++,
      serializedBody: serializedContent,
    })

    for (const section of course.sections) {
      const {
        title: sectionTitle,
        description: sectionDescription,
        id: sectionId,
        href: sectionHref,
      } = section
      const sectionSlug = slugify(sectionTitle, SLUGIFY_OPTIONS)
      const sectionContentId = `${courseId}${sectionId}`
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

      prepared.sections.push({
        contentId: sectionContentId,
        slug: sectionSlug,
        title: sectionTitle,
        description: sectionDescription,
        body: sectionContent,
        href: sectionHref,
        order: sectionOrder++,
        courseSlug,
        serializedBody: serializedSectionContent,
      })

      // Get detailed lesson configuration from JSON
      const detailedLessons = getDetailedLessonConfig(sectionPath)

      for (const lesson of detailedLessons) {
        const lessonSlug = slugify(lesson.title, SLUGIFY_OPTIONS)
        const lessonContentId = `${courseId}${sectionId}${lesson.id}`
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

        prepared.lessons.push({
          contentId: lessonContentId,
          slug: lessonSlug,
          title: lesson.title,
          description: lesson.description,
          body: lessonContent,
          href: lessonHref,
          order: lessonOrder++,
          access: accessLevel,
          sectionContentId,
          serializedBody: serializedLessonContent,
        })

        processedLessons++
        console.log(
          `✅ Serialized lesson: ${lesson.title} (${processedLessons}/${totalLessons})`,
        )

        // Process problems from JSON
        if (lesson.problems && lesson.problems.length > 0) {
          for (const problem of lesson.problems) {
            const problemSlug = slugify(problem.title, SLUGIFY_OPTIONS)
            const problemContentId = `${lessonContentId}/${problem.id || problemSlug}`
            const problemLink = `${COURSES_PREFIX}/${courseSlug}/${sectionSlug}/${lessonSlug}#${problemSlug}`

            // Serialize problem answer at build time for better performance
            const serializedAnswer =
              problem.answer && problem.answer.trim().length > 0
                ? await serializeMdxContent(problem.answer, problemLink)
                : Prisma.DbNull

            prepared.problems.push({
              contentId: problemContentId,
              slug: problemSlug,
              href: problem.href || '',
              link: problemLink,
              title: problem.title,
              difficulty: problem.difficulty,
              question: problem.question,
              answer: problem.answer,
              type: problem.type,
              lessonContentId,
              serializedAnswer: serializedAnswer,
            })
            console.log(`✅ Serialized problem: ${problem.title}`)
          }
        }
      }
    }
  }

  console.log(`📦 Preparation complete: ${prepared.courses.length} courses, ${prepared.sections.length} sections, ${prepared.lessons.length} lessons, ${prepared.problems.length} problems`)

  return prepared
}

/**
 * Phase 2: Persist all prepared content to the database.
 *
 * Upserts are keyed by each entity's stable contentId, so the sync is
 * idempotent and safe to re-run, and parents are written before children so
 * foreign keys are always valid. A mid-run failure therefore leaves a partial
 * but consistent catalog that the next run completes (CI surfaces the error).
 *
 * We deliberately do NOT wrap this in one global interactive transaction:
 * ~600 sequential upserts exceeded Prisma's transaction timeout as the catalog
 * grew, and a single transaction would hold write locks for the entire sync.
 * Stale-row removal is handled separately by the sanity-capped prune step.
 */
async function persistContent(prepared: PreparedContent): Promise<void> {
  console.log('💾 Persisting content to database...')

  // Slug → DB ID maps for foreign key resolution
  const courseIdMap = new Map<string, string>()
  const sectionIdMap = new Map<string, string>()
  const lessonIdMap = new Map<string, string>()

  // Upsert courses
  for (const course of prepared.courses) {
    const record = await upsertCourse(
      prisma,
      course.contentId,
      course.slug,
      course.title,
      course.description,
      course.body,
      course.href,
      course.order,
      course.serializedBody,
    )
    courseIdMap.set(course.slug, record.id)
    console.log(`✅ Synced course: ${course.title}`)
  }

  // Upsert sections
  for (const section of prepared.sections) {
    const courseId = courseIdMap.get(section.courseSlug)
    if (!courseId) {
      throw new Error(
        `Course not found for section ${section.slug} (courseSlug: ${section.courseSlug})`,
      )
    }

    const record = await upsertSection(
      prisma,
      section.contentId,
      section.slug,
      section.title,
      section.description,
      section.body,
      section.order,
      section.href,
      courseId,
      section.serializedBody,
    )
    sectionIdMap.set(section.contentId, record.id)
    console.log(`✅ Synced section: ${section.title}`)
  }

  // Upsert lessons
  for (const lesson of prepared.lessons) {
    const sectionId = sectionIdMap.get(lesson.sectionContentId)
    if (!sectionId) {
      throw new Error(
        `Section not found for lesson ${lesson.slug} (sectionContentId: ${lesson.sectionContentId})`,
      )
    }

    const record = await upsertLesson(
      prisma,
      lesson.contentId,
      lesson.slug,
      lesson.title,
      lesson.description,
      lesson.body,
      lesson.serializedBody,
      lesson.order,
      lesson.access,
      lesson.href,
      sectionId,
    )
    lessonIdMap.set(lesson.contentId, record.id)
    console.log(`✅ Synced lesson: ${lesson.title}`)
  }

  // Upsert problems
  for (const problem of prepared.problems) {
    const lessonId = lessonIdMap.get(problem.lessonContentId)
    if (!lessonId) {
      throw new Error(
        `Lesson not found for problem ${problem.slug} (lessonContentId: ${problem.lessonContentId})`,
      )
    }

    await upsertProblem(
      prisma,
      problem.contentId,
      problem.slug,
      problem.href,
      problem.link,
      problem.title,
      problem.difficulty,
      problem.question,
      problem.answer,
      problem.type,
      lessonId,
      problem.serializedAnswer,
    )
    console.log(`✅ Synced problem: ${problem.title}`)
  }

  console.log('🎉 Content sync completed!')
}

/**
 * Main sync function - entry point
 */
export async function syncContent(): Promise<void> {
  const contentInfo = getContentPath()
  console.log('🆕 Using JSON-based lesson configuration')

  // Phase 1: Serialize all content (no DB operations)
  const prepared = await prepareContent(contentInfo)

  // Phase 2: Persist via idempotent, contentId-keyed upserts
  await persistContent(prepared)
}

// Exported for testing
export { prepareContent, persistContent }
export type { PreparedContent }

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
