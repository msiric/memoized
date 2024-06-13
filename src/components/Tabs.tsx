'use client'

import React, { useState } from 'react'

interface Tab {
  label: string
  content: React.ReactNode
  icon?: React.ReactNode
  disabled?: boolean
}

export type TabsProps = {
  tabs: Tab[]
  defaultTab?: number
  bgColor?: string
  activeBgColor?: string
  activeTextColor?: string
  inactiveTextColor?: string
  hoverBgColor?: string
  hoverTextColor?: string
  disabledTextColor?: string
  contentBgColor?: string
  contentTextColor?: string
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultTab = 0,
  bgColor = 'bg-zinc-500',
  activeBgColor = 'bg-lime-600',
  activeTextColor = 'text-white',
  inactiveTextColor = 'text-zinc-500',
  hoverBgColor = 'hover:bg-zinc-100',
  hoverTextColor = 'hover:text-zinc-900',
  disabledTextColor = 'text-zinc-400',
  contentBgColor = 'bg-zinc-500',
  contentTextColor = 'text-zinc-500',
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab)

  const handleTabClick = (index: number, disabled: boolean) => {
    if (!disabled) {
      setActiveTab(index)
    }
  }

  return (
    <div className="md:flex">
      <ul
        className={`flex-column space-y mb-4 mt-0 list-none space-y-4 p-0 text-sm font-medium ${inactiveTextColor} md:mb-0 md:me-4 dark:text-zinc-400`}
      >
        {tabs.map((tab, index) => (
          <li key={index} className="mt-0 pl-0">
            <button
              className={`inline-flex w-full items-center rounded-lg px-4 py-3
                ${
                  activeTab === index
                    ? `${activeBgColor} ${activeTextColor} dark:${activeTextColor}`
                    : `${bgColor} ${hoverBgColor} ${hoverTextColor} dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-white`
                }
                ${
                  tab.disabled
                    ? `cursor-not-allowed ${disabledTextColor} dark:text-zinc-500`
                    : ''
                }`}
              aria-current={activeTab === index ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault()
                handleTabClick(index, !!tab.disabled)
              }}
            >
              {tab.icon && <span className="me-2 h-4 w-4">{tab.icon}</span>}
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
      <div
        className={`text-medium w-full rounded-lg p-6 ${contentBgColor} ${contentTextColor} dark:bg-zinc-800 dark:text-zinc-400`}
      >
        {tabs[activeTab].content}
      </div>
    </div>
  )
}
