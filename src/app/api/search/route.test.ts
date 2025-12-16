import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import prisma from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { meiliSearch } from '@/lib/meili'
import {
  MockedFunction,
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { GET } from './route'

// Mock the external dependencies
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/meili', () => ({
  meiliSearch: {
    index: vi.fn().mockReturnValue({
      search: vi.fn(),
    }),
  },
}))

describe('Search API Route', () => {
  let mockRequest: Request

  beforeEach(() => {
    vi.resetAllMocks()
  })

  const createMockRequest = (query: string) => {
    return new Request(`http://localhost/api/search?q=${query}`)
  }

  it('should return 400 if search query is missing', async () => {
    mockRequest = createMockRequest('')
    const response = await GET(mockRequest)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Search query is required' })
  })

  it('should perform search for non-premium user', async () => {
    mockRequest = createMockRequest('test')
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'user@example.com' },
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      customer: { subscriptions: [] },
    } as any)
    const mockSearch = vi.fn().mockResolvedValue({ hits: [] })
    vi.mocked(meiliSearch.index).mockReturnValue({ search: mockSearch } as any)

    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    expect(mockSearch).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({
        filter: 'access = FREE',
      }),
    )
  })

  it('should perform search for premium user', async () => {
    mockRequest = createMockRequest('test')
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'premium@example.com' },
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      customer: { subscriptions: [{ status: 'ACTIVE' }] },
    } as any)
    const mockSearch = vi.fn().mockResolvedValue({ hits: [] })
    vi.mocked(meiliSearch.index).mockReturnValue({ search: mockSearch } as any)

    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    expect(mockSearch).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({
        filter: undefined,
      }),
    )
  })

  it('should handle search errors', async () => {
    mockRequest = createMockRequest('test')
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'user@example.com' },
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      customer: { subscriptions: [] },
    } as any)
    const mockSearch = vi.fn().mockRejectedValue(new Error('Search failed'))
    vi.mocked(meiliSearch.index).mockReturnValue({ search: mockSearch } as any)

    const response = await GET(mockRequest)

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: 'An error occurred while searching',
    })
  })

  it('should handle no session (anonymous user)', async () => {
    mockRequest = createMockRequest('test')
    vi.mocked(getServerSession).mockResolvedValue(null)
    const mockSearch = vi.fn().mockResolvedValue({ hits: [] })
    vi.mocked(meiliSearch.index).mockReturnValue({ search: mockSearch } as any)

    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    expect(mockSearch).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({
        filter: 'access = FREE',
      }),
    )
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('should handle session without email', async () => {
    mockRequest = createMockRequest('test')
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: null },
    } as any)
    const mockSearch = vi.fn().mockResolvedValue({ hits: [] })
    vi.mocked(meiliSearch.index).mockReturnValue({ search: mockSearch } as any)

    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    expect(mockSearch).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({
        filter: 'access = FREE',
      }),
    )
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('should handle user not found in database', async () => {
    mockRequest = createMockRequest('test')
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'notfound@example.com' },
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const mockSearch = vi.fn().mockResolvedValue({ hits: [] })
    vi.mocked(meiliSearch.index).mockReturnValue({ search: mockSearch } as any)

    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    expect(mockSearch).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({
        filter: 'access = FREE',
      }),
    )
  })
})
