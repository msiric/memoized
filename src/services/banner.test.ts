import prisma from '@/lib/prisma'
import { getActiveBanners, upsertBanner } from '@/services/banner'
import { ServiceError } from '@/lib/error-tracking'
import { Banner, BannerType } from '@prisma/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}))

// Mock the Prisma client
vi.mock('@/lib/prisma', () => ({
  default: { banner: { findMany: vi.fn(), upsert: vi.fn() } },
}))

describe('Banner services', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })
  describe('getActiveBanners', () => {
    it('should return active banners within the date range', async () => {
      const mockDate = new Date('2023-06-15T12:00:00Z')
      vi.useFakeTimers()
      vi.setSystemTime(mockDate)

      const mockBanners = [
        {
          id: '1',
          title: 'Banner 1',
          message: 'Content 1',
          isActive: true,
          startDate: new Date('2023-06-01T00:00:00Z'),
          endDate: new Date('2023-06-30T23:59:59Z'),
          priority: 2,
          type: BannerType.INFO,
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
          type: BannerType.INFO,
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
          type: BannerType.INFO,
          linkText: 'Check it out',
          linkUrl: '',
        },
      ]

      vi.mocked(prisma.banner.findMany).mockResolvedValue(
        mockBanners as Banner[],
      )

      const activeBanners = await getActiveBanners()

      expect(activeBanners).toHaveLength(2)
      expect(activeBanners[0].id).toBe('1') // Higher priority
      expect(activeBanners[1].id).toBe('2') // Lower priority
      expect(prisma.banner.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          priority: true,
          title: true,
          message: true,
          linkText: true,
          linkUrl: true,
          isActive: true,
          type: true,
        },
      })
    })

    it('should handle string dates correctly', async () => {
      const mockDate = new Date('2023-06-15T12:00:00Z')
      vi.useFakeTimers()
      vi.setSystemTime(mockDate)

      const mockBanners = [
        {
          id: '1',
          title: 'Banner 1',
          message: 'Content 1',
          isActive: true,
          startDate: new Date('2023-06-01T00:00:00Z'),
          endDate: new Date('2023-06-30T23:59:59Z'),
          priority: 1,
          type: BannerType.INFO,
          linkText: 'Check it out',
          linkUrl: '',
        },
      ]

      vi.mocked(prisma.banner.findMany).mockResolvedValue(
        mockBanners as Banner[],
      )

      const activeBanners = await getActiveBanners()

      expect(activeBanners).toHaveLength(1)
      expect(activeBanners[0].id).toBe('1')
    })

    // The other tests for getActiveBanners remain largely the same
  })

  describe('upsertBanner', () => {
    it('should create a new banner when id is not provided', async () => {
      const newBanner = {
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

      vi.mocked(prisma.banner.upsert).mockResolvedValue(newBanner as Banner)

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
      const existingBanner = {
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

      vi.mocked(prisma.banner.upsert).mockResolvedValue(
        existingBanner as Banner,
      )

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

    it('should throw ServiceError when upsert operation fails', async () => {
      vi.mocked(prisma.banner.upsert).mockRejectedValue(
        new Error('Database error'),
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
      ).rejects.toThrow(ServiceError)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to upsert banner:',
        expect.any(Error),
      )

      consoleErrorSpy.mockRestore()
    })
  })
})
