import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET, escapeXml, escapeCdata, stripInvalidXmlChars } from './route'

// Mock dependencies
vi.mock('@/services/blog', () => ({
  getBlogPostsForFeed: vi.fn(),
}))

vi.mock('@/config/env', () => ({
  getSiteUrl: vi.fn(() => 'https://test.memoized.io'),
}))

vi.mock('@/constants', () => ({
  APP_NAME: 'TestApp',
}))

// Import mocked modules
import { getBlogPostsForFeed } from '@/services/blog'
import { getSiteUrl } from '@/config/env'

const mockGetBlogPostsForFeed = getBlogPostsForFeed as ReturnType<typeof vi.fn>
const mockGetSiteUrl = getSiteUrl as ReturnType<typeof vi.fn>

describe('RSS Feed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
    mockGetSiteUrl.mockReturnValue('https://test.memoized.io')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('stripInvalidXmlChars', () => {
    it('removes null bytes (0x00)', () => {
      const input = 'hello\x00world'
      expect(stripInvalidXmlChars(input)).toBe('helloworld')
    })

    it('removes control characters 0x01-0x08', () => {
      const input = 'a\x01b\x02c\x03d\x04e\x05f\x06g\x07h\x08i'
      expect(stripInvalidXmlChars(input)).toBe('abcdefghi')
    })

    it('removes 0x0B (vertical tab) and 0x0C (form feed)', () => {
      const input = 'hello\x0Bworld\x0C!'
      expect(stripInvalidXmlChars(input)).toBe('helloworld!')
    })

    it('removes control characters 0x0E-0x1F', () => {
      const input = 'test\x0E\x0F\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1A\x1B\x1C\x1D\x1E\x1Fend'
      expect(stripInvalidXmlChars(input)).toBe('testend')
    })

    it('removes DEL character (0x7F)', () => {
      const input = 'hello\x7Fworld'
      expect(stripInvalidXmlChars(input)).toBe('helloworld')
    })

    it('removes 0xFFFE and 0xFFFF', () => {
      const input = 'hello\uFFFEworld\uFFFF!'
      expect(stripInvalidXmlChars(input)).toBe('helloworld!')
    })

    it('preserves tab (0x09)', () => {
      const input = 'hello\tworld'
      expect(stripInvalidXmlChars(input)).toBe('hello\tworld')
    })

    it('preserves newline (0x0A)', () => {
      const input = 'hello\nworld'
      expect(stripInvalidXmlChars(input)).toBe('hello\nworld')
    })

    it('preserves carriage return (0x0D)', () => {
      const input = 'hello\rworld'
      expect(stripInvalidXmlChars(input)).toBe('hello\rworld')
    })

    it('preserves regular printable characters', () => {
      const input = 'Hello, World! 123 @#$%'
      expect(stripInvalidXmlChars(input)).toBe('Hello, World! 123 @#$%')
    })

    it('preserves Unicode characters', () => {
      const input = 'Hello 世界 🌍 émoji'
      expect(stripInvalidXmlChars(input)).toBe('Hello 世界 🌍 émoji')
    })

    it('handles empty string', () => {
      expect(stripInvalidXmlChars('')).toBe('')
    })
  })

  describe('escapeXml', () => {
    it('escapes ampersand first (prevents double-escaping)', () => {
      expect(escapeXml('Tom & Jerry')).toBe('Tom &amp; Jerry')
    })

    it('escapes less-than sign', () => {
      expect(escapeXml('<script>')).toBe('&lt;script&gt;')
    })

    it('escapes greater-than sign', () => {
      expect(escapeXml('a > b')).toBe('a &gt; b')
    })

    it('escapes double quotes', () => {
      expect(escapeXml('say "hello"')).toBe('say &quot;hello&quot;')
    })

    it('escapes single quotes (apostrophe)', () => {
      expect(escapeXml("it's fine")).toBe('it&apos;s fine')
    })

    it('escapes all special chars in combination', () => {
      const input = '<tag attr="val\'ue">Tom & Jerry</tag>'
      const expected = '&lt;tag attr=&quot;val&apos;ue&quot;&gt;Tom &amp; Jerry&lt;/tag&gt;'
      expect(escapeXml(input)).toBe(expected)
    })

    it('does not double-escape already escaped content', () => {
      // If input is "&amp;" it should become "&amp;amp;" (correct behavior)
      // This ensures we're not trying to be "smart" about already-escaped content
      expect(escapeXml('&amp;')).toBe('&amp;amp;')
    })

    it('handles null', () => {
      expect(escapeXml(null)).toBe('')
    })

    it('handles undefined', () => {
      expect(escapeXml(undefined)).toBe('')
    })

    it('handles empty string', () => {
      expect(escapeXml('')).toBe('')
    })

    it('strips invalid XML chars while escaping', () => {
      expect(escapeXml('hello\x00<world>')).toBe('hello&lt;world&gt;')
    })

    it('handles XSS attempt', () => {
      const xss = '<script>alert("XSS")</script>'
      const escaped = escapeXml(xss)
      expect(escaped).not.toContain('<script>')
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;')
    })
  })

  describe('escapeCdata', () => {
    it('handles text without CDATA terminators', () => {
      expect(escapeCdata('Normal text here')).toBe('Normal text here')
    })

    it('escapes ]]> sequence correctly', () => {
      const input = 'Some ]]> injection'
      const expected = 'Some ]]]]><![CDATA[> injection'
      expect(escapeCdata(input)).toBe(expected)
    })

    it('escapes multiple ]]> sequences', () => {
      const input = 'First ]]> and second ]]> here'
      const expected = 'First ]]]]><![CDATA[> and second ]]]]><![CDATA[> here'
      expect(escapeCdata(input)).toBe(expected)
    })

    it('escapes ]]> at the start', () => {
      expect(escapeCdata(']]>text')).toBe(']]]]><![CDATA[>text')
    })

    it('escapes ]]> at the end', () => {
      expect(escapeCdata('text]]>')).toBe('text]]]]><![CDATA[>')
    })

    it('handles null', () => {
      expect(escapeCdata(null)).toBe('')
    })

    it('handles undefined', () => {
      expect(escapeCdata(undefined)).toBe('')
    })

    it('handles empty string', () => {
      expect(escapeCdata('')).toBe('')
    })

    it('strips invalid XML chars while handling CDATA', () => {
      expect(escapeCdata('hello\x00world')).toBe('helloworld')
    })

    it('preserves HTML tags (they are safe in CDATA)', () => {
      const html = '<strong>Bold</strong> & <em>italic</em>'
      expect(escapeCdata(html)).toBe('<strong>Bold</strong> & <em>italic</em>')
    })
  })

  describe('GET handler', () => {
    const mockPosts = [
      {
        slug: 'test-post',
        title: 'Test Post Title',
        description: 'A test description',
        author: 'Mario Siric',
        tags: ['react', 'typescript'],
        publishedAt: new Date('2024-06-01T10:00:00Z'),
        updatedAt: new Date('2024-06-10T10:00:00Z'),
      },
    ]

    it('returns valid RSS 2.0 XML', async () => {
      mockGetBlogPostsForFeed.mockResolvedValue(mockPosts)

      const response = await GET()
      const body = await response.text()

      expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(body).toContain('<rss version="2.0"')
      expect(body).toContain('xmlns:atom="http://www.w3.org/2005/Atom"')
    })

    it('includes all required channel elements', async () => {
      mockGetBlogPostsForFeed.mockResolvedValue(mockPosts)

      const response = await GET()
      const body = await response.text()

      expect(body).toContain('<title>TestApp Blog</title>')
      expect(body).toContain('<link>https://test.memoized.io/blog</link>')
      expect(body).toContain('<description>')
      expect(body).toContain('<language>en-us</language>')
      expect(body).toContain('<lastBuildDate>')
    })

    it('includes atom:link for self-reference', async () => {
      mockGetBlogPostsForFeed.mockResolvedValue(mockPosts)

      const response = await GET()
      const body = await response.text()

      expect(body).toContain('<atom:link href="https://test.memoized.io/blog/rss.xml" rel="self"')
    })

    it('includes image element', async () => {
      mockGetBlogPostsForFeed.mockResolvedValue(mockPosts)

      const response = await GET()
      const body = await response.text()

      expect(body).toContain('<image>')
      expect(body).toContain('<url>https://test.memoized.io/images/logo.png</url>')
    })

    it('includes items for each post', async () => {
      mockGetBlogPostsForFeed.mockResolvedValue(mockPosts)

      const response = await GET()
      const body = await response.text()

      expect(body).toContain('<item>')
      expect(body).toContain('<![CDATA[Test Post Title]]>')
      expect(body).toContain('<link>https://test.memoized.io/blog/test-post</link>')
      expect(body).toContain('<guid isPermaLink="true">https://test.memoized.io/blog/test-post</guid>')
      expect(body).toContain('<![CDATA[A test description]]>')
      expect(body).toContain('<author>Mario Siric</author>')
    })

    it('includes category tags for posts', async () => {
      mockGetBlogPostsForFeed.mockResolvedValue(mockPosts)

      const response = await GET()
      const body = await response.text()

      expect(body).toContain('<category>react</category>')
      expect(body).toContain('<category>typescript</category>')
    })

    it('properly escapes post titles with special characters', async () => {
      const postsWithSpecialChars = [
        {
          ...mockPosts[0],
          title: 'Test & Trial: <Special> "Characters"',
        },
      ]
      mockGetBlogPostsForFeed.mockResolvedValue(postsWithSpecialChars)

      const response = await GET()
      const body = await response.text()

      // Title is in CDATA, so special chars are preserved except ]]>
      expect(body).toContain('<![CDATA[Test & Trial: <Special> "Characters"]]>')
    })

    it('properly escapes author with special characters', async () => {
      const postsWithSpecialAuthor = [
        {
          ...mockPosts[0],
          author: 'Tom & Jerry <Duo>',
        },
      ]
      mockGetBlogPostsForFeed.mockResolvedValue(postsWithSpecialAuthor)

      const response = await GET()
      const body = await response.text()

      expect(body).toContain('<author>Tom &amp; Jerry &lt;Duo&gt;</author>')
    })

    it('properly escapes tags with special characters', async () => {
      const postsWithSpecialTags = [
        {
          ...mockPosts[0],
          tags: ['C++', 'Q&A'],
        },
      ]
      mockGetBlogPostsForFeed.mockResolvedValue(postsWithSpecialTags)

      const response = await GET()
      const body = await response.text()

      expect(body).toContain('<category>C++</category>')
      expect(body).toContain('<category>Q&amp;A</category>')
    })

    it('URL-encodes post slugs', async () => {
      const postsWithSpecialSlug = [
        {
          ...mockPosts[0],
          slug: 'hello world', // Space in slug (unlikely but test encoding)
        },
      ]
      mockGetBlogPostsForFeed.mockResolvedValue(postsWithSpecialSlug)

      const response = await GET()
      const body = await response.text()

      expect(body).toContain('hello%20world')
    })

    it('sets correct Content-Type header', async () => {
      mockGetBlogPostsForFeed.mockResolvedValue(mockPosts)

      const response = await GET()

      expect(response.headers.get('Content-Type')).toBe('application/rss+xml; charset=utf-8')
    })

    it('sets Cache-Control headers', async () => {
      mockGetBlogPostsForFeed.mockResolvedValue(mockPosts)

      const response = await GET()

      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600, s-maxage=3600')
    })

    it('returns empty feed when no posts exist', async () => {
      mockGetBlogPostsForFeed.mockResolvedValue([])

      const response = await GET()
      const body = await response.text()

      expect(response.status).toBe(200)
      expect(body).toContain('<channel>')
      expect(body).not.toContain('<item>')
    })

    it('returns 500 with valid empty feed on error', async () => {
      mockGetBlogPostsForFeed.mockRejectedValue(new Error('Database error'))

      const response = await GET()
      const body = await response.text()

      expect(response.status).toBe(500)
      expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(body).toContain('<rss version="2.0">')
      expect(body).toContain('<title>TestApp Blog</title>')
      expect(body).toContain('<description>Feed temporarily unavailable</description>')
    })

    it('sets no-cache header on error', async () => {
      mockGetBlogPostsForFeed.mockRejectedValue(new Error('Database error'))

      const response = await GET()

      expect(response.headers.get('Cache-Control')).toBe('no-cache')
    })

    it('handles CDATA injection in title', async () => {
      const postsWithCdataInjection = [
        {
          ...mockPosts[0],
          title: 'Test ]]> Injection',
        },
      ]
      mockGetBlogPostsForFeed.mockResolvedValue(postsWithCdataInjection)

      const response = await GET()
      const body = await response.text()

      // Should contain the escaped CDATA terminator
      expect(body).toContain(']]]]><![CDATA[>')
      // The raw ]]> should not appear inside a single CDATA section
      // The escaped version splits it: ]]]]><![CDATA[>
      // This means the title CDATA is properly split into two sections
      expect(body).toContain('<![CDATA[Test ]]]]><![CDATA[> Injection]]>')
    })

    it('handles posts with null publishedAt', async () => {
      const postsWithNullDate = [
        {
          ...mockPosts[0],
          publishedAt: null,
        },
      ]
      mockGetBlogPostsForFeed.mockResolvedValue(postsWithNullDate)

      const response = await GET()
      const body = await response.text()

      expect(response.status).toBe(200)
      expect(body).toContain('<pubDate>')
    })

    it('handles posts with empty tags array', async () => {
      const postsWithNoTags = [
        {
          ...mockPosts[0],
          tags: [],
        },
      ]
      mockGetBlogPostsForFeed.mockResolvedValue(postsWithNoTags)

      const response = await GET()
      const body = await response.text()

      expect(response.status).toBe(200)
      expect(body).not.toContain('<category>')
    })

    it('handles multiple posts', async () => {
      const multiplePosts = [
        mockPosts[0],
        {
          ...mockPosts[0],
          slug: 'second-post',
          title: 'Second Post',
        },
        {
          ...mockPosts[0],
          slug: 'third-post',
          title: 'Third Post',
        },
      ]
      mockGetBlogPostsForFeed.mockResolvedValue(multiplePosts)

      const response = await GET()
      const body = await response.text()

      expect((body.match(/<item>/g) || []).length).toBe(3)
    })
  })
})
