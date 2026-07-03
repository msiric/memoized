import { ImageResponse } from 'next/og'
import { getBlogPostBySlug } from '@/services/blog'

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs'

export const alt = 'Blog post'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#18181B',
          }}
        >
          <div
            style={{
              display: 'flex',
              color: '#FAFAFA',
              fontSize: 48,
              fontWeight: 700,
            }}
          >
            Post Not Found
          </div>
        </div>
      ),
      { ...size }
    )
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#18181B',
          padding: 60,
          position: 'relative',
        }}
      >
        {/* Decorative gradient accent */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: 'linear-gradient(90deg, #84CC16, #22C55E)',
          }}
        />

        {/* Tags */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 24,
          }}
        >
          {post.tags.slice(0, 3).map((tag) => (
            <div
              key={tag}
              style={{
                display: 'flex',
                backgroundColor: 'rgba(132, 204, 22, 0.2)',
                color: '#84CC16',
                padding: '8px 16px',
                borderRadius: 20,
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              {tag}
            </div>
          ))}
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            color: '#FAFAFA',
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 24,
            flexWrap: 'wrap',
            maxWidth: '90%',
          }}
        >
          {post.title.length > 80
            ? post.title.substring(0, 80) + '...'
            : post.title}
        </div>

        {/* Description */}
        <div
          style={{
            display: 'flex',
            color: '#A1A1AA',
            fontSize: 28,
            lineHeight: 1.4,
            maxWidth: '80%',
            marginBottom: 'auto',
          }}
        >
          {post.description.length > 140
            ? post.description.substring(0, 140) + '...'
            : post.description}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          {/* Author and date */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            {/* Avatar placeholder */}
            <div
              style={{
                display: 'flex',
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#84CC16',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#18181B',
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              {post.author.charAt(0).toUpperCase()}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  color: '#FAFAFA',
                  fontSize: 20,
                  fontWeight: 600,
                }}
              >
                {post.author}
              </div>
              <div
                style={{
                  display: 'flex',
                  color: '#71717A',
                  fontSize: 16,
                }}
              >
                {post.readingTime} min read
              </div>
            </div>
          </div>

          {/* Brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                width: 40,
                height: 40,
                borderRadius: 8,
                backgroundColor: '#84CC16',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#18181B',
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              M
            </div>
            <div
              style={{
                display: 'flex',
                color: '#FAFAFA',
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              memoized
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
