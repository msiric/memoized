import prisma from '@/lib/prisma'

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
