'use client'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { ReactNode } from 'react'

export type PremiumProvidersProps = {
  children: ReactNode
}

export const PremiumProviders = ({ children }: PremiumProvidersProps) => {
  return (
    <div className="h-full">
      <Header fullWidth withAuth={false} withSearch={false} withSubheader />
      <div className="relative flex h-full flex-col px-4 pt-14 sm:px-6 lg:px-8">
        <main className="flex-auto">{children}</main>
        <Footer />
      </div>
    </div>
  )
}
