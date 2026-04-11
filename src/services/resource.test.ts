import prisma from '@/lib/prisma'
import {
  getResourceBySlug,
  getResources,
} from '@/services/resource'
import { AccessOptions } from '@prisma/client'
import { Mock, afterEach, describe, expect, it, vi } from 'vitest'

// Note: upsertResource was moved into sync-resources.ts as part of the
// two-phase transactional sync refactor. Its tests now live in sync-resources.test.ts.

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}))

// Mocking the Prisma client
vi.mock('@/lib/prisma', () => {
  const actualPrisma = vi.importActual('@/lib/prisma')
  return {
    ...actualPrisma,
    default: {
      resource: { findUnique: vi.fn(), findMany: vi.fn() },
    },
  }
})

describe('Resource services', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getResourceBySlug', () => {
    it('should return resource by slug', async () => {
      const mockResource = {
        id: '1',
        title: 'Resource Title',
        description: 'Resource Description',
        serializedBody: { compiledSource: 'compiled' },
        access: AccessOptions.FREE,
      }
      ;(prisma.resource.findUnique as Mock).mockResolvedValue(mockResource)

      const resource = await getResourceBySlug('resource-slug')
      expect(resource).toEqual(mockResource)
      expect(prisma.resource.findUnique).toHaveBeenCalledWith({
        where: { slug: 'resource-slug' },
        select: { id: true, title: true, serializedBody: true, access: true },
      })
    })

    it('should return null if resource is not found', async () => {
      ;(prisma.resource.findUnique as Mock).mockResolvedValue(null)

      const resource = await getResourceBySlug('invalid-slug')
      expect(resource).toBeNull()

      expect(prisma.resource.findUnique).toHaveBeenCalledWith({
        where: { slug: 'invalid-slug' },
        select: { id: true, title: true, serializedBody: true, access: true },
      })
    })
  })

  describe('getResources', () => {
    it('should return all resources', async () => {
      const mockResources = [
        {
          id: '1',
          title: 'Resource 1',
          href: '/resource1',
          description: 'Description 1',
          order: 1,
          slug: 'resource-1',
          access: AccessOptions.FREE,
        },
        {
          id: '2',
          title: 'Resource 2',
          href: '/resource2',
          description: 'Description 2',
          order: 2,
          slug: 'resource-2',
          access: AccessOptions.FREE,
        },
      ]

      vi.spyOn(prisma.resource, 'findMany').mockResolvedValue(
        mockResources as any,
      )

      const result = await getResources()

      expect(result).toEqual({ allResources: mockResources })
      expect(prisma.resource.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          title: true,
          href: true,
          description: true,
          order: true,
          slug: true,
          access: true,
        },
        orderBy: { order: 'asc' },
      })
    })
  })
})
