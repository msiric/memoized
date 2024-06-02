import { UserWithSubscriptionsAndProgress } from '@/services/user'
import { AccessOptions, SubscriptionStatus } from '@prisma/client'

export const remToPx = (remValue: number) => {
  const rootFontSize =
    typeof window === 'undefined'
      ? 16
      : parseFloat(window.getComputedStyle(document.documentElement).fontSize)

  return remValue * rootFontSize
}

export const toDateTime = (secs: number) => {
  var t = new Date(+0) // Unix epoch start.
  t.setSeconds(secs)
  return t
}

export const userHasAccess = (
  user: UserWithSubscriptionsAndProgress | null | undefined,
  access: AccessOptions | undefined,
) =>
  user === undefined ||
  access === undefined ||
  access === AccessOptions.FREE ||
  (access === AccessOptions.PREMIUM &&
    user?.currentSubscription === SubscriptionStatus.ACTIVE)
