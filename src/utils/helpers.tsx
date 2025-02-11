import { DIFFICULTY_ORDER } from '@/constants'
import { stripe } from '@/lib/stripe'
import {
  ActiveCoupon,
  Curriculum,
  EnrichedLesson,
  EnrichedUser,
  LessonWithProblems,
  LessonWithResourcesAndProblems,
  NavigationContent,
  ProblemFilter,
  ProblemRow,
  UserWithSubscriptionsAndProgress,
} from '@/types'
import {
  AccessOptions,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client'
import { format, fromUnixTime, isBefore, parseISO } from 'date-fns'
import { createHighlighter } from 'shiki'
import Stripe from 'stripe'

export const formatter = new Intl.NumberFormat('sfb', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  trailingZeroDisplay: 'stripIfInteger',
} as Intl.NumberFormatOptions)

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
  const { difficulty, status, lesson, type, search, sortColumn, sortOrder } =
    filter

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

  if (type) {
    filteredProblems = filteredProblems.filter(
      (problem) => problem.type.toLowerCase() === type.toLowerCase(),
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
      if (sortColumn === 'type') {
        return sortOrder === 'asc'
          ? a.type.localeCompare(b.type)
          : b.type.localeCompare(a.type)
      }
      return 0
    })
  }

  return filteredProblems
}

export const getURL = (path: string = '', env = process.env) => {
  let url =
    env.NEXT_PUBLIC_SITE_URL?.trim() ||
    env.NEXT_PUBLIC_VERCEL_URL?.trim() ||
    'http://localhost:3000'

  // Trim the URL and remove trailing slash if exists.
  url = url.replace(/\/+$/, '')

  // Make sure to include `https://` when not localhost.
  url = url.startsWith('http') ? url : `https://${url}`

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

  if (subscription.status === SubscriptionStatus.ACTIVE) {
    if (subscription.endDate) {
      const endDate =
        typeof subscription.endDate === 'string'
          ? parseISO(subscription.endDate)
          : subscription.endDate
      if (!isBefore(now, endDate)) {
        return 'EXPIRED'
      }
    }
    return 'ACTIVE'
  } else if (subscription.status === SubscriptionStatus.CANCELED) {
    return 'CANCELED'
  } else {
    return 'UNKNOWN'
  }
}

export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production'
}

export const formatDate = (timestamp: number | null): string | null => {
  if (timestamp === null) return null
  return format(fromUnixTime(timestamp), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
}

export const calculateDiscountedPrice = (
  price: number,
  coupon: ActiveCoupon,
) => {
  if (coupon.percentOff) {
    return price * (1 - coupon.percentOff / 100)
  } else if (coupon.amountOff) {
    return Math.max(0, price - coupon.amountOff)
  }
  return price
}

export const formatPrice = (value: number) => {
  return formatter.format(value)
}

export const sortCurriculum = (
  curriculum?: Curriculum[],
): Curriculum[] | undefined => {
  return curriculum
    ?.slice()
    .sort((a, b) => a.order - b.order)
    .map((course) => ({
      ...course,
      sections: course.sections
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((section) => ({
          ...section,
          lessons: section.lessons.slice().sort((a, b) => a.order - b.order),
        })),
    }))
}

export const sortProblemList = (
  problemList?: LessonWithProblems[],
): LessonWithProblems[] | undefined => {
  return problemList
    ?.slice()
    .sort((a, b) => a.section.order - b.section.order)
    .map((list) => ({
      ...list,
      problems: list.problems
        .slice()
        .sort(
          (a, b) =>
            DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty],
        ),
    }))
}

export const sortResources = (
  lessons?: LessonWithResourcesAndProblems[],
): LessonWithResourcesAndProblems[] | undefined => {
  return lessons
    ?.slice()
    .sort((a, b) => a.section.order - b.section.order)
    .map((list) => ({
      ...list,
      resources: list.resources.slice().sort((a, b) => a.order - b.order),
    }))
}

