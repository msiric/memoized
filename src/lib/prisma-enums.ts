// Browser-safe copies of the Prisma enums.
//
// Importing an enum *value* from '@prisma/client' pulls Prisma's browser
// runtime (~34 KB) into every client bundle that reaches it. Client and shared
// code imports enum values from here instead; types still come from Prisma.
// `satisfies` fails typechecking if a member is added, removed or renamed in
// the schema, and prisma-enums.test.ts compares the values at runtime.
import type * as P from '@prisma/client'

type Mirror<E extends string> = { readonly [K in E]: K }

export const AccessOptions = {
  FREE: 'FREE',
  PREMIUM: 'PREMIUM',
} as const satisfies Mirror<P.AccessOptions>
export type AccessOptions = P.AccessOptions

export const SubscriptionPlan = {
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
  LIFETIME: 'LIFETIME',
} as const satisfies Mirror<P.SubscriptionPlan>
export type SubscriptionPlan = P.SubscriptionPlan

export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED',
} as const satisfies Mirror<P.SubscriptionStatus>
export type SubscriptionStatus = P.SubscriptionStatus

export const ProblemDifficulty = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
} as const satisfies Mirror<P.ProblemDifficulty>
export type ProblemDifficulty = P.ProblemDifficulty

export const ProblemType = {
  CODING: 'CODING',
  THEORY: 'THEORY',
} as const satisfies Mirror<P.ProblemType>
export type ProblemType = P.ProblemType

export const BannerType = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  SUCCESS: 'SUCCESS',
  DISCOUNT: 'DISCOUNT',
} as const satisfies Mirror<P.BannerType>
export type BannerType = P.BannerType
