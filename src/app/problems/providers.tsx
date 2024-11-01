'use client'

import { Footer } from '@/components/Footer'
import { Logo } from '@/components/Logo'
import { SectionProvider } from '@/components/SectionProvider'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ReactNode } from 'react'

export type ProblemProvidersProps = {
  header: ReactNode
  navigation: ReactNode
  table: ReactNode
}

export const ProblemProviders = ({
  header,
  navigation,
  table,
}: ProblemProvidersProps) => {
  return (
    <>
      <SectionProvider sections={[]}>
        <div className="h-full lg:ml-72 xl:ml-80">
          <motion.header
            layoutScroll
            className="contents lg:pointer-events-none lg:fixed lg:inset-0 lg:z-40 lg:flex"
          >
            <div className="contents px-4 lg:pointer-events-auto lg:block lg:w-72 lg:overflow-y-auto lg:border-r lg:border-zinc-900/10 lg:px-6 lg:pb-8 lg:pt-4 xl:w-80 lg:dark:border-white/10">
              <div className="hidden lg:flex">
                <Link href="/" aria-label="Home">
                  <Logo className="h-6" />
                </Link>
              </div>
              {header}
              {navigation}
            </div>
          </motion.header>
          <div className="relative flex h-full flex-col px-4 pt-14 sm:px-6 lg:px-8">
            <main className="flex-auto">{table}</main>
            <Footer />
          </div>
        </div>
      </SectionProvider>
    </>
  )
}
