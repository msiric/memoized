'use client'

import { LogoIcon } from '@/components/Logo'
import { APP_NAME } from '@/constants'
import { useAuthStore } from '@/contexts/auth'
import clsx from 'clsx'
import { signIn } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { FaGithub, FaGoogle } from 'react-icons/fa'
import { IoClose } from 'react-icons/io5'

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
      className={clsx(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300',
        isFullyVisible ? 'opacity-100' : 'opacity-0'
      )}
    >
      <div
        className={clsx(
          'relative mx-4 w-full max-w-sm transform rounded-2xl border border-zinc-700/50 bg-zinc-900 p-8 shadow-2xl transition-all duration-300',
          isFullyVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        )}
        ref={modalRef}
      >
        {/* Close button */}
        <button
          onClick={closeModal}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <IoClose className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex rounded-2xl bg-zinc-800 p-3">
            <LogoIcon className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-semibold text-white">
            Welcome to {APP_NAME}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Sign in to unlock all features
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Auth buttons */}
        <div className="space-y-3">
          <button
            disabled={loading}
            onClick={() => handleClick('google')}
            className={clsx(
              'group flex h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-white px-4 text-sm font-medium text-zinc-900 transition-all hover:bg-zinc-100',
              loading && 'cursor-not-allowed opacity-50'
            )}
          >
            <FaGoogle className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Continue with Google</span>
          </button>

          <button
            disabled={loading}
            onClick={() => handleClick('github')}
            className={clsx(
              'group flex h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-zinc-800 px-4 text-sm font-medium text-white transition-all hover:bg-zinc-700',
              loading && 'cursor-not-allowed opacity-50'
            )}
          >
            <FaGithub className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Continue with GitHub</span>
          </button>
        </div>

        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="h-px flex-1 bg-zinc-800" />
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {/* Terms */}
        <p className="text-center text-xs leading-relaxed text-zinc-500">
          By continuing, you agree to the{' '}
          <a href="/terms" className="text-zinc-400 underline underline-offset-2 hover:text-white">
            Terms of Use
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-zinc-400 underline underline-offset-2 hover:text-white">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  )
}
