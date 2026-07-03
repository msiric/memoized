'use client'

import { ReactNode, HTMLAttributes } from 'react'

function AnchorIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m6.5 11.5-.964-.964a3.535 3.535 0 1 1 5-5l.964.964m2 2 .964.964a3.536 3.536 0 0 1-5 5L8.5 13.5m0-5 3 3" />
    </svg>
  )
}

/**
 * Generate a slug from text content for use as an ID
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Extract text content from React children (handles nested elements)
 */
function getTextContent(children: ReactNode): string {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(getTextContent).join('')
  if (children && typeof children === 'object' && 'props' in children) {
    return getTextContent((children as { props: { children?: ReactNode } }).props.children)
  }
  return ''
}

interface BlogHeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level: 1 | 2 | 3 | 4
  children?: ReactNode
}

function BlogHeading({ level, children, id, className = '', ...props }: BlogHeadingProps) {
  const Component = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4'
  
  // Generate ID from text content if not provided
  const textContent = getTextContent(children)
  const headingId = id || generateSlug(textContent)

  // Base classes for each heading level
  const levelClasses: Record<number, string> = {
    1: 'mb-6 mt-8 text-3xl font-bold tracking-tight first:mt-0',
    2: 'mb-4 mt-8 text-2xl font-bold tracking-tight first:mt-0',
    3: 'mb-3 mt-6 text-xl font-semibold first:mt-0',
    4: 'mb-2 mt-4 text-lg font-semibold first:mt-0',
  }

  return (
    <Component
      id={headingId}
      className={`group relative scroll-mt-24 ${levelClasses[level]} ${className}`}
      {...props}
    >
      <a
        href={`#${headingId}`}
        className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 md:block hidden"
        aria-label={`Link to ${textContent}`}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-100 ring-1 ring-zinc-200 transition-colors hover:bg-zinc-200 hover:ring-zinc-300 dark:bg-zinc-800 dark:ring-zinc-700 dark:hover:bg-zinc-700 dark:hover:ring-zinc-600">
          <AnchorIcon className="h-4 w-4 stroke-zinc-500 dark:stroke-zinc-400" />
        </span>
      </a>
      {children}
    </Component>
  )
}

// Export individual heading components for MDX
export const BlogH1 = (props: HTMLAttributes<HTMLHeadingElement>) => (
  <BlogHeading level={1} {...props} />
)

export const BlogH2 = (props: HTMLAttributes<HTMLHeadingElement>) => (
  <BlogHeading level={2} {...props} />
)

export const BlogH3 = (props: HTMLAttributes<HTMLHeadingElement>) => (
  <BlogHeading level={3} {...props} />
)

export const BlogH4 = (props: HTMLAttributes<HTMLHeadingElement>) => (
  <BlogHeading level={4} {...props} />
)
