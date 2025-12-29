import { describe, it, expect, vi, beforeEach } from 'vitest'
import prisma from '@/lib/prisma'
import { isWebhookEventProcessed, markWebhookEventProcessed } from './webhook'

vi.mock('@/lib/prisma')

describe('Webhook services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isWebhookEventProcessed', () => {
    it('should return true if event exists', async () => {
      vi.spyOn(prisma.webhookEvent, 'findUnique').mockResolvedValue({
        id: '1',
        stripeEventId: 'evt_123',
        eventType: 'checkout.session.completed',
        processedAt: new Date(),
      })

      const result = await isWebhookEventProcessed('evt_123')

      expect(result).toBe(true)
      expect(prisma.webhookEvent.findUnique).toHaveBeenCalledWith({
        where: { stripeEventId: 'evt_123' },
      })
    })

    it('should return false if event does not exist', async () => {
      vi.spyOn(prisma.webhookEvent, 'findUnique').mockResolvedValue(null)

      const result = await isWebhookEventProcessed('evt_new')

      expect(result).toBe(false)
      expect(prisma.webhookEvent.findUnique).toHaveBeenCalledWith({
        where: { stripeEventId: 'evt_new' },
      })
    })
  })

  describe('markWebhookEventProcessed', () => {
    it('should create a webhook event record', async () => {
      vi.spyOn(prisma.webhookEvent, 'create').mockResolvedValue({
        id: '1',
        stripeEventId: 'evt_123',
        eventType: 'checkout.session.completed',
        processedAt: new Date(),
      })

      await markWebhookEventProcessed('evt_123', 'checkout.session.completed')

      expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
        data: {
          stripeEventId: 'evt_123',
          eventType: 'checkout.session.completed',
        },
      })
    })
  })
})
