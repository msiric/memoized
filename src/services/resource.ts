import prisma from '@/lib/prisma'
import { AccessOptions } from '@prisma/client'

export const getResourceBySlug = async (resourceSlug: string) => {
  const resource = await prisma.resource.findUnique({
    where: { slug: resourceSlug },
    select: { id: true, title: true, access: true },
  })

  if (!resource) {
    return null
  }

  return resource
}

export const upsertResource = async (
  resourceSlug: string,
  resourceTitle: string,
  resourceDescription: string,
  resourceContent: string,
  resourceOrder: number,
  resourceHref: string,
  lessonAccess: AccessOptions,
  lessonId: string,
) => {
  return prisma.resource.upsert({
    where: { slug: resourceSlug },
    update: {
      title: resourceTitle,
      description: resourceDescription,
      order: resourceOrder,
      body: resourceContent,
      href: resourceHref,
      access: lessonAccess,
      lessonId: lessonId,
    },
    create: {
      title: resourceTitle,
      description: resourceDescription,
      order: resourceOrder,
      slug: resourceSlug,
      body: resourceContent,
      href: resourceHref,
      access: lessonAccess,
      lessonId: lessonId,
    },
  })
}

export const getResources = async () => {
  const allResources = await prisma.resource.findMany({
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

  return { allResources }
}
