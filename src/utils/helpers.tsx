import { stripe } from '@/lib/stripe'
import {
  ProblemRow,
  ProblemStatus,
  UserWithSubscriptionsAndProgress,
} from '@/types'
import {
  AccessOptions,
  ProblemDifficulty,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client'
import Stripe from 'stripe'

const cachedPrices: Record<string, Stripe.Price> | null = null
const lastFetchTime = 0

const CACHE_DURATION = 1000 * 60 * 60 // 1 hour

const DIFFICULTY_ORDER = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
}

export interface ProblemFilter {
  difficulty?: ProblemDifficulty
  status?: ProblemStatus
  lesson?: string
  search?: string
  sortColumn?: string
  sortOrder?: 'asc' | 'desc'
}

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

export const filterAndSortProblems = (
  problems: ProblemRow[],
  filter: ProblemFilter,
) => {
  const { difficulty, status, lesson, search, sortColumn, sortOrder } = filter

  let filteredProblems = [...problems]

  if (search) {
    filteredProblems = filteredProblems.filter((problem) =>
      problem.title.toLowerCase().includes(search.toLowerCase()),
    )
  }

  if (difficulty) {
    filteredProblems = filteredProblems.filter(
      (problem) =>
        problem.difficulty.toLowerCase() === difficulty.toLowerCase(),
    )
  }

  if (status) {
    filteredProblems = filteredProblems.filter((problem) =>
      status.toLowerCase() === 'completed'
        ? problem.problemProgress.some((progress) => progress.completed)
        : problem.problemProgress.every((progress) => !progress.completed),
    )
  }

  if (lesson) {
    filteredProblems = filteredProblems.filter(
      (problem) => lesson === problem.lesson.slug,
    )
  }

  if (sortColumn) {
    filteredProblems.sort((a, b) => {
      if (sortColumn === 'title') {
        return sortOrder === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title)
      }
      if (sortColumn === 'difficulty') {
        return sortOrder === 'asc'
          ? DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]
          : DIFFICULTY_ORDER[b.difficulty] - DIFFICULTY_ORDER[a.difficulty]
      }
      if (sortColumn === 'lesson') {
        return sortOrder === 'asc'
          ? a.lesson.title.localeCompare(b.lesson.title)
          : b.lesson.title.localeCompare(a.lesson.title)
      }
      return 0
    })
  }

  return filteredProblems
}

export const getURL = (path: string = '') => {
  // Check if NEXT_PUBLIC_SITE_URL is set and non-empty. Set this to your site URL in production env.
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL &&
    process.env.NEXT_PUBLIC_SITE_URL.trim() !== ''
      ? process.env.NEXT_PUBLIC_SITE_URL
      : // If not set, check for NEXT_PUBLIC_VERCEL_URL, which is automatically set by Vercel.
        process?.env?.NEXT_PUBLIC_VERCEL_URL &&
          process.env.NEXT_PUBLIC_VERCEL_URL.trim() !== ''
        ? process.env.NEXT_PUBLIC_VERCEL_URL
        : // If neither is set, default to localhost for local development.
          'http://localhost:3000/'

  // Trim the URL and remove trailing slash if exists.
  url = url.replace(/\/+$/, '')
  // Make sure to include `https://` when not localhost.
  url = url.includes('http') ? url : `https://${url}`
  // Ensure path starts without a slash to avoid double slashes in the final URL.
  path = path.replace(/^\/+/, '')

  // Concatenate the URL and the path.
  return path ? `${url}/${path}` : url
}

export const fetchPricesFromStripe = async () => {
  const prices = await stripe.prices.list({ limit: 100 })
  return prices.data.reduce(
    (acc, price) => {
      acc[price.id] = price
      return acc
    },
    {} as Record<string, Stripe.Price>,
  )
}

export const getPlanFromStripePlan = async (
  priceId: string,
): Promise<SubscriptionPlan | void> => {
  const prices = await fetchPricesFromStripe()
  const price = prices[priceId]

  if (!price) return console.log(`Unknown price ID`)

  switch (price.nickname) {
    case 'Monthly':
      return SubscriptionPlan.MONTHLY
    case 'Yearly':
      return SubscriptionPlan.YEARLY
    case 'Lifetime':
      return SubscriptionPlan.LIFETIME
    default:
      return console.log(`Unknown price nickname`)
  }
}

export const getStatusFromStripeStatus = (
  status: Stripe.Subscription.Status,
): SubscriptionStatus => {
  switch (status) {
    case 'active':
      return SubscriptionStatus.ACTIVE
    case 'canceled':
      return SubscriptionStatus.CANCELED
    case 'incomplete':
    case 'incomplete_expired':
    case 'past_due':
    case 'unpaid':
      return SubscriptionStatus.EXPIRED
    default:
      return SubscriptionStatus.EXPIRED
  }
}

export const checkSubscriptionStatus = (
  subscription: Subscription,
): SubscriptionStatus | 'UNKNOWN' => {
  const now = new Date()
  if (subscription.status === 'ACTIVE') {
    if (subscription.endDate && new Date(subscription.endDate) <= now) {
      return 'EXPIRED'
    }
    return 'ACTIVE'
  } else if (subscription.status === 'CANCELED') {
    return 'CANCELED'
  } else {
    return 'UNKNOWN'
  }
}
