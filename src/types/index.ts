import { AccessOptions } from '@prisma/client'

export type AuthProvider = 'google' | 'github'

export type LessonConfig = {
  id: string
  href: string
  title: string
  description: string
  access: AccessOptions
}

export type LessonResult = {
  id: string
  title: string
  href: string
  description: string | null
  access: AccessOptions
}

export type SectionResult = {
  id: string
  title: string
  description: string | null
  lessons: LessonResult[]
}

export type Curriculum = {
  id: string
  title: string
  description: string | null
  sections: SectionResult[]
}

export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'UNKNOWN'
