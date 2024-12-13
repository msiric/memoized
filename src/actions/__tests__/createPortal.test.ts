import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPortal } from '../createPortal'
import { getServerSession } from 'next-auth'
import { getUserById } from '@/services/user'
import { createOrRetrieveCustomer, createBillingPortalSession } from '@/services/stripe'
import { ServiceError } from '@/utils/error'

vi.mock('next-auth')
vi.mock('@/services/user')
vi.mock('@/services/stripe')

describe('createPortal', () => {
  const mockUser = {
    id: 'user_123',
    email: 'test@example.com'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a billing portal session successfully', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123'
    })
    vi.mocked(getUserById).mockResolvedValue(mockUser)
    vi.mocked(createOrRetrieveCustomer).mockResolvedValue('cus_123')
    vi.mocked(createBillingPortalSession).mockResolvedValue({
      url: 'https://billing.stripe.com/portal'
    })

    const result = await createPortal()

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
      userId: 'user_123'
    })
    vi.mocked(getUserById).mockResolvedValue(null)

    const result = await createPortal()

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to retrieve user details')
  })

  it('should return error if customer creation fails', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123'
    })
    vi.mocked(getUserById).mockResolvedValue(mockUser)
    vi.mocked(createOrRetrieveCustomer).mockResolvedValue(null)

    const result = await createPortal()

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to retrieve customer details')
  })

  it('should return error if portal URL creation fails', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123'
    })
    vi.mocked(getUserById).mockResolvedValue(mockUser)
    vi.mocked(createOrRetrieveCustomer).mockResolvedValue('cus_123')
    vi.mocked(createBillingPortalSession).mockResolvedValue({ url: null })

    const result = await createPortal()

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to create billing portal')
  })

  it('should handle ServiceError', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123'
    })
    vi.mocked(getUserById).mockRejectedValue(
      new ServiceError('Service error', true)
    )

    const result = await createPortal()

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to create billing portal')
  })
})
