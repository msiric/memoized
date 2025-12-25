import prisma from '@/lib/prisma'
import { ServiceError } from '@/lib/error-tracking'
import { BannerType } from '@prisma/client'
import { isAfter, isBefore, parseISO } from 'date-fns'
import { revalidateTag } from 'next/cache'
import { getActiveCoupons } from './stripe'
import { UnifiedBanner } from '../types'

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

export const getUnifiedBanners = async (): Promise<UnifiedBanner[]> => {
  try {
    const [databaseBanners, activeCoupons] = await Promise.all([
      getActiveBanners(),
      getActiveCoupons()
    ])

    const discountBanners = activeCoupons
      .filter((coupon) => coupon.valid && coupon.percent_off)
      .map((coupon) => {
        const redeemBy = coupon.redeem_by ? new Date(coupon.redeem_by * 1000) : null
        const message = 'Save on Premium'

        return {
          id: `coupon-${coupon.id}`,
          title: `${coupon.name || 'Special Offer'} Sale`,
          message,
          type: 'DISCOUNT' as BannerType,
          linkText: 'Get Premium',
          linkUrl: '/premium',
          priority: 1000, // High priority for discount banners
          startDate: new Date(),
          endDate: redeemBy,
          isActive: true,
          countdownTo: redeemBy?.getTime(), // Add countdown timestamp
          discountPercent: coupon.percent_off ?? undefined,
        }
      })


    // Combine and sort by priority
    const allBanners = [...databaseBanners, ...discountBanners]
    return allBanners.sort((a, b) => b.priority - a.priority)
  } catch (error) {
    console.error('Failed to fetch unified banners:', error)
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
    const result = await prisma.banner.upsert({
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
    
    revalidateTag('banners')
    
    return result
  } catch (error) {
    console.error('Failed to upsert banner:', error)
    throw new ServiceError('Failed to upsert banner')
  }
}
