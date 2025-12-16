'use client'

import { SignIn } from '@/components/SignIn'
import { SnackbarNotification } from '@/components/SnackbarNotification'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { SnackbarProvider } from 'notistack'
import React from 'react'
import MdxProvider from '../providers/MdxProvider'

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
          <MdxProvider>{children}</MdxProvider>
          <SignIn />
        </SnackbarProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
