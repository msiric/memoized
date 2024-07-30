import prisma from '@/lib/prisma'

export const getResourceBySlug = async (resourceSlug: string) => {
  const resource = await prisma.resource.findUnique({
    where: { slug: resourceSlug },
    select: { id: true, title: true },
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
) => {
  return prisma.resource.upsert({
    where: { slug: resourceSlug },
    update: {
      title: resourceTitle,
      description: resourceDescription,
      order: resourceOrder,
      body: resourceContent,
      href: resourceHref,
    },
    create: {
      title: resourceTitle,
      description: resourceDescription,
      order: resourceOrder,
      slug: resourceSlug,
      body: resourceContent,
      href: resourceHref,
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
    },
    orderBy: { order: 'asc' },
  })

  return { allResources }
}
