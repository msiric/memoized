import { AccessOptions, ProblemDifficulty } from '@prisma/client'

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
  difficulty: ProblemDifficulty
  lesson: { title: string }
  problemProgress: { completed: boolean }[]
}

export type ProblemStatus = 'TODO' | 'COMPLETED'
