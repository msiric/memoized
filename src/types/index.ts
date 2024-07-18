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
  problems: PracticeProblem[]
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

export type Curriculum = {
  id: string
  slug: string
  title: string
  description: string | null
  order: number
  sections: SectionResult[]
}

export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'UNKNOWN'

export type PracticeProblem = {
  href: string
  title: string
  difficulty: ProblemDifficulty
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

export type UserWithSubscriptionsAndProgress = Prisma.UserGetPayload<{
  include: {
    customer: {
      include: {
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
  }
}> & {
  currentSubscriptionPlan: SubscriptionPlan | null
  currentSubscriptionStatus: SubscriptionStatus | null
  currentLessonProgress: number
}

export type StripePriceWithProduct = Stripe.Price & {
  product: Stripe.Product
}
