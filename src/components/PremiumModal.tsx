'use client'

import { PREMIUM_QUERY_PARAM, SESSION_QUERY_PARAM } from '@/constants'
import { useGAConversion } from '@/hooks/useGAConversion'
import type { CheckoutReturnState } from '@/services/checkout-return'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { MouseEvent, useEffect, useState } from 'react'
import { IoCheckmark, IoClose, IoTimeOutline } from 'react-icons/io5'

export type PremiumModalProps = {
  checkoutState: CheckoutReturnState
  stripeSessionId: string | undefined
}

const PROCESSING_REFRESH_MS = 3000
const PROCESSING_MAX_REFRESHES = 10

// Every message states only what the server actually confirmed.
const COPY: Record<CheckoutReturnState, { title: string; body: string; action: string }> = {
  upgraded: {
    title: 'Welcome to Premium!',
    body: 'You now have unlimited access to all premium content and features. Enjoy your learning journey!',
    action: 'Start learning',
  },
  processing: {
    title: 'Payment received',
    body: 'We are activating your Premium access. This usually takes a few seconds.',
    action: 'Close',
  },
  pending_payment: {
    title: 'Payment pending',
    body: 'Your bank is still confirming this payment. Premium activates automatically once it clears, and we will email you.',
    action: 'Close',
  },
  unconfirmed: {
    title: 'Checking your purchase',
    body: 'We could not confirm this checkout here. If you completed payment, Premium will appear on your account shortly. Contact support if it does not.',
    action: 'Close',
  },
  failed: {
    title: 'Upgrade not completed',
    body: 'The checkout was not completed, so you have not been charged. You can try again at any time.',
    action: 'Close',
  },
}

const PROCESSING_TIMEOUT_BODY =
  'Your payment was received and Premium is still being activated. Refresh in a minute, or contact support if it does not appear.'

export const PremiumModal = ({
  checkoutState,
  stripeSessionId,
}: PremiumModalProps) => {
  const [isOpen, setIsOpen] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const router = useRouter()
  const upgraded = checkoutState === 'upgraded'
  const processing = checkoutState === 'processing'

  const reportConversion = useGAConversion()

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  // The header may have rendered before the purchase was recorded in this
  // request; refresh once so it shows the new plan.
  useEffect(() => {
    if (upgraded) {
      router.refresh()
    }
  }, [upgraded, router])

  // Re-check (bounded) while the purchase is being recorded.
  const [refreshes, setRefreshes] = useState(0)
  useEffect(() => {
    if (!processing || refreshes >= PROCESSING_MAX_REFRESHES) return
    const timer = setTimeout(() => {
      setRefreshes((count) => count + 1)
      router.refresh()
    }, PROCESSING_REFRESH_MS)
    return () => clearTimeout(timer)
  }, [processing, refreshes, router])

  useEffect(() => {
    if (upgraded && stripeSessionId) {
      const reportedConversions = JSON.parse(
        localStorage.getItem('reportedConversions') || '{}',
      )

      if (!reportedConversions[stripeSessionId]) {
        reportConversion(stripeSessionId)
        reportedConversions[stripeSessionId] = new Date().toISOString()
        localStorage.setItem(
          'reportedConversions',
          JSON.stringify(reportedConversions),
        )
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upgraded, stripeSessionId])

  const closeModal = () => {
    setIsVisible(false)
    setTimeout(() => {
      setIsOpen(false)
      const url = new URL(window.location.href)
      url.searchParams.delete(PREMIUM_QUERY_PARAM)
      url.searchParams.delete(SESSION_QUERY_PARAM)
      window.history.replaceState({}, '', url.toString())
    }, 200)
  }

  const handleClickOutside = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLDivElement).id === 'premium-modal') {
      closeModal()
    }
  }

  if (!isOpen) return null

  const copy = COPY[checkoutState]
  const body = processing && refreshes >= PROCESSING_MAX_REFRESHES ? PROCESSING_TIMEOUT_BODY : copy.body
  const tone = upgraded || processing ? 'positive' : checkoutState === 'failed' ? 'negative' : 'neutral'

  return (
    <div
      id="premium-modal"
      onClick={handleClickOutside}
      className={clsx(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-200',
        isVisible ? 'opacity-100' : 'opacity-0'
      )}
    >
      <div
        className={clsx(
          'relative mx-4 w-full max-w-sm transform rounded-2xl border border-zinc-700/50 bg-zinc-900 p-8 shadow-2xl transition-all duration-200',
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        )}
      >
        {/* Close button */}
        <button
          type="button"
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          onClick={closeModal}
        >
          <IoClose className="h-5 w-5" />
        </button>

        {/* Icon with glow effect */}
        <div className="mb-6 flex justify-center">
          <div
            className={clsx(
              'flex h-16 w-16 items-center justify-center rounded-full',
              tone === 'positive' && 'bg-lime-500/20 text-lime-400 shadow-[0_0_30px_rgba(132,204,22,0.3)]',
              tone === 'negative' && 'bg-red-500/20 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.3)]',
              tone === 'neutral' && 'bg-zinc-700/40 text-zinc-300',
            )}
          >
            {tone === 'positive' ? (
              <IoCheckmark className="h-8 w-8" />
            ) : tone === 'negative' ? (
              <IoClose className="h-8 w-8" />
            ) : (
              <IoTimeOutline className="h-8 w-8" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          <h2 className="mb-3 text-xl font-semibold text-white">{copy.title}</h2>
          <p role="status" className="mb-6 text-sm leading-relaxed text-zinc-400">
            {body}
          </p>

          {/* Action button */}
          <button
            onClick={closeModal}
            className={clsx(
              'w-full rounded-lg py-2.5 text-sm font-medium transition-colors',
              upgraded
                ? 'bg-zinc-800 text-lime-400 hover:bg-zinc-700'
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
            )}
          >
            {copy.action}
          </button>
        </div>
      </div>
    </div>
  )
}
