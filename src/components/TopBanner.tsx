'use client'

import { BannerType } from '@prisma/client'
import Link from 'next/link'
import React, { useState } from 'react'
import { CiWarning } from 'react-icons/ci'
import { IoCheckmarkCircleOutline } from 'react-icons/io5'
import { LuBellRing } from 'react-icons/lu'
import { TfiAnnouncement } from 'react-icons/tfi'

interface TopBannerProps {
  title: string
  message: string
  type: BannerType
  link?: {
    text: string
    url: string
  }
}

const TopBanner: React.FC<TopBannerProps> = ({
  title,
  message,
  type,
  link,
}) => {
  const [isVisible, setIsVisible] = useState(true)

  const handleClose = () => {
    setIsVisible(false)
  }

  const getGradientColors = () => {
    switch (type) {
      case 'INFO':
        return 'from-lime-400 to-indigo-600'
      case 'WARNING':
        return 'from-yellow-400 to-yellow-600'
      case 'SUCCESS':
        return 'from-lime-400 to-lime-600'
      default:
        return 'from-[#ff80b5] to-[#9089fc]'
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'INFO':
        return <LuBellRing className="mr-2 text-white" size="20px" />
      case 'WARNING':
        return <CiWarning className="mr-2 text-white" size="20px" />
      case 'SUCCESS':
        return (
          <IoCheckmarkCircleOutline className="mr-2 text-white" size="20px" />
        )
      default:
        return <TfiAnnouncement className="mr-2 text-white" size="20px" />
    }
  }

  if (!isVisible) return null

  return (
    <div className="z-5 relative isolate z-10 flex items-center gap-x-2 overflow-hidden bg-gray-50 bg-opacity-35 px-6 py-2.5 before:flex-1 sm:gap-x-6 sm:px-3.5">
      <div
        aria-hidden="true"
        className="absolute left-[max(-7rem,calc(50%-52rem))] top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl"
      >
        <div
          style={{
            clipPath:
              'polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)',
          }}
          className={`aspect-[577/310] w-[36.0625rem] bg-gradient-to-r ${getGradientColors()} opacity-70`}
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute left-[max(45rem,calc(50%+8rem))] top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl"
      >
        <div
          style={{
            clipPath:
              'polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)',
          }}
          className={`aspect-[577/310] w-[36.0625rem] bg-gradient-to-r ${getGradientColors()} opacity-70`}
        />
      </div>
      <div className="flex flex-col items-center gap-y-2 md:flex-row md:items-center md:justify-center md:gap-x-4">
        <div className="flex items-center">
          <div className="mr-2 hidden md:block">{getIcon()}</div>
          <p className="md:text-md text-center text-sm leading-6 text-white md:text-left">
            <strong className="block font-semibold md:inline">{title}</strong>
            <svg
              viewBox="0 0 2 2"
              aria-hidden="true"
              className="mx-2 hidden h-0.5 w-0.5 fill-current md:inline-block"
            >
              <circle r={1} cx={1} cy={1} />
            </svg>
            <span className="block md:inline">{message}</span>
          </p>
        </div>
        {link && (
          <Link
            href={link.url}
            className="mt-2 flex-none rounded-full bg-gray-900 px-3.5 py-1 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 md:mt-0"
          >
            {link.text} <span aria-hidden="true">&rarr;</span>
          </Link>
        )}
      </div>
      <div className="flex flex-1 justify-end">
        <button
          onClick={handleClose}
          type="button"
          className="absolute right-1 top-1 focus-visible:outline-offset-[-4px] md:static md:-m-3 md:p-3"
        >
          <span className="sr-only">Dismiss</span>
          <svg
            className="h-5 w-5 text-white"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default TopBanner
