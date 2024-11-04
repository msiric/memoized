import { Metadata } from 'next'
import { ReactNode } from 'react'
import { CoursesProviders } from './providers'

export const metadata: Metadata = {
  title: {
    template: 'Courses',
    default: 'Courses',
  },
}

export type CoursesLayoutProps = {
  header: ReactNode
  children: ReactNode
}

export default async function CoursesLayout({
  header,
  children,
}: CoursesLayoutProps) {
  return <CoursesProviders header={header}>{children}</CoursesProviders>
}
