'use client'

import { useState, FormEvent } from 'react'

type NewsletterFormState = 'idle' | 'loading' | 'success' | 'error'

export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<NewsletterFormState>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!email || state === 'loading') return

    setState('loading')
    setMessage('')

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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
      <div className="flex flex-col items-center justify-center rounded-xl bg-white/10 p-6 text-center">
        <div className="mb-3 text-4xl">🎉</div>
        <p className="text-lg font-medium text-white">{message}</p>
        <p className="mt-2 text-sm text-lime-100">
          We&apos;ll send you the best articles, no spam.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
        disabled={state === 'loading'}
        className="flex-1 rounded-lg border-0 px-4 py-3 text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50"
        aria-label="Email address"
      />
      <button
        type="submit"
        disabled={state === 'loading' || !email}
        className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === 'loading' ? (
          <span className="flex items-center gap-2">
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
          </span>
        ) : (
          'Subscribe'
        )}
      </button>
      {state === 'error' && (
        <p className="absolute -bottom-6 left-0 text-sm text-red-200">
          {message}
        </p>
      )}
    </form>
  )
}
