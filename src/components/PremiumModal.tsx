'use client'

import { PREMIUM_QUERY_PARAM, SESSION_QUERY_PARAM } from '@/constants'
import { useGAConversion } from '@/hooks/useGAConversion'
import clsx from 'clsx'
import { MouseEvent, useEffect, useState } from 'react'
import { IoCheckmark, IoClose } from 'react-icons/io5'

export type PremiumModalProps = {
  upgradedSuccessfully: boolean
  stripeSessionId: string | undefined
}

export const PremiumModal = ({
  upgradedSuccessfully,
  stripeSessionId,
}: PremiumModalProps) => {
  const [isOpen, setIsOpen] = useState(true)
  const [isVisible, setIsVisible] = useState(false)

  const reportConversion = useGAConversion()

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  useEffect(() => {
    if (upgradedSuccessfully && stripeSessionId) {
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
  }, [upgradedSuccessfully, stripeSessionId])

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
              upgradedSuccessfully
                ? 'bg-lime-500/20 text-lime-400 shadow-[0_0_30px_rgba(132,204,22,0.3)]'
                : 'bg-red-500/20 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
            )}
          >
            {upgradedSuccessfully ? (
              <IoCheckmark className="h-8 w-8" />
            ) : (
              <IoClose className="h-8 w-8" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          <h2 className="mb-3 text-xl font-semibold text-white">
            {upgradedSuccessfully ? 'Welcome to Premium!' : 'Upgrade Failed'}
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-zinc-400">
            {upgradedSuccessfully
              ? 'You now have unlimited access to all premium content and features. Enjoy your learning journey!'
              : 'There was a problem processing your payment. Your card has not been charged. Please try again or contact support.'}
          </p>

          {/* Action button */}
          <button
            onClick={closeModal}
            className={clsx(
              'w-full rounded-lg py-2.5 text-sm font-medium transition-colors',
              upgradedSuccessfully
                ? 'bg-zinc-800 text-lime-400 hover:bg-zinc-700'
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
            )}
          >
            {upgradedSuccessfully ? 'Start learning' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
