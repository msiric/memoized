'use client'

import { SignIn } from '@/components/SignIn'
import { SnackbarNotification } from '@/components/SnackbarNotification'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider, useTheme } from 'next-themes'
import { SnackbarProvider } from 'notistack'
import React, { useEffect } from 'react'

function ThemeWatcher() {
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    function onMediaChange() {
      const systemTheme = media.matches ? 'dark' : 'light'
      if (resolvedTheme === systemTheme) {
        setTheme('system')
      }
    }

    onMediaChange()
    media.addEventListener('change', onMediaChange)

    return () => {
      media.removeEventListener('change', onMediaChange)
    }
  }, [resolvedTheme, setTheme])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" disableTransitionOnChange>
        <SnackbarProvider
          maxSnack={3}
          autoHideDuration={3000}
          preventDuplicate={true}
          Components={{
            success: SnackbarNotification,
            error: SnackbarNotification,
          }}
        >
          <ThemeWatcher />
          {children}
          <SignIn />
        </SnackbarProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
