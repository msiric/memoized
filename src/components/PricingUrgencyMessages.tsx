import React from 'react'
import { BadgeCheckIcon, ClockIcon, LightningIcon } from './icons'

export const PricingUrgencyMessages = () => {
  return (
    <div className="space-y-4">
      {/* Compact badges */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-lime-50 px-4 py-2 text-sm font-medium text-lime-700 ring-1 ring-lime-200/50 dark:bg-lime-900/20 dark:text-lime-300 dark:ring-lime-500/30">
          <BadgeCheckIcon className="h-4 w-4" />
          30-day guarantee
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 ring-1 ring-indigo-200/50 dark:bg-indigo-900/20 dark:text-indigo-300 dark:ring-indigo-500/30">
          <LightningIcon className="h-4 w-4" />
          Lifetime updates
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 ring-1 ring-amber-200/50 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-500/30">
          <ClockIcon className="h-4 w-4" />
          Earlybird pricing
        </div>
      </div>
      
      {/* Explanatory text */}
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Prices increase as content grows • Lifetime plan is a limited time offer • Full refund, no questions asked
      </p>
    </div>
  )
}
