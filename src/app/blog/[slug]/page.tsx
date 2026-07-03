import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getBlogPostBySlug, getBlogPostSlugs, getRelatedPosts, getAdjacentPosts } from '@/services/blog'
import { BlogMdxRenderer } from '@/components/BlogMdxRenderer'
import { Giscus } from '@/components/Giscus'
import { ShareButtons } from '@/components/ShareButtons'
import { NewsletterCTA } from '@/components/NewsletterCTA'
import { MemoizedCTA } from '@/components/MemoizedCTA'
import { AuthorCard } from '@/components/AuthorCard'
import { BLOG_PREFIX, APP_NAME, AUTHOR } from '@/constants'
import { getSiteUrl } from '@/config/env'

type BlogPostPageProps = {
  params: Promise<{ slug: string }>
}

/**
 * Generate JSON-LD structured data for blog posts (Article schema)
 * This helps search engines understand the content better
 */
function generateArticleJsonLd(post: {
  title: string
  description: string
  author: string
  publishedAt: Date | null
  updatedAt: Date
  coverImage: string | null
  slug: string
}) {
  const siteUrl = getSiteUrl()
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: APP_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/images/logo.png`,
      },
    },
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}${BLOG_PREFIX}/${post.slug}`,
    },
    ...(post.coverImage && {
      image: {
        '@type': 'ImageObject',
        url: post.coverImage.startsWith('http') 
          ? post.coverImage 
          : `${siteUrl}${post.coverImage}`,
      },
    }),
  }
}

