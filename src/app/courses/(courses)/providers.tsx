'use client'

import { Logo } from '@/components/Logo'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ReactNode } from 'react'
import { Footer } from '../../../components/Footer'

export type CoursesProvidersProps = {
  header: ReactNode
  children: ReactNode
}

export const CoursesProviders = ({
  header,
  children,
}: CoursesProvidersProps) => {
  return (
    <div className="h-full">
      <motion.header
        layoutScroll
        className="contents lg:pointer-events-none lg:fixed lg:inset-0 lg:z-40 lg:flex"
      >
        <div className="contents w-0 p-0 lg:pointer-events-auto lg:block lg:overflow-y-auto lg:pb-8 lg:pt-4">
          <div className="hidden lg:flex">
            <Link href="/" aria-label="Home">
              <Logo className="h-6" />
            </Link>
          </div>
          {header}
        </div>
      </motion.header>
      <div className="relative flex h-full flex-col pt-14">
        <main className="flex-auto">{children}</main>
        <Footer />
      </div>
    </div>
  )
}
