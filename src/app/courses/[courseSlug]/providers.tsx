'use client'

import { useSitePathname } from '@/hooks/useSitePathname'
import { Logo } from '@/components/Logo'
import { m } from 'framer-motion'
import Link from 'next/link'

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
  const pathname = useSitePathname()
  const formattedPathname = `/${pathname.split('/').slice(3).join('/')}`

  return (
    <SectionProvider sections={allSections?.[formattedPathname] ?? []}>
      <div className="lg:ml-sidebar-lg xl:ml-sidebar-xl h-full">
        <m.header
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
        </m.header>
        <div className="relative flex h-full flex-col px-4 pt-14 sm:px-6 lg:px-8">
          <main className="flex-auto">{children}</main>
          <Footer width="prose" />
        </div>
      </div>
    </SectionProvider>
  )
}
