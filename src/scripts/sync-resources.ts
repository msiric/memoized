import fs from 'fs'
import path from 'path'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
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

type SerializedJson = Prisma.NullableJsonNullValueInput | InputJsonValue

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

type PreparedResource = {
  slug: string
  title: string
  description: string
  body: string
  order: number
  href: string
  access: 'FREE' | 'PREMIUM'
  lessonSlug: string | null
  serializedBody: SerializedJson
}

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
async function serializeMdxContent(content: string, filePath?: string): Promise<SerializedJson> {
  if (!content || content.trim().length === 0) {
    console.log('⚠️ Empty content, skipping serialization')
    return Prisma.DbNull
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

    return serialized as unknown as InputJsonValue
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
 * Phase 1: Read and serialize all resources into in-memory structures.
 * No database operations happen here.
 */
async function prepareResources(): Promise<PreparedResource[]> {
  const prepared: PreparedResource[] = []
  const contentInfo = getContentPath()

  // Prepare intro resource
  const introPath = path.join(process.cwd(), 'src/resources/intro/page.mdx')

  if (fs.existsSync(introPath)) {
    const introContent = fs.readFileSync(introPath, 'utf-8')
    const serializedIntroContent = await serializeMdxContent(
      introContent,
      introPath,
    )

    prepared.push({
      slug: 'intro',
      title: 'Resources',
      description: 'Enhance Your Learning Journey',
      body: introContent,
      order: 0,
      href: '/resources',
      access: 'FREE',
      lessonSlug: null,
      serializedBody: serializedIntroContent,
    })

    console.log('✅ Serialized resources intro page')
  } else {
    console.warn(`⚠️ Resources intro file not found: ${introPath}`)
  }

  // Prepare lesson-associated resources
  console.log('📚 Preparing lesson-associated resources...')
  let resourceOrder = 1

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
        if (lesson.resources && lesson.resources.length > 0) {
          const resourcesDir = path.join(
            process.cwd(),
            `src/${RESOURCES_FOLDER}`,
          )
          const accessLevel = lesson.access === 'FREE' ? 'FREE' : 'PREMIUM'
          const lessonSlug = slugify(lesson.title, SLUGIFY_OPTIONS)

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

            let serializedResourceContent: SerializedJson = Prisma.DbNull
            if (resourceContent && resourceContent.trim().length > 0) {
              serializedResourceContent = await serializeMdxContent(
                resourceContent,
                resourcePath,
              )
            }

            prepared.push({
              slug: resourceSlug,
              title: resourceTitle,
              description: resourceDescription,
              body: resourceContent,
              order: resourceOrder++,
              href: resourceHref || '',
              access: accessLevel,
              lessonSlug,
              serializedBody: serializedResourceContent,
            })
            console.log(`✅ Serialized resource: ${resourceTitle}`)
          }
        }
      }
    }
  }

  console.log(`📦 Preparation complete: ${prepared.length} resources`)
  return prepared
}

/**
 * Phase 2: Persist all prepared resources to the database in a single transaction.
 */
async function persistResources(prepared: PreparedResource[]): Promise<void> {
  console.log('💾 Persisting resources to database (transaction)...')

  await prisma.$transaction(
    async (tx) => {
      for (const resource of prepared) {
        // Resolve lesson foreign key if this resource is associated with a lesson
        let lessonId: string | null = null
        if (resource.lessonSlug) {
          const lessonRecord = await tx.lesson.findUnique({
            where: { slug: resource.lessonSlug },
            select: { id: true },
          })

          if (!lessonRecord) {
            console.warn(
              `⚠️ Lesson not found in database: ${resource.lessonSlug}`,
            )
            continue
          }
          lessonId = lessonRecord.id
        }

        await tx.resource.upsert({
          where: { slug: resource.slug },
          update: {
            title: resource.title,
            description: resource.description,
            order: resource.order,
            body: resource.body,
            href: resource.href,
            access: resource.access,
            lessonId,
            serializedBody: resource.serializedBody,
          },
          create: {
            title: resource.title,
            description: resource.description,
            order: resource.order,
            slug: resource.slug,
            body: resource.body,
            href: resource.href,
            access: resource.access,
            lessonId,
            serializedBody: resource.serializedBody,
          },
        })
        console.log(`✅ Synced resource: ${resource.title}`)
      }
    },
    {
      timeout: 30000,
    },
  )

  console.log('✅ Resource sync completed')
}

/**
 * Sync resource pages to database
 */
export async function syncResources(): Promise<void> {
  console.log('📖 Syncing resource pages...')

  try {
    // Phase 1: Serialize all resources (no DB operations)
    const prepared = await prepareResources()

    // Phase 2: Persist in a single transaction (all-or-nothing)
    await persistResources(prepared)
  } catch (error) {
    console.error(`❌ Failed to sync resources: ${error}`)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Exported for testing
export { prepareResources, persistResources }
export type { PreparedResource }

// CLI interface
if (require.main === module) {
  syncResources().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
