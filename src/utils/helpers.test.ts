import * as stripeModule from '@/lib/stripe'
import {
  ActiveCoupon,
  Curriculum,
  EnrichedLesson,
  EnrichedUser,
  EnrichedProblem,
  UserWithSubscriptionsAndProgress,
} from '@/types'
import {
  buildCurriculum,
  calculateDiscountedPrice,
  calculateProgress,
  capitalizeFirstLetter,
  checkSubscriptionStatus,
  fetchPricesFromStripe,
  filterAndSortProblems,
  formatPrice,
  formatter,
  getInitials,
  getPlanFromStripePlan,
  getStatusFromStripeStatus,
  getURL,
  isPrismaUniqueConstraintError,
  isOwner,
  isOwnerByEmail,
  remToPx,
  sortCurriculum,
  toDateTime,
  userHasAccess,
} from '@/utils/helpers'
import {
  AccessOptions,
  Lesson,
  Problem,
  ProblemDifficulty,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/stripe', () => ({
  stripe: {
    prices: {
      list: vi.fn(),
    },
  },
}))

describe('Helper functions', () => {
  describe('remToPx', () => {
    const originalWindow = global.window

    beforeEach(() => {
      global.window = {
        // @ts-ignore
        getComputedStyle: () => ({
          fontSize: '16px',
        }),
      }
    })

    afterEach(() => {
      global.window = originalWindow
    })

    it('should convert rem to pixels', () => {
      expect(remToPx(1)).toBe(16)
      expect(remToPx(2)).toBe(32)
    })

    it('should handle fractional rem values', () => {
      expect(remToPx(0.5)).toBe(8)
      expect(remToPx(1.5)).toBe(24)
    })
  })

  describe('toDateTime', () => {
    it('should convert seconds to Date object', () => {
      const date = toDateTime(1609459200) // 2021-01-01 00:00:00 UTC
      expect(date).toBeInstanceOf(Date)
      expect(date.getUTCFullYear()).toBe(2021)
      expect(date.getUTCMonth()).toBe(0)
      expect(date.getUTCDate()).toBe(1)
    })
  })

  describe('userHasAccess', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
      delete process.env.OWNER_EMAIL
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('should return true for free access', () => {
      expect(userHasAccess(null, AccessOptions.FREE)).toBe(true)
    })

    it('should return true for premium user with active subscription', () => {
      const user = { currentSubscriptionStatus: SubscriptionStatus.ACTIVE }
      expect(
        userHasAccess(
          user as UserWithSubscriptionsAndProgress,
          AccessOptions.PREMIUM,
        ),
      ).toBe(true)
    })

    it('should return false for premium access with expired subscription', () => {
      const user = { currentSubscriptionStatus: SubscriptionStatus.EXPIRED }
      expect(
        userHasAccess(
          user as UserWithSubscriptionsAndProgress,
          AccessOptions.PREMIUM,
        ),
      ).toBe(false)
    })

    it('should return false for premium access with cancelled subscription', () => {
      const user = { currentSubscriptionStatus: SubscriptionStatus.CANCELED }
      expect(
        userHasAccess(
          user as UserWithSubscriptionsAndProgress,
          AccessOptions.PREMIUM,
        ),
      ).toBe(false)
    })

    it('should return false for premium access without active subscription', () => {
      const user = { currentSubscriptionStatus: null }
      expect(
        userHasAccess(
          user as UserWithSubscriptionsAndProgress,
          AccessOptions.PREMIUM,
        ),
      ).toBe(false)
    })

    it('should return true when user is undefined', () => {
      expect(userHasAccess(undefined, AccessOptions.PREMIUM)).toBe(true)
    })

    it('should return true when access is undefined', () => {
      const user = { currentSubscriptionStatus: SubscriptionStatus.EXPIRED }
      expect(
        userHasAccess(user as UserWithSubscriptionsAndProgress, undefined),
      ).toBe(true)
    })

    it('should return true for owner even without active subscription', () => {
      const user = {
        email: 'owner@example.com',
        currentSubscriptionStatus: null,
        isOwner: true,
      }
      expect(
        userHasAccess(
          user as UserWithSubscriptionsAndProgress,
          AccessOptions.PREMIUM,
        ),
      ).toBe(true)
    })
  })

  describe('isOwner', () => {
    it('should return false when user is null', () => {
      expect(isOwner(null)).toBe(false)
    })

    it('should return false when user is undefined', () => {
      expect(isOwner(undefined)).toBe(false)
    })

    it('should return false when user.isOwner is false', () => {
      const user = { email: 'test@example.com', isOwner: false }
      expect(isOwner(user as UserWithSubscriptionsAndProgress)).toBe(false)
    })

    it('should return false when user.isOwner is undefined', () => {
      const user = { email: 'test@example.com' }
      expect(isOwner(user as UserWithSubscriptionsAndProgress)).toBe(false)
    })

    it('should return true when user.isOwner is true', () => {
      const user = { email: 'test@example.com', isOwner: true }
      expect(isOwner(user as UserWithSubscriptionsAndProgress)).toBe(true)
    })
  })

  describe('isOwnerByEmail', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
      delete process.env.OWNER_EMAIL
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('should return false when OWNER_EMAIL is not set', () => {
      expect(isOwnerByEmail('test@example.com')).toBe(false)
    })

    it('should return false when email is null', () => {
      process.env.OWNER_EMAIL = 'owner@example.com'
      expect(isOwnerByEmail(null)).toBe(false)
    })

    it('should return false when email is undefined', () => {
      process.env.OWNER_EMAIL = 'owner@example.com'
      expect(isOwnerByEmail(undefined)).toBe(false)
    })

    it('should return false when email does not match', () => {
      process.env.OWNER_EMAIL = 'owner@example.com'
      expect(isOwnerByEmail('other@example.com')).toBe(false)
    })

    it('should return true when email matches OWNER_EMAIL', () => {
      process.env.OWNER_EMAIL = 'owner@example.com'
      expect(isOwnerByEmail('owner@example.com')).toBe(true)
    })

    it('should be case-sensitive', () => {
      process.env.OWNER_EMAIL = 'owner@example.com'
      expect(isOwnerByEmail('Owner@example.com')).toBe(false)
    })
  })

  describe('capitalizeFirstLetter', () => {
    it('should capitalize the first letter of a string', () => {
      expect(capitalizeFirstLetter('hello')).toBe('Hello')
    })

    it('should return an empty string for empty input', () => {
      expect(capitalizeFirstLetter('')).toBe('')
    })

    it('should handle already capitalized strings', () => {
      expect(capitalizeFirstLetter('Hello')).toBe('Hello')
    })

    it('should lowercase the rest of the string', () => {
      expect(capitalizeFirstLetter('hELLO')).toBe('Hello')
    })

    it('should handle single character input', () => {
      expect(capitalizeFirstLetter('a')).toBe('A')
    })
  })

  describe('getInitials', () => {
    it('should return initials for a simple name', () => {
      expect(getInitials('John Doe')).toBe('JD')
    })

    it('should handle hyphenated names', () => {
      expect(getInitials('Mary-Jane Watson')).toBe('MJW')
    })

    it('should return an empty string for empty input', () => {
      expect(getInitials('')).toBe('')
    })

    it('should handle multiple spaces', () => {
      expect(getInitials('John  Doe')).toBe('JD')
    })

    it('should handle leading and trailing spaces', () => {
      expect(getInitials('  John Doe  ')).toBe('JD')
    })

    it('should handle single name', () => {
      expect(getInitials('Madonna')).toBe('M')
    })

    it('should handle multiple hyphenated names', () => {
      expect(getInitials('Jean-Claude Van Damme')).toBe('JCVD')
    })
  })

  describe('filterAndSortProblems', () => {
    const mockProblems = [
      {
        title: 'Easy Problem',
        difficulty: ProblemDifficulty.EASY,
        lesson: { slug: 'lesson-1', title: 'Lesson 1' },
        problemProgress: [],
      },
      {
        title: 'Hard Problem',
        difficulty: ProblemDifficulty.HARD,
        lesson: { slug: 'lesson-2', title: 'Lesson 2' },
        problemProgress: [{ completed: true }],
      },
      {
        title: 'Medium Problem',
        difficulty: ProblemDifficulty.MEDIUM,
        lesson: { slug: 'lesson-1', title: 'Lesson 1' },
        problemProgress: [],
      },
    ]

    it('should filter by difficulty', () => {
      const result = filterAndSortProblems(mockProblems as EnrichedProblem[], {
        difficulty: ProblemDifficulty.EASY,
      })
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Easy Problem')
    })

    it('should filter by status', () => {
      const result = filterAndSortProblems(mockProblems as EnrichedProblem[], {
        status: 'COMPLETED',
      })
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Hard Problem')
    })

    it('should filter by lesson', () => {
      const result = filterAndSortProblems(mockProblems as EnrichedProblem[], {
        lesson: 'lesson-1',
      })
      expect(result).toHaveLength(2)
    })

    it('should sort by title ascending', () => {
      const result = filterAndSortProblems(mockProblems as EnrichedProblem[], {
        sortColumn: 'title',
        sortOrder: 'asc',
      })
      expect(result[0].title).toBe('Easy Problem')
      expect(result[2].title).toBe('Medium Problem')
    })

    it('should sort by title descending', () => {
      const result = filterAndSortProblems(mockProblems as EnrichedProblem[], {
        sortColumn: 'title',
        sortOrder: 'desc',
      })
      expect(result[0].title).toBe('Medium Problem')
      expect(result[2].title).toBe('Easy Problem')
    })

    it('should sort by difficulty ascending', () => {
      const result = filterAndSortProblems(mockProblems as EnrichedProblem[], {
        sortColumn: 'difficulty',
        sortOrder: 'asc',
      })
      expect(result[0].difficulty).toBe(ProblemDifficulty.EASY)
      expect(result[2].difficulty).toBe(ProblemDifficulty.HARD)
    })

    it('should sort by difficulty descending', () => {
      const result = filterAndSortProblems(mockProblems as EnrichedProblem[], {
        sortColumn: 'difficulty',
        sortOrder: 'desc',
      })
      expect(result[0].difficulty).toBe(ProblemDifficulty.HARD)
      expect(result[2].difficulty).toBe(ProblemDifficulty.EASY)
    })

    it('should sort by lesson ascending', () => {
      const result = filterAndSortProblems(mockProblems as EnrichedProblem[], {
        sortColumn: 'lesson',
        sortOrder: 'asc',
      })
      expect(result[0].lesson.title).toBe('Lesson 1')
      expect(result[2].lesson.title).toBe('Lesson 2')
    })

    it('should sort by lesson descending', () => {
      const result = filterAndSortProblems(mockProblems as EnrichedProblem[], {
        sortColumn: 'lesson',
        sortOrder: 'desc',
      })
      expect(result[0].lesson.title).toBe('Lesson 2')
      expect(result[2].lesson.title).toBe('Lesson 1')
    })

    it('should filter by search term', () => {
      const result = filterAndSortProblems(mockProblems as EnrichedProblem[], {
        search: 'medium',
      })
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Medium Problem')
    })

    it('should apply multiple filters', () => {
      const result = filterAndSortProblems(mockProblems as EnrichedProblem[], {
        difficulty: ProblemDifficulty.EASY,
        lesson: 'lesson-1',
      })
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Easy Problem')
    })
  })

  describe('getURL', () => {
    const originalEnv = process.env

    beforeEach(() => {
      vi.resetModules()
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('should use NEXT_PUBLIC_SITE_URL if set', () => {
      const env = {
        NODE_ENV: 'development',
        NEXT_PUBLIC_SITE_URL: 'https://example.com',
      }
      expect(getURL('', env as NodeJS.ProcessEnv)).toBe('https://example.com')
    })

    it('should use NEXT_PUBLIC_VERCEL_URL if NEXT_PUBLIC_SITE_URL is not set', () => {
      const env = {
        NODE_ENV: 'development',
        NEXT_PUBLIC_VERCEL_URL: 'example-app.vercel.app',
      }
      expect(getURL('', env as NodeJS.ProcessEnv)).toBe(
        'https://example-app.vercel.app',
      )
    })

    it('should default to localhost if no environment variables are set', () => {
      const env = {}
      expect(getURL('', env as NodeJS.ProcessEnv)).toBe('http://localhost:3000')
    })

    it('should append path correctly', () => {
      const env = {
        NODE_ENV: 'development',
        NEXT_PUBLIC_SITE_URL: 'https://example.com',
      }
      expect(getURL('api/auth', env as NodeJS.ProcessEnv)).toBe(
        'https://example.com/api/auth',
      )
    })

    it('should handle trailing slashes correctly', () => {
      const env = {
        NODE_ENV: 'development',
        NEXT_PUBLIC_SITE_URL: 'https://example.com/',
      }
      expect(getURL('/api/auth', env as NodeJS.ProcessEnv)).toBe(
        'https://example.com/api/auth',
      )
    })

    it('should use production URL when NODE_ENV is production', () => {
      const env = {
        NODE_ENV: 'production',
        NEXT_PUBLIC_SITE_URL: 'https://production.example.com',
      }
      expect(getURL('', env as NodeJS.ProcessEnv)).toBe(
        'https://production.example.com',
      )
    })

    it('should add https:// to NEXT_PUBLIC_VERCEL_URL if not present', () => {
      const env = {
        NODE_ENV: 'development',
        NEXT_PUBLIC_VERCEL_URL: 'example-app.vercel.app',
      }
      expect(getURL('', env as NodeJS.ProcessEnv)).toBe(
        'https://example-app.vercel.app',
      )
    })
  })

  describe('fetchPricesFromStripe', () => {
    it('should fetch prices from Stripe', async () => {
      const mockPrices = { data: [{ id: 'price_1', nickname: 'Monthly' }] }
      vi.spyOn(stripeModule.stripe.prices, 'list').mockResolvedValue(
        mockPrices as any,
      )

      const result = await fetchPricesFromStripe()
      expect(result).toEqual({ price_1: mockPrices.data[0] })
    })
  })

  describe('getPlanFromStripePlan', () => {
    beforeEach(() => {
      vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    it('should return MONTHLY for Monthly nickname', async () => {
      vi.spyOn(stripeModule.stripe.prices, 'list').mockResolvedValue({
        data: [{ id: 'price_1', nickname: 'Monthly' }],
      } as any)
      const result = await getPlanFromStripePlan('price_1')
      expect(result).toBe(SubscriptionPlan.MONTHLY)
    })

    it('should return YEARLY for Yearly nickname', async () => {
      vi.spyOn(stripeModule.stripe.prices, 'list').mockResolvedValue({
        data: [{ id: 'price_2', nickname: 'Yearly' }],
      } as any)
      const result = await getPlanFromStripePlan('price_2')
      expect(result).toBe(SubscriptionPlan.YEARLY)
    })

    it('should return LIFETIME for Lifetime nickname', async () => {
      vi.spyOn(stripeModule.stripe.prices, 'list').mockResolvedValue({
        data: [{ id: 'price_3', nickname: 'Lifetime' }],
      } as any)
      const result = await getPlanFromStripePlan('price_3')
      expect(result).toBe(SubscriptionPlan.LIFETIME)
    })

    it('should return undefined for unknown nickname', async () => {
      vi.spyOn(stripeModule.stripe.prices, 'list').mockResolvedValue({
        data: [{ id: 'price_4', nickname: 'Unknown' }],
      } as any)
      const result = await getPlanFromStripePlan('price_4')
      expect(result).toBeUndefined()
    })

    it('should return undefined for unknown price ID', async () => {
      vi.spyOn(stripeModule.stripe.prices, 'list').mockResolvedValue({
        data: [],
      } as any)
      const result = await getPlanFromStripePlan('unknown_price')
      expect(result).toBeUndefined()
    })
  })

  describe('getStatusFromStripeStatus', () => {
    it('should return ACTIVE for active status', () => {
      expect(getStatusFromStripeStatus('active')).toBe(
        SubscriptionStatus.ACTIVE,
      )
    })

    it('should return CANCELED for canceled status', () => {
      expect(getStatusFromStripeStatus('canceled')).toBe(
        SubscriptionStatus.CANCELED,
      )
    })

    it('should return EXPIRED for incomplete status', () => {
      expect(getStatusFromStripeStatus('incomplete')).toBe(
        SubscriptionStatus.EXPIRED,
      )
    })

    it('should return EXPIRED for incomplete_expired status', () => {
      expect(getStatusFromStripeStatus('incomplete_expired')).toBe(
        SubscriptionStatus.EXPIRED,
      )
    })

    it('should return EXPIRED for past_due status', () => {
      expect(getStatusFromStripeStatus('past_due')).toBe(
        SubscriptionStatus.EXPIRED,
      )
    })

    it('should return EXPIRED for unpaid status', () => {
      expect(getStatusFromStripeStatus('unpaid')).toBe(
        SubscriptionStatus.EXPIRED,
      )
    })

    it('should return EXPIRED for unknown status', () => {
      // @ts-ignore - Testing with an invalid status
      expect(getStatusFromStripeStatus('unknown')).toBe(
        SubscriptionStatus.EXPIRED,
      )
    })
  })

  describe('checkSubscriptionStatus', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return ACTIVE for active subscription', () => {
      const subscription = { status: SubscriptionStatus.ACTIVE }
      expect(checkSubscriptionStatus(subscription as any)).toBe('ACTIVE')
    })

    it('should return CANCELED for canceled subscription', () => {
      const subscription = { status: SubscriptionStatus.CANCELED }
      expect(checkSubscriptionStatus(subscription as any)).toBe('CANCELED')
    })

    it('should return EXPIRED for expired subscription', () => {
      vi.setSystemTime(new Date('2023-07-21T12:00:00Z'))
      const subscription = {
        status: SubscriptionStatus.ACTIVE,
        endDate: '2023-07-21T11:59:59Z',
      }
      expect(checkSubscriptionStatus(subscription as any)).toBe('EXPIRED')
    })

    it('should return UNKNOWN for unexpected status', () => {
      const subscription = { status: 'UNEXPECTED' as SubscriptionStatus }
      expect(checkSubscriptionStatus(subscription as any)).toBe('UNKNOWN')
    })

    it('should return ACTIVE for active subscription with future end date', () => {
      vi.setSystemTime(new Date('2023-07-21T12:00:00Z'))
      const subscription = {
        status: SubscriptionStatus.ACTIVE,
        endDate: '2023-07-21T12:00:01Z',
      }
      expect(checkSubscriptionStatus(subscription as any)).toBe('ACTIVE')
    })

    it('should return ACTIVE for active subscription without end date', () => {
      const subscription = {
        status: SubscriptionStatus.ACTIVE,
        endDate: null,
      }
      expect(checkSubscriptionStatus(subscription as any)).toBe('ACTIVE')
    })

    it('should correctly handle expiration across different timezones', () => {
      // Set the current time to 2023-07-21 12:00:00 UTC
      vi.setSystemTime(new Date('2023-07-21T12:00:00Z'))

      // Test with subscription end date 1 hour before current time
      const subscriptionJustExpired = {
        status: SubscriptionStatus.ACTIVE,
        endDate: '2023-07-21T11:00:00Z',
      }
      expect(checkSubscriptionStatus(subscriptionJustExpired as any)).toBe(
        'EXPIRED',
      )

      // Test with subscription end date 1 hour after current time
      const subscriptionNotYetExpired = {
        status: SubscriptionStatus.ACTIVE,
        endDate: '2023-07-21T13:00:00Z',
      }
      expect(checkSubscriptionStatus(subscriptionNotYetExpired as any)).toBe(
        'ACTIVE',
      )

      // Test with subscription end date exactly at current time
      const subscriptionExpiringNow = {
        status: SubscriptionStatus.ACTIVE,
        endDate: '2023-07-21T12:00:00Z',
      }
      expect(checkSubscriptionStatus(subscriptionExpiringNow as any)).toBe(
        'EXPIRED',
      )

      // Test with different timezone (e.g., PST)
      const subscriptionInDifferentTimezone = {
        status: SubscriptionStatus.ACTIVE,
        endDate: '2023-07-21T05:00:00-07:00', // 12:00 UTC
      }
      expect(
        checkSubscriptionStatus(subscriptionInDifferentTimezone as any),
      ).toBe('EXPIRED')
    })
  })
})

