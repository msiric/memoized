'use client'

import { useState, useEffect, useCallback, ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ImageLightboxProps {
  children: ReactNode
  src: string
  alt: string
}

export function ImageLightbox({ children, src, alt }: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleClose])

  const lightboxOverlay = isOpen && mounted ? (
    createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-label={`Enlarged image: ${alt}`}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          aria-label="Close lightbox"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image - using img because Next/Image doesn't support dynamic sizing well for lightbox */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-[90vh] max-w-[90vw] cursor-zoom-out rounded-lg object-contain shadow-2xl"
          onClick={(e) => {
            e.stopPropagation()
            handleClose()
          }}
        />

        {/* Caption */}
        {alt && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-black/50 px-4 py-2 text-sm text-white">
            {alt}
          </div>
        )}
      </div>,
      document.body
    )
  ) : null

  return (
    <>
      <div
        className="cursor-zoom-in"
        onClick={() => setIsOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsOpen(true)
          }
        }}
        aria-label={`Click to enlarge: ${alt}`}
      >
        {children}
      </div>
      {lightboxOverlay}
    </>
  )
}
