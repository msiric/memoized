import {
  AccessOptions,
  Prisma,
  ProblemDifficulty,
  SubscriptionPlan,
} from '@prisma/client'
import Stripe from 'stripe'

export type AuthProvider = 'google' | 'github'

export type LessonConfig = {
  id: string
  href: string
  title: string
  description: string
  access: AccessOptions
  problems?: PracticeProblem[]
  resources?: LessonResource[]
}

export type ProblemConfig = {
  id: string
}

export type LessonResult = {
  id: string
  slug: string
  title: string
  href: string
  description: string | null
  order: number
  access: AccessOptions
  problems?: PracticeProblem[]
}

export type NavigationLink = {
  id: string
  slug: string
  title: string
  href: string
  description: string | null
  order?: number
  access?: AccessOptions
}

export type SectionResult = {
  id: string
  slug: string
  title: string
  href: string
  description: string | null
  order: number
  lessons: LessonResult[]
  access?: AccessOptions
}

export type NavigationSection = {
  id: string
  slug: string
  title: string
  href: string
  description: string | null
  order: number
  links?: NavigationLink[]
  access?: AccessOptions
}

export type Curriculum = {
  id: string
  slug: string
  title: string
  description: string | null
  order: number
  href: string
  sections: SectionResult[]
}

export type NavigationContent = {
  id: string
  slug: string
  title: string
  description: string | null
  order: number
  href: string
  sections: NavigationSection[]
}

export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'UNKNOWN'

export type PracticeProblem = {
  href: string
  title: string
  difficulty: ProblemDifficulty
}

export type LessonResource = {
  id: string
  href: string
  title: string
  description: string
  about: string
}

export type ProblemRow = {
  id: string
  title: string
  href: string
  difficulty: ProblemDifficulty
  lesson: { title: string; slug: string }
  problemProgress: { completed: boolean }[]
}

export type ProblemStatus = 'TODO' | 'COMPLETED'

export type EnrichedLesson = Prisma.LessonGetPayload<{
  select: {
    id: true
    title: true
    href: true
    description: true
    access: true
    order: true
    slug: true
    section: {
      select: {
        id: true
        title: true
        href: true
        order: true
        slug: true
        description: true
        course: {
          select: {
            id: true
            title: true
            description: true
            slug: true
            order: true
            href: true
          }
        }
      }
    }
  }
  orderBy: { order: 'asc' }
}>

export type EnrichedProblem = Prisma.ProblemGetPayload<{
  select: { id: true; title: true; difficulty: true; href: true }
}>

export type EnrichedUser = Prisma.UserGetPayload<{
  select: {
    id: true
    name: true
    email: true
    image: true
    customer: {
      select: {
        subscriptions: {
          orderBy: { startDate: 'desc' }
          take: 1
        }
      }
    }
    lessonProgress: {
      where: {
        completed: true
      }
      select: {
        lessonId: true
        completed: true
      }
    }
    problemProgress: {
      where: {
        completed: true
      }
      select: {
        problemId: true
        completed: true
      }
    }
  }
}>

export type LessonWithProblems = Prisma.LessonGetPayload<{
  select: {
    id: true
    title: true
    href: true
    description: true
    access: true
    slug: true
    order: true
    section: {
      select: {
        order: true
      }
    }
    problems: {
      select: {
        id: true
        title: true
        href: true
        difficulty: true
      }
    }
  }
  orderBy: { order: 'asc' }
}>

export type LessonWithResourcesAndProblems = Prisma.LessonGetPayload<{
  select: {
    id: true
    title: true
    href: true
    description: true
    access: true
    slug: true
    order: true
    section: {
      select: {
        order: true
      }
    }
    resources: {
      select: {
        id: true
        title: true
        href: true
        order: true
        access: true
      }
    }
    problems: {
      select: {
        id: true
        title: true
        href: true
        difficulty: true
      }
    }
  }
  orderBy: { order: 'asc' }
}>

export type UserWithSubscriptionsAndProgress = EnrichedUser & {
  currentSubscriptionPlan: SubscriptionPlan | null
  currentSubscriptionStatus: SubscriptionStatus | null
  currentLessonProgress: number
  currentProblemProgress: number
}

export type ActiveCoupon = {
  id: string
  name: string
  percentOff: number | null
  amountOff: number | null
}

export type ProductWithCoupon = Stripe.Product & {
  default_price: Stripe.Price & {
    appliedCoupon?: ActiveCoupon | null
  }
}

export type ListCouponsParams = {
  created?: Stripe.CouponListParams['created']
  ending_before?: string
  starting_after?: string
  limit?: number
}

export type CouponConfig = {
  id?: string
  name: string
  percent_off?: number
  amount_off?: number
  currency?: string
  duration: 'forever' | 'once' | 'repeating'
  duration_in_months?: number
  max_redemptions?: number
  redeem_by?: Date
  applies_to?: {
    products?: string[]
  }
  metadata?: Record<string, string>
  currency_options?: Record<
    string,
    {
      amount_off: number
    }
  >
}

export type PromotionCodeConfig = {
  code?: string
  active?: boolean
  max_redemptions?: number
  expires_at?: Date
  metadata?: Record<string, string>
}

export type CompletedKey = 'completedLessons' | 'completedProblems'
