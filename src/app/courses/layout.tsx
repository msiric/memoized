import { type Metadata } from 'next'
import { ReactNode } from 'react'

export type CoursesLayoutProps = {
  header: ReactNode
  navigation: ReactNode
  section: ReactNode
  children: ReactNode
}

export default async function CoursesLayout({ children }: CoursesLayoutProps) {
  return children
}