describe('Price formatting and discounting', () => {
  describe('formatter', () => {
    it('should format numbers as EUR currency', () => {
      expect(formatter.format(10)).toBe('€10')
      expect(formatter.format(10.5)).toBe('€10.50')
      expect(formatter.format(10.99)).toBe('€10.99')
    })

    it('should handle large numbers', () => {
      expect(formatter.format(1000000)).toBe('€1,000,000')
    })

    it('should strip trailing zeros for whole numbers', () => {
      expect(formatter.format(10.0)).toBe('€10')
    })
  })

  describe('calculateDiscountedPrice', () => {
    it('should apply percentage discount correctly', () => {
      const price = 100
      const coupon = { percentOff: 10 }
      expect(calculateDiscountedPrice(price, coupon as ActiveCoupon)).toBe(90)
    })

    it('should apply amount discount correctly', () => {
      const price = 100
      const coupon = { amountOff: 15 }
      expect(calculateDiscountedPrice(price, coupon as ActiveCoupon)).toBe(85)
    })

    it('should not allow negative prices after discount', () => {
      const price = 10
      const coupon = { amountOff: 15 }
      expect(calculateDiscountedPrice(price, coupon as ActiveCoupon)).toBe(0)
    })

    it('should return original price if no discount is applicable', () => {
      const price = 100
      const coupon = {}
      expect(calculateDiscountedPrice(price, coupon as ActiveCoupon)).toBe(100)
    })

    it('should handle fractional percentages', () => {
      const price = 100
      const coupon = { percentOff: 33.33 }
      expect(
        calculateDiscountedPrice(price, coupon as ActiveCoupon),
      ).toBeCloseTo(66.67, 2)
    })
  })

  describe('formatPrice', () => {
    it('should format prices correctly', () => {
      expect(formatPrice(10)).toBe('€10')
      expect(formatPrice(10.5)).toBe('€10.50')
      expect(formatPrice(10.99)).toBe('€10.99')
    })

    it('should handle large prices', () => {
      expect(formatPrice(1000000)).toBe('€1,000,000')
    })

    it('should strip trailing zeros for whole number prices', () => {
      expect(formatPrice(10.0)).toBe('€10')
    })

    it('should handle fractional cents', () => {
      expect(formatPrice(10.999)).toBe('€11')
      expect(formatPrice(10.001)).toBe('€10')
    })

    it('should handle negative prices', () => {
      expect(formatPrice(-10.5)).toBe('-€10.50')
    })
  })
})

