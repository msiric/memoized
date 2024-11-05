'use client'

import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { memo, useEffect, useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { nord } from 'react-syntax-highlighter/dist/cjs/styles/prism'

export type AnimatedCodeProps = {
  initialTab?: string
  codeSnippets: {
    code: string
    tab: string
  }[]
}

const customNordTheme = {
  ...nord,
  'pre[class*="language-"]': {
    ...nord['pre[class*="language-"]'],
    background: 'transparent',
    margin: 0,
    padding: 0,
  },
  'code[class*="language-"]': {
    ...nord['code[class*="language-"]'],
    background: 'transparent',
  },
}

export const AnimatedCode = memo(
  ({ initialTab, codeSnippets }: AnimatedCodeProps) => {
    const [tab, setTab] = useState(initialTab || codeSnippets[0].tab)
    const [currentSnippet, setCurrentSnippet] = useState(codeSnippets[0])
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [direction, setDirection] = useState(1)
    const [isFirstRender, setIsFirstRender] = useState(true)

    useEffect(() => {
      let currentIndex = 0

      const rotateSnippets = () => {
        setIsTransitioning(true)
        currentIndex = (currentIndex + 1) % codeSnippets.length
        const nextSnippet = codeSnippets[currentIndex]

        setTab(nextSnippet.tab)
        setDirection(1)
        setCurrentSnippet(nextSnippet)
        setIsFirstRender(false)

        setTimeout(() => {
          setIsTransitioning(false)
        }, 300)
      }

      const interval = setInterval(rotateSnippets, 3000)
      return () => clearInterval(interval)
    }, [codeSnippets])

    return (
      <div className="py-4 pl-4">
        <svg
          aria-hidden="true"
          viewBox="0 0 42 10"
          fill="none"
          className="h-2.5 w-auto stroke-slate-500/30"
        >
          <circle cx={5} cy={5} r="4.5" />
          <circle cx={21} cy={5} r="4.5" />
          <circle cx={37} cy={5} r="4.5" />
        </svg>

        <div className="mt-4 flex space-x-2 text-xs">
          <div
            className={clsx(
              'flex h-6 transform-gpu rounded-full bg-gradient-to-r from-lime-400/30 via-lime-400 to-lime-400/30 p-px font-medium text-lime-300',
              isTransitioning && 'animate-flipVertical',
            )}
          >
            <div className="flex items-center justify-center rounded-full bg-slate-800 px-2.5">
              {tab}
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden px-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSnippet.code}
              initial={
                isFirstRender
                  ? { x: 0, opacity: 1 }
                  : { x: direction * 20, opacity: 0 }
              }
              animate={{
                x: 0,
                opacity: 1,
              }}
              exit={{
                x: direction * -20,
                opacity: 0,
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                opacity: { duration: 0.2 },
              }}
            >
              <SyntaxHighlighter
                language="typescript"
                style={customNordTheme}
                className="text-xs sm:text-sm"
                wrapLines={true}
                wrapLongLines={true}
              >
                {currentSnippet.code}
              </SyntaxHighlighter>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    )
  },
)

AnimatedCode.displayName = 'AnimatedCode'
