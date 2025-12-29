import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  CacheTags,
  buildTag,
  revalidateSubscription,
  revalidateCustomer,
  revalidateAccount,
  revalidateLessonProgress,
  revalidateProblemProgress,
  revalidateBanners,
} from './cache'

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}))

// Mock constants for revalidatePath usage
vi.mock('@/constants', () => ({
  COURSES_PREFIX: '/courses',
}))

import { revalidateTag, revalidatePath } from 'next/cache'

describe('Cache utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('CacheTags constants', () => {
    it('should have all required static tags', () => {
      expect(CacheTags.USER).toBe('user')
      expect(CacheTags.USER_SUBSCRIPTION).toBe('user-subscription')
      expect(CacheTags.ACCOUNT).toBe('account')
      expect(CacheTags.SUBSCRIPTION).toBe('subscription')
      expect(CacheTags.BANNERS).toBe('banners')
    })
  })

  describe('buildTag', () => {
    it('should build user tag correctly', () => {
      expect(buildTag.user('user-123')).toBe('user-user-123')
    })

    it('should build customer tag correctly', () => {
      expect(buildTag.customer('cus_123')).toBe('customer-cus_123')
    })

    it('should build subscription tag correctly', () => {
      expect(buildTag.subscription('sub_123')).toBe('subscription-sub_123')
    })

    it('should build account tag correctly', () => {
      expect(buildTag.account('acc_123')).toBe('account-acc_123')
    })

    it('should build lesson tag correctly', () => {
      expect(buildTag.lesson('lesson-123')).toBe('lesson-lesson-123')
    })

    it('should build problem tag correctly', () => {
      expect(buildTag.problem('problem-123')).toBe('problem-problem-123')
    })
  })

  describe('revalidateSubscription', () => {
    it('should revalidate all subscription-related tags', () => {
      revalidateSubscription({
        customerId: 'cust-123',
        userId: 'user-456',
        subscriptionId: 'sub-789',
      })

      expect(revalidateTag).toHaveBeenCalledWith('subscription')
      expect(revalidateTag).toHaveBeenCalledWith('subscription-sub-789')
      expect(revalidateTag).toHaveBeenCalledWith('customer-cust-123')
      expect(revalidateTag).toHaveBeenCalledWith('user-user-456')
      expect(revalidateTag).toHaveBeenCalledWith('user-subscription')
      expect(revalidateTag).toHaveBeenCalledWith('user')
      expect(revalidateTag).toHaveBeenCalledWith('account')
      expect(revalidateTag).toHaveBeenCalledTimes(7)
    })
  })

  describe('revalidateCustomer', () => {
    it('should revalidate customer-related tags', () => {
      revalidateCustomer({
        userId: 'user-123',
        stripeCustomerId: 'cus_456',
      })

      expect(revalidateTag).toHaveBeenCalledWith('user-user-123')
      expect(revalidateTag).toHaveBeenCalledWith('customer-cus_456')
      expect(revalidateTag).toHaveBeenCalledTimes(2)
    })
  })

  describe('revalidateAccount', () => {
    it('should revalidate account-related tags', () => {
      revalidateAccount({
        userId: 'user-123',
        providerAccountId: 'provider-456',
      })

      expect(revalidateTag).toHaveBeenCalledWith('account')
      expect(revalidateTag).toHaveBeenCalledWith('account-provider-456')
      expect(revalidateTag).toHaveBeenCalledWith('user')
      expect(revalidateTag).toHaveBeenCalledWith('user-user-123')
      expect(revalidateTag).toHaveBeenCalledTimes(4)
    })
  })

  describe('revalidateLessonProgress', () => {
    it('should revalidate lesson progress tags and path', () => {
      revalidateLessonProgress({
        userId: 'user-123',
        lessonId: 'lesson-456',
      })

      expect(revalidatePath).toHaveBeenCalledWith('/courses', 'layout')
      expect(revalidateTag).toHaveBeenCalledWith('user-user-123')
      expect(revalidateTag).toHaveBeenCalledWith('lesson-lesson-456')
      expect(revalidateTag).toHaveBeenCalledTimes(2)
      expect(revalidatePath).toHaveBeenCalledTimes(1)
    })
  })

  describe('revalidateProblemProgress', () => {
    it('should revalidate problem progress tags and path', () => {
      revalidateProblemProgress({
        userId: 'user-123',
        problemId: 'problem-456',
      })

      expect(revalidatePath).toHaveBeenCalledWith('/courses', 'layout')
      expect(revalidateTag).toHaveBeenCalledWith('user-user-123')
      expect(revalidateTag).toHaveBeenCalledWith('problem-problem-456')
      expect(revalidateTag).toHaveBeenCalledTimes(2)
      expect(revalidatePath).toHaveBeenCalledTimes(1)
    })
  })

  describe('revalidateBanners', () => {
    it('should revalidate banners tag', () => {
      revalidateBanners()

      expect(revalidateTag).toHaveBeenCalledWith('banners')
      expect(revalidateTag).toHaveBeenCalledTimes(1)
    })
  })
})