describe('sortCurriculum', () => {
  it('should sort curriculum correctly', () => {
    const curriculum = [
      {
        id: '1',
        order: 2,
        sections: [
          {
            id: '1',
            order: 2,
            lessons: [
              { id: '1', order: 2 },
              { id: '2', order: 1 },
            ],
          },
          { id: '2', order: 1, lessons: [{ id: '3', order: 1 }] },
        ],
      },
      {
        id: '2',
        order: 1,
        sections: [{ id: '3', order: 1, lessons: [{ id: '4', order: 1 }] }],
      },
    ]

    const sorted = sortCurriculum(curriculum as Curriculum[])

    expect(sorted![0].id).toBe('2')
    expect(sorted![1].id).toBe('1')
    expect(sorted![1].sections[0].id).toBe('2')
    expect(sorted![1].sections[1].id).toBe('1')
    expect(sorted![1].sections[1].lessons[0].id).toBe('2')
    expect(sorted![1].sections[1].lessons[1].id).toBe('1')
  })

  it('should return undefined if input is undefined', () => {
    expect(sortCurriculum(undefined)).toBeUndefined()
  })
})

describe('buildCurriculum', () => {
  it('should build curriculum correctly from lessons', () => {
    const lessons = [
      {
        id: '1',
        slug: 'lesson-1',
        title: 'Lesson 1',
        order: 1,
        description: 'Description 1',
        access: AccessOptions.FREE,
        href: '/lesson-1',
        section: {
          id: '1',
          slug: 'section-1',
          title: 'Section 1',
          order: 1,
          description: 'Section Description 1',
          href: '/section-1',
          course: {
            id: '1',
            slug: 'course-1',
            title: 'Course 1',
            order: 1,
            description: 'Course Description 1',
          },
        },
      },
      {
        id: '2',
        slug: 'lesson-2',
        title: 'Lesson 2',
        order: 2,
        description: 'Description 2',
        access: AccessOptions.PREMIUM,
        href: '/lesson-2',
        section: {
          id: '1',
          slug: 'section-1',
          title: 'Section 1',
          order: 1,
          description: 'Section Description 1',
          href: '/section-1',
          course: {
            id: '1',
            slug: 'course-1',
            title: 'Course 1',
            order: 1,
            description: 'Course Description 1',
          },
        },
      },
    ] as EnrichedLesson[]

    const curriculum = buildCurriculum(lessons)

    expect(curriculum).toHaveLength(1)
    expect(curriculum[0].sections).toHaveLength(1)
    expect(curriculum[0].sections[0].lessons).toHaveLength(2)
    expect(curriculum[0].sections[0].lessons[0].id).toBe('1')
    expect(curriculum[0].sections[0].lessons[1].id).toBe('2')
  })
})

