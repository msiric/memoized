'use client'

import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { Highlighter } from 'shiki'
import 'shiki-magic-move/dist/style.css'
import { ShikiMagicMove } from 'shiki-magic-move/react'
import { getSharedHighlighter } from '@/lib/shiki'

export type AnimatedCodeProps = {
  initialTab?: string
  initialSnippet: TrustedHTML
  codeSnippets: {
    code: string
    tab: string
  }[]
}

export const AnimatedCode = ({
  initialTab,
  initialSnippet,
  codeSnippets,
}: AnimatedCodeProps) => {
  const [tab, setTab] = useState(initialTab)
  const [code, setCode] = useState(codeSnippets[0].code)
  const [highlighter, setHighlighter] = useState<Highlighter>()
  const [index, setIndex] = useState(0)
  const [flip, setFlip] = useState(false)

  useEffect(() => {
    const initializeHighlighter = async () => {
      const highlighter = await getSharedHighlighter();
      setHighlighter(highlighter);
    }
    initializeHighlighter()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % codeSnippets.length)
      setCode(codeSnippets[(index + 1) % codeSnippets.length].code)
      setTab(codeSnippets[(index + 1) % codeSnippets.length].tab)
      setFlip(true)
    }, 2000)

    return () => clearInterval(interval)
  }, [codeSnippets, index])

  useEffect(() => {
    if (flip) {
      const timeout = setTimeout(() => setFlip(false), 500)
      return () => clearTimeout(timeout)
    }
  }, [flip])

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
            'flex h-6 rounded-full bg-gradient-to-r from-lime-400/30 via-lime-400 to-lime-400/30 p-px font-medium text-lime-300 will-change-transform',
            flip && 'animate-flipVertical',
          )}
        >
          <div className="flex items-center justify-center rounded-full bg-slate-800 px-2.5">
            {tab}
          </div>
        </div>
      </div>
      <div className="mt-6 flex items-start px-1 text-sm">
        <div className="w-full">
          {highlighter ? (
            <>
              <ShikiMagicMove
                lang="ts"
                theme="nord"
                highlighter={highlighter}
                code={code}
                options={{ duration: 800, stagger: 0.3 }}
                className="text-xs sm:text-sm"
              />
            </>
          ) : (
            <div
              className="text-xs sm:text-sm"
              dangerouslySetInnerHTML={{ __html: initialSnippet }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
