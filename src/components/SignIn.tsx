'use client'

import { APP_NAME } from '@/constants'
import { useAuthStore } from '@/contexts/auth'
import clsx from 'clsx'
import { signIn } from 'next-auth/react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

export const SignIn = () => {
  const isModalOpen = useAuthStore((state) => state.isModalOpen)
  const closeModal = useAuthStore((state) => state.closeModal)
  const modalRef = useRef<HTMLDivElement>(null)
  const [shouldRender, setShouldRender] = useState(isModalOpen)
  const [isFullyVisible, setIsFullyVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async (provider: string) => {
    try {
      setLoading(true)
      setError(null)
      await signIn(provider)
    } catch (error) {
      setLoading(false)
      setError('Something went wrong while trying to authenticate you')
    }
  }

  useEffect(() => {
    if (isModalOpen) {
      setShouldRender(true)
      setTimeout(() => setIsFullyVisible(true), 10)
      document.body.style.overflow = 'hidden'
    } else {
      setIsFullyVisible(false)
      document.body.style.overflow = ''
      setTimeout(() => setShouldRender(false), 300)
    }
  }, [isModalOpen])

  useEffect(() => {
    if (isModalOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          modalRef.current &&
          !modalRef.current.contains(event.target as Node)
        ) {
          closeModal()
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isModalOpen, closeModal])

  if (!shouldRender) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm transition-opacity duration-300 ${
        isFullyVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`relative mx-4 w-full max-w-md transform rounded-xl border bg-white p-6 shadow-xl transition-transform duration-300 dark:bg-zinc-900 ${
          isFullyVisible ? 'scale-100' : 'scale-95'
        }`}
        ref={modalRef}
      >
        <div className="mt-2 space-y-4">
          <Image
            alt="Logo"
            src="https://www.svgrepo.com/show/475643/dribbble-color.svg"
            className="mx-auto w-10"
            width="40"
            height="40"
          />
          <h2 className="mb-8 text-center text-2xl font-bold text-cyan-900 dark:text-white">
            Log in to unlock the best of {APP_NAME}
          </h2>
        </div>
        <div className="mt-10 grid space-y-4">
          {error && (
            <p className="mb-2 text-center text-sm text-cyan-900 dark:text-white">
              {error}
            </p>
          )}
          <button
            disabled={loading}
            onClick={() => handleClick('google')}
            className={clsx(
              'group h-12 rounded-full border-2 border-gray-300 px-4 transition duration-300 hover:border-lime-500 active:border-black dark:active:border-white',
              loading && 'cursor-not-allowed opacity-50',
            )}
          >
            <div className="relative flex items-center justify-center space-x-4">
              <Image
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                className="absolute left-0 w-5"
                alt="Google logo"
                width="20"
                height="20"
              />
              <span className="block w-max text-sm font-semibold tracking-wide text-gray-700 transition duration-300 group-hover:text-lime-500 sm:text-base dark:text-white">
                Continue with Google
              </span>
            </div>
          </button>
          <button
            disabled={loading}
            onClick={() => handleClick('github')}
            className={clsx(
              'group h-12 rounded-full border-2 border-gray-300 px-4 transition duration-300 hover:border-lime-500 active:border-black dark:active:border-white',
              loading && 'cursor-not-allowed opacity-50',
            )}
          >
            <div className="relative flex items-center justify-center space-x-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                className="absolute left-0 w-5 text-gray-700"
                viewBox="0 0 16 16"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path>
              </svg>
              <span className="block w-max text-sm font-semibold tracking-wide text-gray-700 transition duration-300 group-hover:text-lime-500 sm:text-base dark:text-white">
                Continue with Github
              </span>
            </div>
          </button>
        </div>
        <div className="mt-14 space-y-4 py-3 text-center text-gray-600 dark:text-gray-400">
          <p className="text-xs">
            By proceeding, you agree to the&nbsp;
            <a href="/privacy-policy/" className="underline">
              Terms of Use
            </a>
            &nbsp;and confirm you have read the&nbsp;
            <a href="/privacy-policy/" className="underline">
              Privacy and Cookie Statement
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
