'use client'

import { MouseEvent } from 'react'
import { RxCross2 } from 'react-icons/rx'
import { ProblemRow } from '../types'

export type AnswerModalProps = {
  isOpen: boolean
  onClose: () => void
  problem: ProblemRow | null
}

export const AnswerModal = ({ isOpen, onClose, problem }: AnswerModalProps) => {
  const handleClickOutside = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLDivElement).id === 'answer-modal') {
      onClose()
    }
  }

  if (!problem) return null

  return (
    <div
      id="answer-modal"
      onClick={handleClickOutside}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${
        isOpen ? 'block' : 'hidden'
      }`}
    >
      <div className="relative w-full max-w-3xl p-4 md:h-auto">
        <div className="relative max-h-[80vh] overflow-y-auto rounded-lg bg-white p-6 shadow-2xl dark:bg-zinc-800">
          <button
            type="button"
            className="absolute right-2.5 top-2.5 ml-auto inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
            onClick={onClose}
          >
            <RxCross2 className="h-5 w-5" />
            <span className="sr-only">Close modal</span>
          </button>

          <h2 className="mb-4 pr-6 text-2xl font-semibold text-zinc-900 dark:text-white">
            {problem.title}
          </h2>

          {/* <div className="prose max-w-none dark:prose-invert">
            <MdxRenderer content={problem.answer} />
          </div> */}
        </div>
      </div>
    </div>
  )
}
