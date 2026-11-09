import { beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import {
  DuplicateActiveSubscriptionError,
  createLifetimeAccess,
  updateSubscriptionDetails,
} from '@/services/subscription'
import { settleCheckoutReturn } from './checkout-return'

vi.mock('@/lib/prisma', () => ({
  default: { customer: { findUnique: vi.fn() }, subscription: { findUnique: vi.fn() } },
}))
vi.mock('@/lib/stripe', () => ({ stripe: { checkout: { sessions: { retrieve: vi.fn() } } } }))
vi.mock('@/services/subscription', () => {
  class DuplicateActiveSubscriptionError extends Error {}
  return {
    DuplicateActiveSubscriptionError,
    createLifetimeAccess: vi.fn(),
    updateSubscriptionDetails: vi.fn(),
  }
})
vi.mock('@/lib/sentry', () => ({ reportErrorSafely: vi.fn() }))

const now = () => Math.floor(Date.now() / 1000)
const session = (overrides: Record<string, unknown> = {}) => ({
  id: 'cs_test_abc', status: 'complete', mode: 'subscription', customer: 'cus_mine',
  subscription: 'sub_1', payment_status: 'paid', created: now() - 30,
  ...overrides,
})
const ACTIVE = { status: 'ACTIVE' }

describe('settleCheckoutReturn', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({ id: 'cust_row', stripeCustomerId: 'cus_mine' } as never)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null)
  })

  it('records a fresh completed subscription immediately, never refunding from this path', async () => {
    vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue(session() as never)
    vi.mocked(updateSubscriptionDetails).mockResolvedValue(ACTIVE as never)
    await expect(settleCheckoutReturn('cs_test_abc', 'user_1')).resolves.toEqual({ state: 'upgraded', sessionId: 'cs_test_abc' })
    expect(updateSubscriptionDetails).toHaveBeenCalledWith({
      stripeCustomer: 'cus_mine', subscriptionId: 'sub_1', refundDuplicates: false,
    })
  })

  it('records a fresh paid lifetime purchase immediately', async () => {
    vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue(session({ mode: 'payment', subscription: null }) as never)
    vi.mocked(createLifetimeAccess).mockResolvedValue(ACTIVE as never)
    await expect(settleCheckoutReturn('cs_test_abc', 'user_1')).resolves.toEqual({ state: 'upgraded', sessionId: 'cs_test_abc' })
    expect(createLifetimeAccess).toHaveBeenCalledWith({
      stripeCustomer: 'cus_mine', sessionId: 'cs_test_abc', refundDuplicates: false,
    })
  })

  it('answers from the database on reloads without calling Stripe write paths again', async () => {
    vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue(session() as never)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ status: 'ACTIVE', customerId: 'cust_row' } as never)
    await expect(settleCheckoutReturn('cs_test_abc', 'user_1')).resolves.toEqual({ state: 'upgraded', sessionId: 'cs_test_abc' })
    expect(updateSubscriptionDetails).not.toHaveBeenCalled()
  })

  it('never writes from an old (replayed or bookmarked) success link', async () => {
    vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue(
      session({ mode: 'payment', subscription: null, created: now() - 2 * 3600 }) as never,
    )
    await expect(settleCheckoutReturn('cs_test_abc', 'user_1')).resolves.toEqual({ state: 'unconfirmed', sessionId: 'cs_test_abc' })
    expect(createLifetimeAccess).not.toHaveBeenCalled()
  })

  it('does not claim an upgrade when the recorded row is not active', async () => {
    vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue(session() as never)
    vi.mocked(updateSubscriptionDetails).mockResolvedValue({ status: 'EXPIRED' } as never)
    await expect(settleCheckoutReturn('cs_test_abc', 'user_1')).resolves.toEqual({ state: 'unconfirmed', sessionId: 'cs_test_abc' })
  })

  it('reports a pending bank payment honestly', async () => {
    vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue(session({ mode: 'payment', payment_status: 'unpaid' }) as never)
    await expect(settleCheckoutReturn('cs_test_abc', 'user_1')).resolves.toEqual({ state: 'pending_payment', sessionId: 'cs_test_abc' })
    expect(createLifetimeAccess).not.toHaveBeenCalled()
  })

  it('leaves a duplicate purchase to the webhook and claims nothing', async () => {
    vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue(session() as never)
    vi.mocked(updateSubscriptionDetails).mockRejectedValue(
      new (DuplicateActiveSubscriptionError as unknown as new (m: string) => Error)('dup'),
    )
    await expect(settleCheckoutReturn('cs_test_abc', 'user_1')).resolves.toEqual({ state: 'unconfirmed', sessionId: 'cs_test_abc' })
  })

  it('reports processing when recording hits a transient error; the webhook still applies it', async () => {
    vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue(session() as never)
    vi.mocked(updateSubscriptionDetails).mockRejectedValue(new Error('db down'))
    await expect(settleCheckoutReturn('cs_test_abc', 'user_1')).resolves.toEqual({ state: 'processing', sessionId: 'cs_test_abc' })
  })

  it('reports a checkout that was not completed as failed', async () => {
    vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue(session({ status: 'open' }) as never)
    await expect(settleCheckoutReturn('cs_test_abc', 'user_1')).resolves.toEqual({ state: 'failed', sessionId: 'cs_test_abc' })
    expect(updateSubscriptionDetails).not.toHaveBeenCalled()
  })

  it('ignores another customer’s checkout session entirely', async () => {
    vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue(session({ customer: 'cus_someone_else' }) as never)
    await expect(settleCheckoutReturn('cs_test_abc', 'user_1')).resolves.toEqual({ state: 'unconfirmed' })
    expect(prisma.subscription.findUnique).not.toHaveBeenCalled()
    expect(updateSubscriptionDetails).not.toHaveBeenCalled()
  })

  it('treats an unknown session id as unconfirmed, not as a payment', async () => {
    vi.mocked(stripe.checkout.sessions.retrieve).mockRejectedValue(new Error('No such checkout.session'))
    await expect(settleCheckoutReturn('cs_test_abc', 'user_1')).resolves.toEqual({ state: 'unconfirmed' })
  })

  it.each([
    ['no session id', undefined, 'user_1'],
    ['a malformed session id', 'cs_../../x', 'user_1'],
    ['no signed-in user', 'cs_test_abc', undefined],
  ])('makes no claim for %s', async (_label, sessionId, userId) => {
    await expect(settleCheckoutReturn(sessionId, userId)).resolves.toEqual({ state: 'unconfirmed' })
    expect(stripe.checkout.sessions.retrieve).not.toHaveBeenCalled()
  })
})
