'use client'

import { Footer } from '@/components/Footer'
import { ReactNode } from 'react'

export type ProblemProvidersProps = {
  header: ReactNode
  table: ReactNode
}

export const ProblemProviders = ({ header, table }: ProblemProvidersProps) => {
  return (
    <>
      {header}
      <div className="relative flex h-full flex-col px-4 pt-14 sm:px-6 lg:px-8">
        <main className="flex-auto">{table}</main>
        <Footer />
      </div>
    </>
  )
}
