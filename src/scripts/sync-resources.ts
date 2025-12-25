import fs from 'fs'
import path from 'path'
import { upsertResource } from '@/services/resource'
import prisma from '@/lib/prisma'
import { InputJsonValue } from '@prisma/client/runtime/library'
import { isProduction } from '../utils/helpers'
import { serialize } from 'next-mdx-remote-client/serialize'
import {
  CONTENT_FOLDER,
  RESOURCES_FOLDER,
  SAMPLES_FOLDER,
  SLUGIFY_OPTIONS,
} from '@/constants'
import { completeCurriculum } from '@/constants/curriculum'
import slugify from 'slugify'

interface LessonResource {
  id: string
  title: string
  description: string
  href?: string
  order: number
}

interface LessonConfig {
  id: string
  title: string
  description: string
  order: number
  access: 'FREE' | 'PREMIUM'
  problems?: any[]
  resources?: LessonResource[]
}

slugify.extend({ '/': '-' })

/**
 * Get content path information
 */
function getContentPath(): { path: string; isSample: boolean } {
  const contentPath = path.join(process.cwd(), 'src', CONTENT_FOLDER)
  const samplesPath = path.join(process.cwd(), 'src', SAMPLES_FOLDER)

  // Check if we have real content (submodule)
  const hasRealContent = fs.existsSync(path.join(contentPath, '.git'))
  if (hasRealContent) {
    return { path: contentPath, isSample: false }
  }

  // Check if we have sample content
  const hasSampleContent = fs.existsSync(samplesPath)
  if (hasSampleContent) {
    return { path: contentPath, isSample: true }
  }

  throw new Error('No content source available. Run yarn setup:content first.')
}

/**
 * Get lesson configuration from _lessons.json file
 */
function getLessonConfig(sectionPath: string): LessonConfig[] {
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
      const validLessons = config.lessons.filter((lesson: LessonConfig) => {
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
 * Serialize MDX content with error handling
 */
async function serializeMdxContent(content: string, filePath?: string) {
  if (!content || content.trim().length === 0) {
    console.log('⚠️ Empty content, skipping serialization')
    return null
  }

  try {
    // Import the mdx options
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
 * Sync lesson-associated resources from lesson configurations
 */
async function syncLessonAssociatedResources(): Promise<void> {
  console.log('📚 Syncing lesson-associated resources...')

  const contentInfo = getContentPath()
  let resourceOrder = 1 // Start from 1 so intro resource can have order 0

  // Process each course and section to find lesson-associated resources
  for (const course of completeCurriculum) {
    const courseSlug = slugify(course.title, SLUGIFY_OPTIONS)

    for (const section of course.sections) {
      const sectionSlug = slugify(section.title, SLUGIFY_OPTIONS)
      const sectionPath = path.join(contentInfo.path, courseSlug, sectionSlug)

      if (!fs.existsSync(sectionPath)) {
        console.warn(`⚠️ Section path not found: ${sectionPath}`)
        continue
      }

      const lessons = getLessonConfig(sectionPath)

      for (const lesson of lessons) {
        // Process resources from JSON (lesson-associated resources)
        if (lesson.resources && lesson.resources.length > 0) {
          const resourcesDir = path.join(
            process.cwd(),
            `src/${RESOURCES_FOLDER}`,
          )

          // Get lesson access level
          const accessLevel = lesson.access === 'FREE' ? 'FREE' : 'PREMIUM'

          // We need to get the lesson ID from the database to associate resources with it
          // For now, we'll use the lesson slug to find the lesson
          const lessonSlug = slugify(lesson.title, SLUGIFY_OPTIONS)

          // Get lesson from database to get its ID
          const lessonRecord = await prisma.lesson.findFirst({
            where: {
              slug: lessonSlug,
            },
          })

          if (!lessonRecord) {
            console.warn(`⚠️ Lesson not found in database: ${lessonSlug}`)
            continue
          }

          for (const resource of lesson.resources) {
            const {
              title: resourceTitle,
              description: resourceDescription,
              id: resourceId,
              href: resourceHref,
            } = resource
            const resourceSlug = slugify(resourceTitle, SLUGIFY_OPTIONS)

            const resourcePath = path.join(resourcesDir, resourceId, 'page.mdx')
            if (!fs.existsSync(resourcePath)) {
              console.error(`❌ Resource file not found: ${resourcePath}`)
              continue
            }

            const resourceContent = fs.readFileSync(resourcePath, 'utf-8')

            // Serialize resource content if it exists
            let serializedResourceContent = null
            if (resourceContent && resourceContent.trim().length > 0) {
              serializedResourceContent = await serializeMdxContent(
                resourceContent,
                resourcePath,
              )
            }

            await upsertResource(
              resourceSlug,
              resourceTitle,
              resourceDescription,
              resourceContent,
              resourceOrder++,
              resourceHref || '',
              accessLevel, // Use the lesson's access level
              lessonRecord.id,
              serializedResourceContent as InputJsonValue,
            )
            console.log(`✅ Synced lesson resource: ${resourceTitle}`)
          }
        }
      }
    }
  }

  console.log('✅ Lesson-associated resources synced')
}

/**
 * Sync resource pages to database
 */
export async function syncResources(): Promise<void> {
  console.log('📖 Syncing resource pages...')

  try {
    // Process resources intro page
    const introPath = path.join(process.cwd(), 'src/resources/intro/page.mdx')

    if (fs.existsSync(introPath)) {
      const introContent = fs.readFileSync(introPath, 'utf-8')
      const serializedIntroContent = await serializeMdxContent(
        introContent,
        introPath,
      )

      await upsertResource(
        'intro', // slug
        'Resources', // title
        'Enhance Your Learning Journey', // description
        introContent, // body
        0, // order (first)
        '/resources', // href
        'FREE', // access
        null, // lessonId (not associated with a lesson)
        serializedIntroContent as InputJsonValue, // serializedBody
      )

      console.log('✅ Resources intro page synced successfully')
    } else {
      console.warn(`⚠️ Resources intro file not found: ${introPath}`)
    }

    // Process lesson-associated resources
    await syncLessonAssociatedResources()

    console.log('✅ Resource sync completed')
  } catch (error) {
    console.error(`❌ Failed to sync resources: ${error}`)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// CLI interface
if (require.main === module) {
  syncResources().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
