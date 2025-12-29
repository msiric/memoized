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
    it('should create a webhook event record and return true', async () => {
      vi.spyOn(prisma.webhookEvent, 'create').mockResolvedValue({
        id: '1',
        stripeEventId: 'evt_123',
        eventType: 'checkout.session.completed',
        processedAt: new Date(),
      })

      const result = await markWebhookEventProcessed('evt_123', 'checkout.session.completed')

      expect(result).toBe(true)
      expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
        data: {
          stripeEventId: 'evt_123',
          eventType: 'checkout.session.completed',
        },
      })
    })

    it('should return false on unique constraint violation (P2002)', async () => {
      const uniqueError = { code: 'P2002', message: 'Unique constraint failed' }
      vi.spyOn(prisma.webhookEvent, 'create').mockRejectedValue(uniqueError)

      const result = await markWebhookEventProcessed('evt_123', 'checkout.session.completed')

      expect(result).toBe(false)
    })

    it('should rethrow non-P2002 errors', async () => {
      const genericError = new Error('Database connection failed')
      vi.spyOn(prisma.webhookEvent, 'create').mockRejectedValue(genericError)

      await expect(
        markWebhookEventProcessed('evt_123', 'checkout.session.completed')
      ).rejects.toThrow('Database connection failed')
    })
  })
})
