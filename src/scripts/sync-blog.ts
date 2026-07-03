import fs from 'fs'
import path from 'path'
import { upsertBlogPost } from '@/services/blog'
import prisma from '@/lib/prisma'
import { InputJsonValue } from '@prisma/client/runtime/library'
import { isProduction } from '../utils/helpers'
import { serialize } from 'next-mdx-remote-client/serialize'
import { BLOG_FOLDER, SAMPLES_FOLDER } from '@/constants'

// Sample blog folder for development when real content isn't available
const SAMPLE_BLOG_FOLDER = 'blog'

interface BlogPostMetadata {
  title: string
  description: string
  tags?: string[]
  published?: boolean
  publishedAt?: string
  coverImage?: string
  author?: string
}

/**
 * Calculate reading time based on word count
 * Average reading speed: ~200 words per minute
 */
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200
  const wordCount = content
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]*`/g, '') // Remove inline code
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Replace links with text
    .replace(/[#*_~`]/g, '') // Remove markdown formatting
    .split(/\s+/)
    .filter((word) => word.length > 0).length

  return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
}

/**
 * Extract metadata from MDX file content
 */
function extractMetadata(content: string): { metadata: BlogPostMetadata | null; body: string } {
  // Match the exported metadata object
  const metadataMatch = content.match(/export\s+const\s+metadata\s*=\s*(\{[\s\S]*?\})\s*(?=\n\n|$)/m)
  
  if (!metadataMatch) {
    return { metadata: null, body: content }
  }

  try {
    // Use Function to safely evaluate the object literal
    // eslint-disable-next-line no-new-func
    const metadata = new Function(`return ${metadataMatch[1]}`)() as BlogPostMetadata
    
    // Remove the metadata export from the body
    const body = content.replace(metadataMatch[0], '').trim()
    
    return { metadata, body }
  } catch (error) {
    console.error('Failed to parse metadata:', error)
    return { metadata: null, body: content }
  }
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
 * Determine blog content path based on available content
 * Priority:
 * 1. Main blog folder (src/blog) - used when content is copied from private repo
 * 2. Sample blog folder (src/samples/blog) - used for development
 */
function getBlogPath(): { path: string; isSample: boolean } {
  const mainBlogPath = path.join(process.cwd(), 'src', BLOG_FOLDER)
  const sampleBlogPath = path.join(process.cwd(), 'src', SAMPLES_FOLDER, SAMPLE_BLOG_FOLDER)

  // Check if main blog folder has content (subdirectories with posts)
  if (fs.existsSync(mainBlogPath)) {
    const entries = fs.readdirSync(mainBlogPath, { withFileTypes: true })
    const hasPostDirs = entries.some(
      (entry) => entry.isDirectory() && !entry.name.startsWith('.')
    )
    
    if (hasPostDirs) {
      console.log('📂 Using blog content from main directory')
      return { path: mainBlogPath, isSample: false }
    }
  }

  // Fall back to sample blog content
  if (fs.existsSync(sampleBlogPath)) {
    const entries = fs.readdirSync(sampleBlogPath, { withFileTypes: true })
    const hasPostDirs = entries.some(
      (entry) => entry.isDirectory() && !entry.name.startsWith('.')
    )
    
    if (hasPostDirs) {
      console.log('📂 Using sample blog content for development')
      return { path: sampleBlogPath, isSample: true }
    }
  }

  // No blog content available - create empty main directory
  console.log('📂 No blog content found, creating empty directory')
  if (!fs.existsSync(mainBlogPath)) {
    fs.mkdirSync(mainBlogPath, { recursive: true })
  }
  
  return { path: mainBlogPath, isSample: false }
}

/**
 * Get all blog post directories
 */
function getBlogPostDirs(blogPath: string): string[] {
  if (!fs.existsSync(blogPath)) {
    return []
  }

  return fs
    .readdirSync(blogPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() && !dirent.name.startsWith('.'))
    .map((dirent) => dirent.name)
}

/**
 * Extract slug from directory name
 * Supports formats:
 * - "my-post-title" -> "my-post-title"
 * - "2026-01-19-my-post-title" -> "my-post-title"
 */
function extractSlug(dirName: string): string {
  // Remove date prefix if present (YYYY-MM-DD-)
  const datePrefix = /^\d{4}-\d{2}-\d{2}-/
  return dirName.replace(datePrefix, '')
}

/**
 * Main sync function
 */
async function syncBlogPosts(): Promise<string[]> {
  console.log('🚀 Starting blog sync...\n')

  const blogInfo = getBlogPath()
  const postDirs = getBlogPostDirs(blogInfo.path)

  if (postDirs.length === 0) {
    console.log('📭 No blog posts found to sync')
    return []
  }

  console.log(`📚 Found ${postDirs.length} blog post(s)${blogInfo.isSample ? ' (sample content)' : ''}\n`)

  let synced = 0
  let skipped = 0
  let errors = 0
  const syncedSlugs: string[] = []

  for (const dirName of postDirs) {
    const postPath = path.join(blogInfo.path, dirName)
    const mdxPath = path.join(postPath, 'page.mdx')

    if (!fs.existsSync(mdxPath)) {
      console.log(`⚠️ Skipping ${dirName}: no page.mdx found`)
      skipped++
      continue
    }

    try {
      console.log(`📝 Processing: ${dirName}`)

      const rawContent = fs.readFileSync(mdxPath, 'utf-8')
      const { metadata, body } = extractMetadata(rawContent)

      if (!metadata) {
        console.log(`⚠️ Skipping ${dirName}: no metadata found`)
        skipped++
        continue
      }

      if (!metadata.title || !metadata.description) {
        console.log(`⚠️ Skipping ${dirName}: missing title or description`)
        skipped++
        continue
      }

      const slug = extractSlug(dirName)
      const readingTime = calculateReadingTime(body)

      // Serialize MDX content
      const serialized = await serializeMdxContent(body, mdxPath)

      // Handle cover image path
      let coverImage = metadata.coverImage
      if (coverImage && !coverImage.startsWith('/') && !coverImage.startsWith('http')) {
        coverImage = `/blog/${slug}/${coverImage}`
      }

      // Upsert to database
      await upsertBlogPost(slug, {
        title: metadata.title,
        description: metadata.description,
        body,
        serializedBody: serialized as InputJsonValue,
        coverImage,
        author: metadata.author,
        tags: metadata.tags || [],
        readingTime,
        published: metadata.published ?? false,
        publishedAt: metadata.publishedAt ? new Date(metadata.publishedAt) : undefined,
      })

      console.log(`   ✅ Synced: "${metadata.title}" (${readingTime} min read)`)
      syncedSlugs.push(slug)
      synced++
    } catch (error) {
      console.error(`   ❌ Error syncing ${dirName}:`, error)
      errors++
    }
  }

  console.log('\n📊 Sync Summary:')
  console.log(`   ✅ Synced: ${synced}`)
  console.log(`   ⚠️ Skipped: ${skipped}`)
  console.log(`   ❌ Errors: ${errors}`)

  return syncedSlugs
}

/**
 * Clean up unpublished or deleted blog posts
 */
async function cleanupBlogPosts(currentSlugs: string[]) {
  const existingPosts = await prisma.blogPost.findMany({
    select: { slug: true },
  })

  const slugsToDelete = existingPosts
    .map((p) => p.slug)
    .filter((slug) => !currentSlugs.includes(slug))

  if (slugsToDelete.length > 0) {
    console.log(`\n🧹 Cleaning up ${slugsToDelete.length} removed post(s)...`)
    
    await prisma.blogPost.deleteMany({
      where: { slug: { in: slugsToDelete } },
    })

    for (const slug of slugsToDelete) {
      console.log(`   🗑️ Deleted: ${slug}`)
    }
  }
}

// Main execution
async function main() {
  try {
    const syncedSlugs = await syncBlogPosts()
    await cleanupBlogPosts(syncedSlugs)

    console.log('\n✨ Blog sync completed!')
  } catch (error) {
    console.error('❌ Blog sync failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
