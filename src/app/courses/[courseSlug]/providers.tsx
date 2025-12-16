'use client'

import { Logo } from '@/components/Logo'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import { Footer } from '../../../components/Footer'
import { SectionProvider, Section } from '../../../providers/SectionProvider'

export type CourseProvidersProps = {
  header: ReactNode
  navigation: ReactNode
  allSections: Record<string, Array<Section>>
  children: ReactNode
}

export const CourseProviders = ({
  header,
  navigation,
  allSections,
  children,
}: CourseProvidersProps) => {
  const pathname = usePathname()
  const formattedPathname = `/${pathname.split('/').slice(3).join('/')}`

  return (
    <SectionProvider sections={allSections?.[formattedPathname] ?? []}>
      <div className="lg:ml-sidebar-lg xl:ml-sidebar-xl h-full">
        <motion.header
          layoutScroll
          className="contents lg:pointer-events-none lg:fixed lg:inset-0 lg:z-40 lg:flex"
        >
          <div className="lg:w-sidebar-lg xl:w-sidebar-xl contents lg:pointer-events-auto lg:block lg:overflow-y-auto lg:border-r lg:border-zinc-900/10 lg:px-6 lg:pb-8 lg:pt-4 lg:dark:border-white/10">
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
          <main className="flex-auto">{children}</main>
          <Footer />
        </div>
      </div>
    </SectionProvider>
  )
}
