'use client'

import { SignIn } from '@/components/SignIn'
import { SnackbarNotification } from '@/components/SnackbarNotification'
import { LazyMotion } from 'framer-motion'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { SnackbarProvider } from 'notistack'
import React from 'react'
import MdxProvider from '../providers/MdxProvider'

const loadMotionFeatures = () =>
  import('@/lib/motion-features').then((mod) => mod.default)

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        forcedTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <SnackbarProvider
          maxSnack={3}
          autoHideDuration={3000}
          preventDuplicate={true}
          Components={{
            success: SnackbarNotification,
            error: SnackbarNotification,
          }}
        >
          {/* strict: a stray `motion.*` component would bundle the full engine
              again, so it throws instead. Use `m.*` from framer-motion. */}
          <LazyMotion features={loadMotionFeatures} strict>
            <MdxProvider>{children}</MdxProvider>
            <SignIn />
          </LazyMotion>
        </SnackbarProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
