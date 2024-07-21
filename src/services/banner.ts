import prisma from '@/lib/prisma'
import { isAfter, isBefore, parseISO } from 'date-fns'

export const getActiveBanners = async () => {
  try {
    const now = new Date()
    const banners = await prisma.banner.findMany({
      where: {
        isActive: true,
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
