import '@/styles/tailwind.css'
import { type Metadata } from 'next'
import { ReactNode } from 'react'
import { ProblemProviders } from './providers'

export const metadata: Metadata = {
  title: {
    template: 'Problems',
    default: 'Problems',
  },
}

export type ProblemLayoutProps = {
  header: ReactNode
  table: ReactNode
}

export default async function ProblemLayout({
  header,
  table,
}: ProblemLayoutProps) {
  return <ProblemProviders header={header} table={table} />
}
