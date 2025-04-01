import { Metadata } from 'next'
import { ReactNode } from 'react'
import { PremiumProviders } from './providers'

export const metadata: Metadata = {
  title: {
    template: 'Premium',
    default: 'Premium',
  },
}

export type PremiumLayoutProps = {
  children: ReactNode
}

export default async function PremiumLayout({ children }: PremiumLayoutProps) {
  return <PremiumProviders>{children}</PremiumProviders>
}
