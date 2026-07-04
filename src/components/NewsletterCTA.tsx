'use client'

import { useState, FormEvent } from 'react'
import { GridPattern } from '@/components/GridPattern'
import { isValidEmail, MAX_EMAIL_LENGTH } from '@/utils/validation'

type NewsletterCTAState = 'idle' | 'loading' | 'success' | 'error'

function validateEmail(email: string): { valid: boolean; error?: string } {
  const trimmed = email.trim()
  
  if (!trimmed) {
    return { valid: false, error: 'Email is required' }
  }
  
  if (trimmed.length > MAX_EMAIL_LENGTH) {
    return { valid: false, error: 'Email address is too long' }
  }
  
  if (!isValidEmail(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address' }
  }
  
  return { valid: true }
}

export function NewsletterCTA() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<NewsletterCTAState>('idle')
  const [message, setMessage] = useState('')

  // Clear error state when user starts typing
  function handleEmailChange(value: string) {
    setEmail(value)
    if (state === 'error') {
      setState('idle')
      setMessage('')
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (state === 'loading') return

    // Validate email before submission
    const validation = validateEmail(email)
    if (!validation.valid) {
      setState('error')
      setMessage(validation.error || 'Invalid email')
      return
    }

    setState('loading')
    setMessage('')

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe')
      }

      setState('success')
      setMessage(data.message || 'Thank you for subscribing!')
      setEmail('')
    } catch (error) {
      setState('error')
      setMessage(
        error instanceof Error ? error.message : 'Failed to subscribe'
      )
    }
  }

  if (state === 'success') {
    return (
      <div className="relative overflow-hidden rounded-[1rem] border border-zinc-100 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <div className="absolute inset-0 [mask-image:linear-gradient(white,transparent)]">
          <GridPattern
            width={72}
            height={56}
            x="50%"
            className="absolute inset-x-0 inset-y-[-30%] h-[160%] w-full skew-y-[-18deg] fill-lime-500/5 stroke-lime-500/10 dark:fill-lime-400/5 dark:stroke-lime-400/10"
          />
        </div>
        <div className="relative text-center">
          <div className="mb-3 text-3xl">🎉</div>
          <p className="text-base font-medium text-zinc-900 dark:text-white sm:text-lg">
            {message}
          </p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {message.toLowerCase().includes('already subscribed')
              ? "You'll receive an email when a new post is published."
              : 'Check your inbox for a confirmation email.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative overflow-hidden rounded-[1rem] border border-zinc-100 bg-white p-6 transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
      {/* Grid Pattern Background */}
      <div className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(white,transparent)] transition-opacity duration-300 group-hover:opacity-50">
        <GridPattern
          width={72}
          height={56}
          x="50%"
          className="absolute inset-x-0 inset-y-[-30%] h-[160%] w-full skew-y-[-18deg] fill-black/[0.02] stroke-black/5 dark:fill-white/1 dark:stroke-white/2.5"
        />
      </div>

      <div className="relative text-center">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-lime-100 dark:bg-lime-900/30">
          <svg
            className="h-5 w-5 text-lime-600 dark:text-lime-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white sm:text-xl">
          Stay in the loop
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
          Get notified when I publish new posts. No spam, unsubscribe anytime.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => handleEmailChange(e.target.value)}
          placeholder="you@example.com"
          required
          disabled={state === 'loading'}
          className="flex-1 rounded-[1rem] border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-500 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-lime-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:border-transparent dark:focus:ring-lime-500 sm:max-w-xs"
          aria-label="Email address"
        />
        <button
          type="submit"
          disabled={state === 'loading' || !email}
          className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-lime-500 dark:text-zinc-900 dark:hover:bg-lime-400"
        >
          {state === 'loading' ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Subscribing...
            </>
          ) : (
            'Subscribe'
          )}
        </button>
      </form>

      {state === 'error' && message && (
        <p 
          className="mt-4 text-center text-sm text-red-600 dark:text-red-400"
          role="alert"
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </div>
  )
}
