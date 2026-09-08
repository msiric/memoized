export type LearningEvent =
  | 'practice_question_opened'
  | 'practice_answer_revealed'
  | 'problem_marked_complete'
  | 'lesson_marked_complete'
  | 'auth_started'
  | 'upgrade_clicked'
  | 'checkout_started'

type EventData = {
  content_id?: string
  content_type?: 'THEORY' | 'CODING' | 'lesson'
  provider?: 'google' | 'github' | 'email'
  source?: 'practice' | 'lesson' | 'premium_preview' | 'sign_in' | 'pricing'
}

export function productionAnalyticsAllowed(
  hostname: string,
  environment = process.env.NODE_ENV,
) {
  return (
    environment === 'production' &&
    ['memoized.io', 'www.memoized.io'].includes(hostname)
  )
}

/** Best-effort telemetry must never change the success/failure of the user's action. */
export function trackLearningEvent(event: LearningEvent, data: EventData = {}) {
  if (
    typeof window === 'undefined' ||
    !productionAnalyticsAllowed(window.location.hostname)
  )
    return
  const properties: Record<string, string> = {}
  // Allowlist fields: never forward user IDs, email, answer text or URL queries.
  for (const key of [
    'content_id',
    'content_type',
    'provider',
    'source',
  ] as const) {
    if (data[key]) properties[key] = data[key]
  }
  try {
    void Promise.resolve(window.umami?.track(event, properties)).catch(() =>
      console.warn('Analytics event delivery failed.'),
    )
  } catch {
    console.warn('Analytics event delivery failed.')
  }
}
