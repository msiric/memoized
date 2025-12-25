import { getServerSession } from 'next-auth/next'
import { checkPremiumAccess } from '@/services/user'
import { meiliSearch } from '@/lib/meili'
import {
  beforeEach,
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

vi.mock('@/services/user', () => ({
  checkPremiumAccess: vi.fn(),
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
      userId: 'user1',
      user: { email: 'user@example.com' },
    } as any)
    vi.mocked(checkPremiumAccess).mockResolvedValue(false)
    const mockSearch = vi.fn().mockResolvedValue({ hits: [] })
    vi.mocked(meiliSearch.index).mockReturnValue({ search: mockSearch } as any)

    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    expect(checkPremiumAccess).toHaveBeenCalledWith('user1')
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
      userId: 'user2',
      user: { email: 'premium@example.com' },
    } as any)
    vi.mocked(checkPremiumAccess).mockResolvedValue(true)
    const mockSearch = vi.fn().mockResolvedValue({ hits: [] })
    vi.mocked(meiliSearch.index).mockReturnValue({ search: mockSearch } as any)

    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    expect(checkPremiumAccess).toHaveBeenCalledWith('user2')
    expect(mockSearch).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({
        filter: undefined,
      }),
    )
  })

  it('should perform search for owner without subscription', async () => {
    mockRequest = createMockRequest('test')
    vi.mocked(getServerSession).mockResolvedValue({
      userId: 'owner1',
      user: { email: 'owner@example.com' },
    } as any)
    // Owner has premium access even without subscription
    vi.mocked(checkPremiumAccess).mockResolvedValue(true)
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
      userId: 'user1',
      user: { email: 'user@example.com' },
    } as any)
    vi.mocked(checkPremiumAccess).mockResolvedValue(false)
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
    vi.mocked(checkPremiumAccess).mockResolvedValue(false)
    const mockSearch = vi.fn().mockResolvedValue({ hits: [] })
    vi.mocked(meiliSearch.index).mockReturnValue({ search: mockSearch } as any)

    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    expect(checkPremiumAccess).toHaveBeenCalledWith(undefined)
    expect(mockSearch).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({
        filter: 'access = FREE',
      }),
    )
  })

  it('should handle user not found in database', async () => {
    mockRequest = createMockRequest('test')
    vi.mocked(getServerSession).mockResolvedValue({
      userId: 'notfound',
      user: { email: 'notfound@example.com' },
    } as any)
    vi.mocked(checkPremiumAccess).mockResolvedValue(false)
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
