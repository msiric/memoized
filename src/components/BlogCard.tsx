import Image from 'next/image'
import Link from 'next/link'
import { BLOG_PREFIX } from '@/constants'
import { GridPattern } from '@/components/GridPattern'

export type BlogCardProps = {
  slug: string
  title: string
  description: string
  coverImage?: string | null
  author: string
  tags: string[]
  readingTime: number
  publishedAt: Date | null
}

function formatBlogDate(date: Date | null): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function BlogCard({
  slug,
  title,
  description,
  coverImage,
  author,
  tags,
  readingTime,
  publishedAt,
}: BlogCardProps) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all duration-300 hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      {/* Cover Image or Pattern Fallback */}
      <Link href={`${BLOG_PREFIX}/${slug}`} className="relative aspect-[16/9] overflow-hidden bg-zinc-900">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
            {/* Grid Pattern Background - matching CourseCard style */}
            <div className="absolute inset-0 rounded-t-2xl [mask-image:linear-gradient(white,transparent)]">
              <GridPattern
                width={72}
                height={56}
                x="50%"
                className="absolute inset-x-0 inset-y-[-30%] h-[160%] w-full skew-y-[-18deg] fill-black/[0.02] stroke-black/5 dark:fill-white/1 dark:stroke-white/2.5"
              />
            </div>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-6">
        {/* Tags */}
        {tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {tags.slice(0, 3).map((tag) => (
              <Link
                key={tag}
                href={`${BLOG_PREFIX}?tag=${encodeURIComponent(tag)}`}
                className="inline-flex items-center rounded-full bg-lime-100 px-2.5 py-0.5 text-xs font-medium text-lime-800 transition-colors hover:bg-lime-200 dark:bg-lime-900/30 dark:text-lime-400 dark:hover:bg-lime-900/50"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        {/* Title */}
        <h2 className="mb-2 text-lg font-semibold text-zinc-900 transition-colors group-hover:text-lime-600 dark:text-white dark:group-hover:text-lime-400">
          <Link href={`${BLOG_PREFIX}/${slug}`}>
            <span className="absolute inset-0" />
            {title}
          </Link>
        </h2>

        {/* Description */}
        <p className="mb-4 line-clamp-2 flex-1 text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </p>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-500">
          <div className="flex items-center gap-2">
            <span>{author}</span>
            {publishedAt && (
              <>
                <span>·</span>
                <time dateTime={publishedAt.toISOString()}>
                  {formatBlogDate(publishedAt)}
                </time>
              </>
            )}
          </div>
          <span className="flex items-center gap-1">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {readingTime} min read
          </span>
        </div>
      </div>
    </article>
  )
}

/**
 * Skeleton loader for blog cards
 */
export function BlogCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="aspect-[16/9] bg-zinc-200 dark:bg-zinc-800" />
      <div className="p-6">
        <div className="mb-3 flex gap-2">
          <div className="h-5 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-5 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="mb-2 h-6 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mb-4 space-y-2">
          <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  )
}
