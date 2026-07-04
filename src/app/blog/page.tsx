import { Suspense } from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getBlogPosts, getAllBlogTags } from '@/services/blog'
import { NewsletterCTA } from '@/components/NewsletterCTA'
import { APP_NAME, BLOG_PREFIX } from '@/constants'
import { getSiteUrl } from '@/config/env'

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  title: `Blog | ${APP_NAME}`,
  description:
    'Articles on software development, coding interviews, and building products. Learn tips, tricks, and insights from the memoized team.',
  openGraph: {
    title: `Blog | ${APP_NAME}`,
    description:
      'Articles on software development, coding interviews, and building products.',
    url: `${siteUrl}/blog`,
    siteName: APP_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Blog | ${APP_NAME}`,
    description:
      'Articles on software development, coding interviews, and building products.',
  },
  alternates: {
    canonical: `${siteUrl}/blog`,
    types: {
      'application/rss+xml': `${siteUrl}/blog/rss.xml`,
    },
  },
}

type BlogPageProps = {
  searchParams: Promise<{ tag?: string }>
}

function formatBlogDate(date: Date | null): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

async function BlogPostList({ tag }: { tag?: string }) {
  const { posts } = await getBlogPosts({ tag })

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 text-5xl">📝</div>
        <h2 className="mb-2 text-lg font-medium text-zinc-900 dark:text-white">
          {tag ? `No posts tagged "${tag}"` : 'No posts yet'}
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          {tag
            ? 'Try a different tag or check back later.'
            : 'Check back soon for new content!'}
        </p>
      </div>
    )
  }

  // Split into featured (first post) and rest
  const [featured, ...rest] = posts

  return (
    <div className="space-y-16">
      {/* Featured Post */}
      {featured && (
        <article className="group">
          <Link href={`${BLOG_PREFIX}/${featured.slug}`} className="block">
            {featured.coverImage && (
              <div className="relative mb-6 aspect-[2/1] overflow-hidden rounded-xl">
                <Image
                  src={featured.coverImage}
                  alt={featured.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  sizes="(max-width: 768px) 100vw, 720px"
                  priority
                />
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <time dateTime={featured.publishedAt?.toISOString()}>
                {formatBlogDate(featured.publishedAt)}
              </time>
              <span>·</span>
              <span>{featured.readingTime} min read</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-zinc-900 transition-colors group-hover:text-lime-600 dark:text-white dark:group-hover:text-lime-400 sm:text-3xl">
              {featured.title}
            </h2>
            <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
              {featured.description}
            </p>
          </Link>
        </article>
      )}

      {/* Rest of Posts */}
      {rest.length > 0 && (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {rest.map((post) => (
            <article key={post.slug} className="group py-8 first:pt-0">
              <Link href={`${BLOG_PREFIX}/${post.slug}`} className="block">
                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <time dateTime={post.publishedAt?.toISOString()}>
                    {formatBlogDate(post.publishedAt)}
                  </time>
                  <span>·</span>
                  <span>{post.readingTime} min read</span>
                </div>
                <h2 className="mt-2 text-xl font-semibold text-zinc-900 transition-colors group-hover:text-lime-600 dark:text-white dark:group-hover:text-lime-400">
                  {post.title}
                </h2>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400 line-clamp-2">
                  {post.description}
                </p>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function BlogPostListSkeleton() {
  return (
    <div className="space-y-16">
      {/* Featured skeleton */}
      <div className="animate-pulse">
        <div className="mb-6 aspect-[2/1] rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-3 h-8 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-3 h-5 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      {/* List skeletons */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse py-8 first:pt-0">
            <div className="h-4 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-3 h-6 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-2 h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  )
}

async function TagFilter({ activeTag }: { activeTag?: string }) {
  const tags = await getAllBlogTags()

  if (tags.length === 0) return null

  return (
    <div className="mb-12 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <span className="font-medium text-zinc-900 dark:text-white">Filter:</span>
      <Link
        href="/blog"
        className={`transition-colors ${
          !activeTag
            ? 'font-medium text-lime-600 dark:text-lime-400'
            : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
        }`}
      >
        All
      </Link>
      {tags.map(({ tag, count }) => (
        <Link
          key={tag}
          href={`/blog?tag=${encodeURIComponent(tag)}`}
          className={`transition-colors ${
            activeTag === tag
              ? 'font-medium text-lime-600 dark:text-lime-400'
              : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
          }`}
        >
          {tag}
          <span className="ml-1 text-zinc-400 dark:text-zinc-500">({count})</span>
        </Link>
      ))}
    </div>
  )
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { tag } = await searchParams

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:pt-20">
      {/* Header */}
      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
          Blog
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Thoughts on software development, coding interviews, and building great products.
        </p>
      </header>

      {/* Tag Filter */}
      <Suspense fallback={null}>
        <TagFilter activeTag={tag} />
      </Suspense>

      {/* Blog Posts */}
      <Suspense fallback={<BlogPostListSkeleton />}>
        <BlogPostList tag={tag} />
      </Suspense>

      {/* Newsletter CTA */}
      <div className="mt-20 border-t border-zinc-100 pt-12 dark:border-zinc-800/50">
        <NewsletterCTA />
      </div>
    </div>
  )
}
