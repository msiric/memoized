import prisma from '@/lib/prisma'
import { AccessOptions, Prisma } from '@prisma/client'

export const getResourceBySlug = async (resourceSlug: string) => {
  const resource = await prisma.resource.findUnique({
    where: { slug: resourceSlug },
    select: {
      id: true,
      title: true,
      serializedBody: true,
      access: true,
    },
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
  lessonId: string | null,
  serializedContent?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue,
) => {
  const result = await prisma.resource.upsert({
    where: { slug: resourceSlug },
    update: {
      title: resourceTitle,
      description: resourceDescription,
      order: resourceOrder,
      body: resourceContent,
      href: resourceHref,
      access: lessonAccess,
      lessonId: lessonId,
      ...(serializedContent !== undefined && {
        serializedBody: serializedContent,
      }),
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
      ...(serializedContent !== undefined && {
        serializedBody: serializedContent,
      }),
    },
  })

  return result
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

export const getResourcesSlugs = async () => {
  const resources = await prisma.resource.findMany({
    select: { slug: true },
  })

  if (!resources?.length) {
    return null
  }

  return resources
}
