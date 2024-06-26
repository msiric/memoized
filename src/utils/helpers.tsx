import { UserWithSubscriptionsAndProgress } from '@/services/user'
import { AccessOptions, SubscriptionStatus } from '@prisma/client'

export const isServer = typeof window === 'undefined'

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
    user?.currentSubscriptionStatus === SubscriptionStatus.ACTIVE)

export const capitalizeFirstLetter = (str: string) => {
  if (typeof str !== 'string' || str.length === 0) {
    return ''
  }
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export const getInitials = (name: string) => {
  if (typeof name !== 'string' || name.trim() === '') {
    return ''
  }

  name = name.trim().replace(/\s+/g, ' ')

  const words = name.split(' ')

  const initials = words.map((word) => {
    if (word.includes('-')) {
      return word
        .split('-')
        .map((part) => part.charAt(0).toUpperCase())
        .join('')
    } else {
      return word.charAt(0).toUpperCase()
    }
  })

  return initials.join('')
}
