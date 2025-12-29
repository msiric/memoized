import prisma from '@/lib/prisma'

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
): Promise<void> => {
  await prisma.webhookEvent.create({
    data: { stripeEventId: eventId, eventType },
  })
}
