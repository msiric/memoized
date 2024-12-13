import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPortal } from './createPortal'
import { getServerSession } from 'next-auth'
import { getUserById } from '@/services/user'
import {
  createOrRetrieveCustomer,
  createBillingPortalSession,
} from '@/services/stripe'
import { ServiceError } from '@/utils/error'
import Stripe from 'stripe'
import { CustomResponse } from '@/utils/response'
import { User } from '@prisma/client'

vi.mock('next-auth')
vi.mock('@/services/user')
vi.mock('@/services/stripe')

describe('createPortal', () => {
  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    name: 'User',
    image: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a billing portal session successfully', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123',
    })
    vi.mocked(getUserById).mockResolvedValue(mockUser)
    vi.mocked(createOrRetrieveCustomer).mockResolvedValue('cus_123')
    vi.mocked(createBillingPortalSession).mockResolvedValue({
      url: 'https://billing.stripe.com/portal',
    } as Stripe.Response<Stripe.BillingPortal.Session>)

    const result = (await createPortal()) as CustomResponse & { url: string }

    expect(result.success).toBe(true)
    expect(result.url).toBe('https://billing.stripe.com/portal')
  })

  it('should return error if user session is not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const result = await createPortal()

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to retrieve user session')
  })

  it('should return error if user details are not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123',
    })
    vi.mocked(getUserById).mockResolvedValue(null as unknown as User)

    const result = await createPortal()

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to retrieve user details')
  })

  it('should return error if customer creation fails', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123',
    })
    vi.mocked(getUserById).mockResolvedValue(mockUser)
    vi.mocked(createOrRetrieveCustomer).mockRejectedValue(
      new ServiceError('Failed to retrieve or create customer', true),
    )

    const result = await createPortal()

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to create billing portal')
  })

  it('should return error if portal URL creation fails', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123',
    })
    vi.mocked(getUserById).mockResolvedValue(mockUser)
    vi.mocked(createOrRetrieveCustomer).mockResolvedValue('cus_123')
    vi.mocked(createBillingPortalSession).mockResolvedValue(
      {} as Stripe.Response<Stripe.BillingPortal.Session>,
    )

    const result = await createPortal()

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to create billing portal')
  })

  it('should handle ServiceError', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123',
    })
    vi.mocked(getUserById).mockRejectedValue(
      new ServiceError('Service error', true),
    )

    const result = await createPortal()

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to create billing portal')
  })
})
