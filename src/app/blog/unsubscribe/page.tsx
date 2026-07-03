'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { APP_NAME } from '../../../constants'

// Map error reasons to user-friendly messages
const errorMessages: Record<string, { title: string; message: string }> = {
  'missing-token': {
    title: 'Invalid Link',
    message: 'This unsubscribe link is missing required information. Please use the link from your email.',
  },
  'invalid-link': {
    title: 'Invalid Link',
    message: 'This unsubscribe link is invalid or has been tampered with. Please use the original link from your email.',
  },
  'expired-link': {
    title: 'Link Expired',
    message: 'This unsubscribe link has expired. Please use a more recent email to unsubscribe, or contact us for help.',
  },
  'invalid-email': {
    title: 'Invalid Email',
    message: 'The email address in this link is invalid. Please use the link from your email.',
  },
  'config': {
    title: 'Service Unavailable',
    message: 'The newsletter service is temporarily unavailable. Please try again later.',
  },
  'rate-limited': {
    title: 'Too Many Requests',
    message: 'You\'ve made too many unsubscribe attempts. Please wait a while and try again.',
  },
  'failed': {
    title: 'Something Went Wrong',
    message: 'We couldn\'t process your unsubscribe request. Please try again or contact us for help.',
  },
}

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status')
  const reason = searchParams.get('reason')

  const isSuccess = status === 'success'
  const isError = status === 'error'
  const errorInfo = reason ? errorMessages[reason] : errorMessages['failed']

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        {isSuccess ? (
          <>
            <div className="mb-4 text-5xl">👋</div>
            <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-white">
              You&apos;ve been unsubscribed
            </h1>
            <p className="mb-6 text-zinc-600 dark:text-zinc-400">
              You will no longer receive {APP_NAME} blog newsletter emails. Sorry to see you go!
            </p>
          </>
        ) : isError ? (
          <>
            <div className="mb-4 text-5xl">😕</div>
            <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-white">
              {errorInfo.title}
            </h1>
            <p className="mb-6 text-zinc-600 dark:text-zinc-400">
              {errorInfo.message}
            </p>
          </>
        ) : (
          <>
            <div className="mb-4 text-5xl">📧</div>
            <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-white">
              Unsubscribe from Newsletter
            </h1>
            <p className="mb-6 text-zinc-600 dark:text-zinc-400">
              Use the unsubscribe link in your email to manage your subscription preferences.
            </p>
          </>
        )}
        
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 rounded-lg bg-lime-500 px-6 py-3 font-medium text-white transition-colors hover:bg-lime-600"
        >
          Back to Blog
        </Link>
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}
