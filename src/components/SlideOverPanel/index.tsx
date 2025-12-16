'use client'

import { SLIDE_OVER } from '@/constants/designTokens'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect } from 'react'
import { HiChevronLeft, HiChevronRight, HiXMark } from 'react-icons/hi2'
import clsx from 'clsx'

export type SlideOverPanelProps = {
  isOpen: boolean
  onClose: () => void
  onNext?: () => void
  onPrevious?: () => void
  hasNext?: boolean
  hasPrevious?: boolean
  title?: string
  currentIndex?: number
  totalCount?: number
  problemType?: 'THEORY' | 'CODING'
  children: React.ReactNode
}

export const SlideOverPanel = ({
  isOpen,
  onClose,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
  title,
  currentIndex,
  totalCount,
  problemType,
  children,
}: SlideOverPanelProps) => {
  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return

      switch (event.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowRight':
        case 'n':
          if (hasNext && onNext) {
            event.preventDefault()
            onNext()
          }
          break
        case 'ArrowLeft':
        case 'p':
          if (hasPrevious && onPrevious) {
            event.preventDefault()
            onPrevious()
          }
          break
      }
    },
    [isOpen, onClose, onNext, onPrevious, hasNext, hasPrevious],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={SLIDE_OVER.overlay}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={SLIDE_OVER.panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="slide-over-title"
          >
            {/* Header */}
            <div className={clsx(
              SLIDE_OVER.header,
              problemType === 'THEORY' 
                ? SLIDE_OVER.headerTheory 
                : problemType === 'CODING' 
                  ? SLIDE_OVER.headerCoding 
                  : SLIDE_OVER.headerDefault
            )}>
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                {/* Navigation buttons */}
                <div className="flex flex-shrink-0 items-center">
                  <button
                    onClick={onPrevious}
                    disabled={!hasPrevious}
                    className={clsx(
                      'rounded-lg p-1 sm:p-1.5 transition-colors',
                      hasPrevious
                        ? 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                        : 'cursor-not-allowed text-zinc-300 dark:text-zinc-600',
                    )}
                    title="Previous problem (←)"
                  >
                    <HiChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <button
                    onClick={onNext}
                    disabled={!hasNext}
                    className={clsx(
                      'rounded-lg p-1 sm:p-1.5 transition-colors',
                      hasNext
                        ? 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                        : 'cursor-not-allowed text-zinc-300 dark:text-zinc-600',
                    )}
                    title="Next problem (→)"
                  >
                    <HiChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>

                {/* Counter */}
                {currentIndex !== undefined && totalCount !== undefined && (
                  <span className="flex-shrink-0 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                    {currentIndex + 1}/{totalCount}
                  </span>
                )}

                {/* Title - hidden on very small screens since it's shown in content */}
                {title && (
                  <h2
                    id="slide-over-title"
                    className="ml-1 hidden min-w-0 truncate text-sm font-semibold text-zinc-900 dark:text-white xs:block sm:text-base"
                  >
                    {title}
                  </h2>
                )}
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="flex-shrink-0 rounded-lg p-1 sm:p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                title="Close (Esc)"
              >
                <HiXMark className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            {/* Content */}
            <div className={SLIDE_OVER.content}>{children}</div>

            {/* Footer with keyboard hints */}
            <div className={SLIDE_OVER.footer}>
              <div className="flex items-center justify-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono dark:bg-zinc-700">
                    ←
                  </kbd>
                  <kbd className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono dark:bg-zinc-700">
                    →
                  </kbd>
                  <span className="ml-1">Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono dark:bg-zinc-700">
                    Esc
                  </kbd>
                  <span className="ml-1">Close</span>
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default SlideOverPanel
