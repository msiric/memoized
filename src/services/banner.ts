import prisma from '@/lib/prisma'
import { ServiceError } from '@/utils/error'
import { BannerType } from '@prisma/client'
import { isAfter, isBefore, parseISO } from 'date-fns'

export const getActiveBanners = async () => {
  try {
    const now = new Date()
    const banners = await prisma.banner.findMany({
      where: {
        isActive: true,
      },
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

    const activeBanners = banners.filter((banner) => {
      const startDate =
        typeof banner.startDate === 'string'
          ? parseISO(banner.startDate)
          : banner.startDate
      const endDate =
        typeof banner.endDate === 'string'
          ? parseISO(banner.endDate)
          : banner.endDate

      return isAfter(now, startDate) && isBefore(now, endDate)
    })

    return activeBanners.sort((a, b) => b.priority - a.priority)
  } catch (error) {
    console.error('Failed to fetch banners:', error)
    return []
  }
}

interface UpsertBannerArgs {
  id?: string
  title: string
  message: string
  type: BannerType
  linkText?: string | null
  linkUrl?: string | null
  isActive: boolean
  startDate: Date
  endDate: Date
  priority: number
}

export const upsertBanner = async ({
  id,
  title,
  message,
  type,
  linkText,
  linkUrl,
  isActive,
  startDate,
  endDate,
  priority,
}: UpsertBannerArgs) => {
  try {
    return await prisma.banner.upsert({
      where: { id: id ?? '' },
      update: {
        title,
        message,
        type,
        linkText,
        linkUrl,
        isActive,
        startDate,
        endDate,
        priority,
      },
      create: {
        title,
        message,
        type,
        linkText,
        linkUrl,
        isActive,
        startDate,
        endDate,
        priority,
      },
    })
  } catch (error) {
    console.error('Failed to upsert banner:', error)
    throw new ServiceError('Failed to upsert banner')
  }
}