export async function generateStaticParams() {
  const slugs = await getBlogPostSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    return {
      title: 'Post Not Found',
    }
  }

  const siteUrl = getSiteUrl()

  return {
    title: `${post.title} | ${APP_NAME} Blog`,
    description: post.description,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${siteUrl}${BLOG_PREFIX}/${post.slug}`,
      siteName: APP_NAME,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.author],
      images: post.coverImage
        ? [{ url: post.coverImage, width: 1200, height: 630 }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
    alternates: {
      canonical: `${siteUrl}${BLOG_PREFIX}/${post.slug}`,
    },
  }
}

function formatBlogDate(date: Date | null): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const [relatedPosts, adjacentPosts] = await Promise.all([
    getRelatedPosts(post.slug, post.tags, 3),
    post.publishedAt ? getAdjacentPosts(post.slug, post.publishedAt) : Promise.resolve({ previousPost: null, nextPost: null }),
  ])
  const jsonLd = generateArticleJsonLd(post)

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <article className="mx-auto max-w-2xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:pt-20">
        {/* Header */}
        <header className="mb-12">
          {/* Back to Blog link */}
          <Link
            href={BLOG_PREFIX}
            className="group mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <svg
              className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Blog
          </Link>

          {/* Tags - subtle, above title */}
          {post.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`${BLOG_PREFIX}?tag=${encodeURIComponent(tag)}`}
                  className="text-sm font-medium text-lime-600 transition-colors hover:text-lime-700 dark:text-lime-400 dark:hover:text-lime-300"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.2]">
            {post.title}
          </h1>

          {/* Description/Subtitle */}
          <p className="mt-4 text-xl text-zinc-600 dark:text-zinc-400 sm:text-[1.375rem] sm:leading-relaxed">
            {post.description}
          </p>

          {/* Meta - Clean byline */}
          <div className="mt-8 flex items-center gap-3 border-t border-zinc-100 pt-6 dark:border-zinc-800/50">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full">
              <Image
                src={AUTHOR.image}
                alt={post.author}
                fill
                className="object-cover"
                sizes="44px"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-zinc-900 dark:text-white">
                {post.author}
              </span>
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <time dateTime={post.publishedAt?.toISOString()}>
                  {formatBlogDate(post.publishedAt)}
                </time>
                <span>·</span>
                <span>{post.readingTime} min read</span>
              </div>
            </div>
          </div>
        </header>

        {/* Cover Image - Full width, after header */}
        {post.coverImage && (
          <figure className="-mx-4 mb-12 sm:-mx-6 lg:-mx-12">
            <div className="relative aspect-[16/9] overflow-hidden sm:rounded-xl">
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 800px"
              />
            </div>
          </figure>
        )}

        {/* Content */}
        <div id="blog-content" className="blog-prose">
          {post.serializedBody ? (
            <BlogMdxRenderer serializedContent={post.serializedBody} />
          ) : (
            <div className="prose prose-lg prose-zinc max-w-none dark:prose-invert">
              {post.body}
            </div>
          )}
        </div>

        {/* Memoized CTA - After content, before share */}
        <div className="mt-12">
          <MemoizedCTA />
        </div>

        {/* Share Buttons */}
        <div className="mt-8">
          <ShareButtons 
            url={`${BLOG_PREFIX}/${post.slug}`}
            title={post.title}
            description={post.description}
          />
        </div>

        {/* Newsletter CTA */}
        <div className="mt-12">
          <NewsletterCTA />
        </div>

        {/* Author Card */}
        <div className="mt-12">
          <AuthorCard />
        </div>

        {/* Post Navigation */}
        <nav className="mt-16 border-t border-zinc-100 pt-8 dark:border-zinc-800/50">
          {/* Show centered "Back to All Articles" if no adjacent posts exist */}
          {!adjacentPosts.previousPost && !adjacentPosts.nextPost ? (
            <div className="flex justify-center">
              <Link
                href={BLOG_PREFIX}
                className="group inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-lime-600 dark:text-zinc-400 dark:hover:text-lime-400"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back to All Articles
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
              {/* Previous Post (newer) */}
              <div className="flex-1">
                {adjacentPosts.previousPost ? (
                  <Link
                    href={`${BLOG_PREFIX}/${adjacentPosts.previousPost.slug}`}
                    className="group flex flex-col"
                  >
                    <span className="mb-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      ← Previous
                    </span>
                    <span className="text-base font-medium text-zinc-900 transition-colors group-hover:text-lime-600 dark:text-white dark:group-hover:text-lime-400">
                      {adjacentPosts.previousPost.title}
                    </span>
                  </Link>
                ) : (
                  <div /> /* Empty spacer when no previous post */
                )}
              </div>

              {/* Next Post (older) */}
              <div className="flex-1 text-right">
                {adjacentPosts.nextPost ? (
                  <Link
                    href={`${BLOG_PREFIX}/${adjacentPosts.nextPost.slug}`}
                    className="group inline-flex flex-col items-end"
                  >
                    <span className="mb-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Next →
                    </span>
                    <span className="text-base font-medium text-zinc-900 transition-colors group-hover:text-lime-600 dark:text-white dark:group-hover:text-lime-400">
                      {adjacentPosts.nextPost.title}
                    </span>
                  </Link>
                ) : (
                  <div /> /* Empty spacer when no next post */
                )}
              </div>
            </div>
          )}
        </nav>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-16 border-t border-zinc-100 pt-12 dark:border-zinc-800/50">
            <h2 className="mb-8 text-lg font-semibold text-zinc-900 dark:text-white">
              Related Articles
            </h2>
            <div className="space-y-6">
              {relatedPosts.map((related) => (
                <Link
                  key={related.slug}
                  href={`${BLOG_PREFIX}/${related.slug}`}
                  className="group block"
                >
                  <h3 className="font-medium text-zinc-900 transition-colors group-hover:text-lime-600 dark:text-white dark:group-hover:text-lime-400">
                    {related.title}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {related.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Giscus Comments */}
        <section className="mt-16 border-t border-zinc-100 pt-12 dark:border-zinc-800/50">
          <h2 className="mb-8 text-lg font-semibold text-zinc-900 dark:text-white">
            Comments
          </h2>
          <Giscus term={post.slug} />
        </section>
      </article>
    </>
  )
}
