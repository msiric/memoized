'use client'

import { PREMIUM_QUERY_PARAM, SESSION_QUERY_PARAM } from '@/constants'
import { useGAConversion } from '@/hooks/useGAConversion'
import clsx from 'clsx'
import { MouseEvent, useEffect, useState } from 'react'
import { MdOutlineCheck } from 'react-icons/md'
import { RxCross2 } from 'react-icons/rx'

export type PremiumModalProps = {
  upgradedSuccessfully: boolean
  stripeSessionId: string | undefined
}

export const PremiumModal = ({
  upgradedSuccessfully,
  stripeSessionId,
}: PremiumModalProps) => {
  const [isOpen, setIsOpen] = useState(true)

  const reportConversion = useGAConversion()

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
    setIsOpen(false)
    // Remove the query parameters from the URL
    const url = new URL(window.location.href)
    url.searchParams.delete(PREMIUM_QUERY_PARAM)
    url.searchParams.delete(SESSION_QUERY_PARAM)
    window.history.replaceState({}, '', url.toString())
  }

  const handleClickOutside = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLDivElement).id === 'premium-modal') {
      closeModal()
    }
  }

  return (
    <div
      id="premium-modal"
      onClick={handleClickOutside}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${isOpen ? 'block' : 'hidden'}`}
    >
      <div className="relative w-full max-w-md p-4 md:h-auto">
        <div className="relative rounded-lg bg-white p-6 text-center shadow-2xl dark:bg-zinc-800">
          <button
            type="button"
            className="absolute right-2.5 top-2.5 ml-auto inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
            onClick={closeModal}
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              ></path>
            </svg>
            <span className="sr-only">Close modal</span>
          </button>
          <div
            className={clsx(
              'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full p-2 text-white',
              upgradedSuccessfully ? 'bg-lime-600' : 'bg-red-600',
            )}
          >
            {upgradedSuccessfully ? (
              <MdOutlineCheck size="30" />
            ) : (
              <RxCross2 size="30" />
            )}
            <span className="sr-only">
              {upgradedSuccessfully ? 'Success' : 'Error'}
            </span>
          </div>
          <h2 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-white">
            {upgradedSuccessfully ? 'Upgrade Successful' : 'Upgrade Failed'}
          </h2>
          <div className="mb-6 text-zinc-600 dark:text-zinc-300">
            {upgradedSuccessfully ? (
              <>
                <p>
                  Thank you for upgrading to premium! You now have access to all
                  premium content and features.
                </p>
                <p className="mt-2">
                  Enjoy your learning journey with unlimited access.
                </p>
              </>
            ) : (
              <>
                <p>
                  There was a problem upgrading your account to premium and your
                  payment has been refunded.
                </p>
                <p className="mt-2">
                  If you have any questions or concerns, please reach out to
                  support.
                </p>
              </>
            )}
          </div>
          <div className="flex justify-center space-x-4">
            <button
              onClick={closeModal}
              className={clsx(
                'rounded-lg px-4 py-2 text-center text-sm font-medium text-white focus:outline-none focus:ring-4',
                upgradedSuccessfully
                  ? 'bg-lime-600 hover:bg-lime-700 focus:ring-lime-300 dark:focus:ring-lime-900'
                  : 'bg-red-600 hover:bg-red-700 focus:ring-red-300 dark:focus:ring-red-900',
              )}
            >
              {upgradedSuccessfully ? 'Start learning' : 'Close modal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
