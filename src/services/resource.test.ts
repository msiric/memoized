import prisma from '@/lib/prisma'
import {
  getResourceBySlug,
  getResources,
  upsertResource,
} from '@/services/resource'
import { AccessOptions } from '@prisma/client'
import { Mock, afterEach, describe, expect, it, vi } from 'vitest'

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
      resource: { findUnique: vi.fn(), upsert: vi.fn(), findMany: vi.fn() },
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

  describe('upsertResource', () => {
    it('should upsert a resource', async () => {
      const mockResource = {
        id: '1',
        slug: 'resource-slug',
        title: 'Resource Title',
        access: AccessOptions.FREE,
      }
      ;(prisma.resource.upsert as Mock).mockResolvedValue(mockResource)

      const resource = await upsertResource(
        'resource-slug',
        'Resource Title',
        'Resource Description',
        'Resource Content',
        1,
        'resource-href',
        AccessOptions.FREE,
        '1',
        { compiledSource: 'compiled' } as any,
      )
      expect(resource).toEqual(mockResource)
      expect(prisma.resource.upsert).toHaveBeenCalledWith({
        where: { slug: 'resource-slug' },
        update: {
          title: 'Resource Title',
          description: 'Resource Description',
          order: 1,
          body: 'Resource Content',
          href: 'resource-href',
          access: AccessOptions.FREE,
          lessonId: '1',
          serializedBody: { compiledSource: 'compiled' },
        },
        create: {
          title: 'Resource Title',
          description: 'Resource Description',
          order: 1,
          slug: 'resource-slug',
          body: 'Resource Content',
          href: 'resource-href',
          access: AccessOptions.FREE,
          lessonId: '1',
          serializedBody: { compiledSource: 'compiled' },
        },
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