export const buildCurriculum = (allLessons: EnrichedLesson[]): Curriculum[] => {
  return allLessons.reduce<Curriculum[]>((acc, lesson) => {
    const {
      id: courseId,
      slug: courseSlug,
      title: courseTitle,
      order: courseOrder,
      description: courseDescription,
      href: courseHref,
    } = lesson.section.course
    const {
      id: sectionId,
      slug: sectionSlug,
      title: sectionTitle,
      order: sectionOrder,
      description: sectionDescription,
      href: sectionHref,
    } = lesson.section
    const {
      id: lessonId,
      slug: lessonSlug,
      title: lessonTitle,
      order: lessonOrder,
      description: lessonDescription,
      access: lessonAccess,
      href: lessonHref,
    } = lesson

    let course = acc.find((course) => course.id === courseId)
    if (!course) {
      course = {
        id: courseId,
        slug: courseSlug,
        title: courseTitle,
        description: courseDescription,
        order: courseOrder,
        href: courseHref,
        sections: [],
      }
      acc.push(course)
    }

    let section = course.sections.find((sec) => sec.id === sectionId)
    if (!section) {
      section = {
        id: sectionId,
        slug: sectionSlug,
        title: sectionTitle,
        description: sectionDescription,
        order: sectionOrder,
        href: sectionHref,
        lessons: [],
      }
      course.sections.push(section)
    }

    section.lessons.push({
      id: lessonId,
      slug: lessonSlug,
      title: lessonTitle,
      href: lessonHref,
      description: lessonDescription,
      access: lessonAccess,
      order: lessonOrder,
    })

    return acc
  }, [])
}

export const calculateProgress = <T, S>(
  user: EnrichedUser,
  allLessons: T[] | number,
  allProblems: S[] | number,
) => {
  const lessonCount = Array.isArray(allLessons) ? allLessons.length : allLessons
  const problemCount = Array.isArray(allProblems)
    ? allProblems.length
    : allProblems
  const completedLessons = user?.lessonProgress.length
  const currentLessonProgress =
    lessonCount > 0 ? (completedLessons / lessonCount) * 100 : 0

  const completedProblems = user?.problemProgress.length
  const currentProblemProgress =
    problemCount > 0 ? (completedProblems / problemCount) * 100 : 0

  return { currentLessonProgress, currentProblemProgress }
}

export const curriculumToNavigation = (
  curriculum?: Curriculum,
): NavigationContent | undefined => {
  if (!curriculum) return undefined

  return {
    id: curriculum.id,
    slug: curriculum.slug,
    title: curriculum.title,
    description: curriculum.description,
    order: curriculum.order,
    href: curriculum.href,
    sections: curriculum.sections.map((section) => ({
      id: section.id,
      slug: section.slug,
      title: section.title,
      href: section.href,
      description: section.description,
      order: section.order,
      links: section.lessons.map((lesson) => ({
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        href: lesson.href,
        description: lesson.description,
        order: lesson.order,
        access: lesson.access,
      })),
      access: section.access,
    })),
  }
}

export const problemListToNavigation = (
  problemList?: LessonWithProblems[],
): NavigationContent | undefined => {
  if (!problemList) return undefined

  return {
    id: 'problem-navigation',
    slug: 'problem-navigation',
    title: 'Problems',
    description: 'Navigation structure for lessons and problems',
    order: 0,
    href: '/problems',
    sections: problemList.map((lesson) => ({
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      href: lesson.href,
      description: lesson.description,
      order: lesson.order,
      links: lesson.problems.map((problem, index) => ({
        id: problem.id,
        slug: problem.href.split('/').pop() || `problem-${index}`,
        title: problem.title,
        href: problem.href,
        description: null,
        order: index + 1,
      })),
      access: lesson.access,
    })),
  }
}

export const resourcesToNavigation = (
  resourceList?: LessonWithResourcesAndProblems[],
): NavigationContent | undefined => {
  if (!resourceList) return undefined

  return {
    id: 'prep-resources',
    slug: 'prep-resources',
    title: 'Resources',
    description: 'Navigation structure for resources',
    order: 0,
    href: '/resources',
    sections: resourceList.map((lesson) => ({
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      href: lesson.href,
      description: lesson.description,
      order: lesson.order,
      links: lesson.resources?.map((resource, index) => ({
        id: resource.id,
        slug: resource.href.split('/').pop() || `resource-${index}`,
        title: resource.title,
        href: resource.href,
        description: null,
        order: resource.order,
        access: resource.access,
      })),
      access: lesson.access,
    })),
  }
}

export const formatPercentage = (value: number) => {
  return value % 1 === 0 ? value.toString() : value.toFixed(2)
}

export async function getShikiHighlighter(
  lang: string = 'js',
  theme: string = 'nord',
) {
  return await createHighlighter({ themes: [theme], langs: [lang] })
}

export async function highlightCode(
  code: string,
  lang: string = 'js',
  theme: string = 'nord',
) {
  const highlighter = await getShikiHighlighter(lang, theme)
  return highlighter.codeToHtml(code, { lang, theme })
}