describe('calculateProgress', () => {
  it('should calculate progress correctly', () => {
    const user = {
      lessonProgress: [{ lessonId: '1' }, { lessonId: '2' }],
      problemProgress: [{ problemId: '1' }],
    } as EnrichedUser

    const allLessons = [
      { id: '1' },
      { id: '2' },
      { id: '3' },
      { id: '4' },
    ] as Lesson[]

    const allProblems = [{ id: '1' }, { id: '2' }, { id: '3' }] as Problem[]

    const progress = calculateProgress(user, allLessons, allProblems)

    expect(progress.currentLessonProgress).toBe(50)
    expect(progress.currentProblemProgress).toBeCloseTo(33.33, 2)
  })

  it('should handle zero lessons and problems', () => {
    const user = {
      lessonProgress: [],
      problemProgress: [],
    } as unknown as EnrichedUser

    const progress = calculateProgress(user, [], [])

    expect(progress.currentLessonProgress).toBe(0)
    expect(progress.currentProblemProgress).toBe(0)
  })
})

describe('isPrismaUniqueConstraintError', () => {
  it('should return true for P2002 error', () => {
    const error = { code: 'P2002', message: 'Unique constraint failed' }
    expect(isPrismaUniqueConstraintError(error)).toBe(true)
  })

  it('should return false for other Prisma error codes', () => {
    const error = { code: 'P2003', message: 'Foreign key constraint failed' }
    expect(isPrismaUniqueConstraintError(error)).toBe(false)
  })

  it('should return false for null', () => {
    expect(isPrismaUniqueConstraintError(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isPrismaUniqueConstraintError(undefined)).toBe(false)
  })

  it('should return false for non-object errors', () => {
    expect(isPrismaUniqueConstraintError('error')).toBe(false)
    expect(isPrismaUniqueConstraintError(123)).toBe(false)
  })

  it('should return false for objects without code property', () => {
    const error = { message: 'Some error' }
    expect(isPrismaUniqueConstraintError(error)).toBe(false)
  })
})
