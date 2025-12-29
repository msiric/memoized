import prisma from '@/lib/prisma'
import { isPrismaUniqueConstraintError } from '@/utils/helpers'

export const isWebhookEventProcessed = async (
  eventId: string,
): Promise<boolean> => {
  const existing = await prisma.webhookEvent.findUnique({
    where: { stripeEventId: eventId },
  })
  return existing !== null
}

export const markWebhookEventProcessed = async (
  eventId: string,
  eventType: string,
): Promise<boolean> => {
  try {
    await prisma.webhookEvent.create({
      data: { stripeEventId: eventId, eventType },
    })
    return true
  } catch (error: unknown) {
    // Another concurrent request already processed this event
    if (isPrismaUniqueConstraintError(error)) {
      return false
    }
    throw error
  }
}
