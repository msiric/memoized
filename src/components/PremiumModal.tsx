'use client'

import { PREMIUM_QUERY_PARAM, SESSION_QUERY_PARAM } from '@/constants'
import clsx from 'clsx'
import { MouseEvent, useState } from 'react'
import { MdOutlineCheck } from 'react-icons/md'
import { RxCross2 } from 'react-icons/rx'

export type PremiumModalProps = {
  upgradedSuccessfully: boolean
}

export const PremiumModal = ({ upgradedSuccessfully }: PremiumModalProps) => {
  const [isOpen, setIsOpen] = useState(true)
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
        <div className="relative rounded-lg bg-white p-6 text-center shadow-2xl dark:bg-zinc-700">
          <button
            type="button"
            className="absolute right-2.5 top-2.5 ml-auto inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
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
              'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full p-2',
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
          <h2 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-white">
            {upgradedSuccessfully ? 'Upgrade Successful' : 'Upgrade Failed'}
          </h2>
          <div className="mb-6 text-gray-600 dark:text-gray-300">
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
          {upgradedSuccessfully && (
            <ul role="list" className="mb-6 space-y-3">
              <li className="flex items-start">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 32 32"
                  className="h-8 w-8 flex-none fill-lime-500"
                >
                  <path d="M11.83 15.795a1 1 0 0 0-1.66 1.114l1.66-1.114Zm9.861-4.072a1 1 0 1 0-1.382-1.446l1.382 1.446ZM14.115 21l-.83.557a1 1 0 0 0 1.784-.258L14.115 21Zm.954.3c1.29-4.11 3.539-6.63 6.622-9.577l-1.382-1.446c-3.152 3.013-5.704 5.82-7.148 10.424l1.908.598Zm-4.9-4.391 3.115 4.648 1.661-1.114-3.114-4.648-1.662 1.114Z" />
                </svg>
                <div className="ml-4 text-left text-gray-600 dark:text-gray-300">
                  <p className="text-md font-medium text-gray-600 dark:text-white">
                    Built-In Data Structures
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 32 32"
                  className="h-8 w-8 flex-none fill-lime-500"
                >
                  <path d="M11.83 15.795a1 1 0 0 0-1.66 1.114l1.66-1.114Zm9.861-4.072a1 1 0 1 0-1.382-1.446l1.382 1.446ZM14.115 21l-.83.557a1 1 0 0 0 1.784-.258L14.115 21Zm.954.3c1.29-4.11 3.539-6.63 6.622-9.577l-1.382-1.446c-3.152 3.013-5.704 5.82-7.148 10.424l1.908.598Zm-4.9-4.391 3.115 4.648 1.661-1.114-3.114-4.648-1.662 1.114Z" />
                </svg>
                <div className="ml-4 text-left text-gray-600 dark:text-gray-300">
                  <p className="text-md font-medium text-gray-600 dark:text-white">
                    User-Defined Data Structures
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 32 32"
                  className="h-8 w-8 flex-none fill-lime-500"
                >
                  <path d="M11.83 15.795a1 1 0 0 0-1.66 1.114l1.66-1.114Zm9.861-4.072a1 1 0 1 0-1.382-1.446l1.382 1.446ZM14.115 21l-.83.557a1 1 0 0 0 1.784-.258L14.115 21Zm.954.3c1.29-4.11 3.539-6.63 6.622-9.577l-1.382-1.446c-3.152 3.013-5.704 5.82-7.148 10.424l1.908.598Zm-4.9-4.391 3.115 4.648 1.661-1.114-3.114-4.648-1.662 1.114Z" />
                </svg>
                <div className="ml-4 text-left text-gray-600 dark:text-gray-300">
                  <p className="text-md font-medium text-gray-600 dark:text-white">
                    Common Techniques
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 32 32"
                  className="h-8 w-8 flex-none fill-lime-500"
                >
                  <path d="M11.83 15.795a1 1 0 0 0-1.66 1.114l1.66-1.114Zm9.861-4.072a1 1 0 1 0-1.382-1.446l1.382 1.446ZM14.115 21l-.83.557a1 1 0 0 0 1.784-.258L14.115 21Zm.954.3c1.29-4.11 3.539-6.63 6.622-9.577l-1.382-1.446c-3.152 3.013-5.704 5.82-7.148 10.424l1.908.598Zm-4.9-4.391 3.115 4.648 1.661-1.114-3.114-4.648-1.662 1.114Z" />
                </svg>
                <div className="ml-4 text-left text-gray-600 dark:text-gray-300">
                  <p className="text-md font-medium text-gray-600 dark:text-white">
                    Advanced Topics
                  </p>
                </div>
              </li>
            </ul>
          )}
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
