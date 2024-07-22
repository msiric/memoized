import prisma from '@/lib/prisma'
import { getActiveBanners, upsertBanner } from '@/services/banner'
import { Banner, BannerType } from '@prisma/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Mock the Prisma client
vi.mock('@/lib/prisma', () => ({
  default: {
    banner: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

describe('getActiveBanners', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('should return active banners within the date range', async () => {
    const mockDate = new Date('2023-06-15T12:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)

    const mockBanners: Banner[] = [
      {
        id: '1',
        title: 'Banner 1',
        message: 'Content 1',
        isActive: true,
        startDate: new Date('2023-06-01T00:00:00Z'),
        endDate: new Date('2023-06-30T23:59:59Z'),
        priority: 2,
        type: 'INFO',
        linkText: 'Check it out',
        linkUrl: '',
      },
      {
        id: '2',
        title: 'Banner 2',
        message: 'Content 2',
        isActive: true,
        startDate: new Date('2023-06-10T00:00:00Z'),
        endDate: new Date('2023-06-20T23:59:59Z'),
        priority: 1,
        type: 'INFO',
        linkText: 'Check it out',
        linkUrl: '',
      },
      {
        id: '3',
        title: 'Banner 3',
        message: 'Content 3',
        isActive: true,
        startDate: new Date('2023-07-01T00:00:00Z'),
        endDate: new Date('2023-07-31T23:59:59Z'),
        priority: 3,
        type: 'INFO',
        linkText: 'Check it out',
        linkUrl: '',
      },
    ]

    vi.mocked(prisma.banner.findMany).mockResolvedValue(mockBanners)

    const activeBanners = await getActiveBanners()

    expect(activeBanners).toHaveLength(2)
    expect(activeBanners[0].id).toBe('1') // Higher priority
    expect(activeBanners[1].id).toBe('2') // Lower priority
    expect(prisma.banner.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
    })
  })

  it('should handle string dates correctly', async () => {
    const mockDate = new Date('2023-06-15T12:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)

    const mockBanners: Banner[] = [
      {
        id: '1',
        title: 'Banner 1',
        message: 'Content 1',
        isActive: true,
        startDate: '2023-06-01T00:00:00Z' as unknown as Date,
        endDate: '2023-06-30T23:59:59Z' as unknown as Date,
        priority: 1,
        type: 'INFO',
        linkText: 'Check it out',
        linkUrl: '',
      },
    ]

    vi.mocked(prisma.banner.findMany).mockResolvedValue(mockBanners)

    const activeBanners = await getActiveBanners()

    expect(activeBanners).toHaveLength(1)
    expect(activeBanners[0].id).toBe('1')
  })

  it('should return an empty array when no active banners are found', async () => {
    vi.mocked(prisma.banner.findMany).mockResolvedValue([])

    const activeBanners = await getActiveBanners()

    expect(activeBanners).toEqual([])
  })

  it('should handle errors and return an empty array', async () => {
    vi.mocked(prisma.banner.findMany).mockRejectedValue(
      new Error('Database error'),
    )

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const activeBanners = await getActiveBanners()

    expect(activeBanners).toEqual([])
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to fetch banners:',
      expect.any(Error),
    )

    consoleErrorSpy.mockRestore()
  })

  it('should not return banners when startDate or endDate are outside the current date', async () => {
    const mockDate = new Date('2023-06-15T12:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)

    const mockBanners: Banner[] = [
      {
        id: '1',
        title: 'Past Banner',
        message: 'Content 1',
        isActive: true,
        startDate: new Date('2023-05-01T00:00:00Z'),
        endDate: new Date('2023-06-01T23:59:59Z'),
        priority: 1,
        type: 'INFO',
        linkText: 'Check it out',
        linkUrl: '',
      },
      {
        id: '2',
        title: 'Future Banner',
        message: 'Content 2',
        isActive: true,
        startDate: new Date('2023-07-01T00:00:00Z'),
        endDate: new Date('2023-07-31T23:59:59Z'),
        priority: 2,
        type: 'INFO',
        linkText: 'Check it out',
        linkUrl: '',
      },
    ]

    vi.mocked(prisma.banner.findMany).mockResolvedValue(mockBanners)

    const activeBanners = await getActiveBanners()

    expect(activeBanners).toHaveLength(0)
    expect(prisma.banner.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
    })
  })
})

describe('upsertBanner', () => {
  it('should create a new banner when id is not provided', async () => {
    const newBanner: Banner = {
      id: 'new-id',
      title: 'New Banner',
      message: 'New Content',
      type: BannerType.INFO,
      linkText: 'Click here',
      linkUrl: '/new',
      isActive: true,
      startDate: new Date('2023-07-01T00:00:00Z'),
      endDate: new Date('2023-07-31T23:59:59Z'),
      priority: 1,
    }

    vi.mocked(prisma.banner.upsert).mockResolvedValue(newBanner)

    const result = await upsertBanner({
      title: 'New Banner',
      message: 'New Content',
      type: BannerType.INFO,
      linkText: 'Click here',
      linkUrl: '/new',
      isActive: true,
      startDate: new Date('2023-07-01T00:00:00Z'),
      endDate: new Date('2023-07-31T23:59:59Z'),
      priority: 1,
    })

    expect(result).toEqual(newBanner)
    expect(prisma.banner.upsert).toHaveBeenCalledWith({
      where: { id: '' },
      update: expect.any(Object),
      create: expect.any(Object),
    })
  })

  it('should update an existing banner when id is provided', async () => {
    const existingBanner: Banner = {
      id: 'existing-id',
      title: 'Existing Banner',
      message: 'Updated Content',
      type: BannerType.WARNING,
      linkText: 'New link',
      linkUrl: '/updated',
      isActive: false,
      startDate: new Date('2023-08-01T00:00:00Z'),
      endDate: new Date('2023-08-31T23:59:59Z'),
      priority: 2,
    }

    vi.mocked(prisma.banner.upsert).mockResolvedValue(existingBanner)

    const result = await upsertBanner({
      id: 'existing-id',
      title: 'Existing Banner',
      message: 'Updated Content',
      type: BannerType.WARNING,
      linkText: 'New link',
      linkUrl: '/updated',
      isActive: false,
      startDate: new Date('2023-08-01T00:00:00Z'),
      endDate: new Date('2023-08-31T23:59:59Z'),
      priority: 2,
    })

    expect(result).toEqual(existingBanner)
    expect(prisma.banner.upsert).toHaveBeenCalledWith({
      where: { id: 'existing-id' },
      update: expect.any(Object),
      create: expect.any(Object),
    })
  })

  it('should handle errors during upsert operation', async () => {
    vi.mocked(prisma.banner.upsert).mockRejectedValue(
      new Error('Failed to upsert banner'),
    )

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    await expect(
      upsertBanner({
        title: 'Error Banner',
        message: 'Error Content',
        type: BannerType.INFO,
        isActive: true,
        startDate: new Date(),
        endDate: new Date(),
        priority: 1,
      }),
    ).rejects.toThrow('Failed to upsert banner')

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to upsert banner:',
      expect.any(Error),
    )

    consoleErrorSpy.mockRestore()
  })
})
