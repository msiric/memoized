import * as Generated from '@prisma/client'
import { describe, expect, it } from 'vitest'
import * as Mirrored from './prisma-enums'

const ENUMS = [
  'AccessOptions',
  'SubscriptionPlan',
  'SubscriptionStatus',
  'ProblemDifficulty',
  'ProblemType',
  'BannerType',
] as const

describe('browser-safe Prisma enums', () => {
  it.each(ENUMS)('%s matches the generated Prisma client', (name) => {
    expect({ ...Mirrored[name] }).toEqual({ ...Generated[name] })
  })
})
