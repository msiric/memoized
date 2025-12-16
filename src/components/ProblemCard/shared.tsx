import {
  DIFFICULTY_BADGE,
  PROBLEM_CARD,
  PROBLEM_TYPE_BADGE,
  THINKING_PROMPT,
} from '@/constants/designTokens'
import { capitalizeFirstLetter } from '@/utils/helpers'
import { ProblemDifficulty, ProblemType } from '@prisma/client'
import clsx from 'clsx'
import { motion } from 'framer-motion'
import { HiBookOpen, HiCodeBracket } from 'react-icons/hi2'

export type TypeBadgeProps = {
  type: ProblemType | string
}

export const TypeBadge = ({ type }: TypeBadgeProps) => {
  const isTheory = type === ProblemType.THEORY || type === 'THEORY'
  return (
    <span
      className={clsx(
        PROBLEM_TYPE_BADGE.base,
        isTheory ? PROBLEM_TYPE_BADGE.theory : PROBLEM_TYPE_BADGE.coding,
      )}
    >
      {isTheory ? (
        <HiBookOpen className="h-3.5 w-3.5" />
      ) : (
        <HiCodeBracket className="h-3.5 w-3.5" />
      )}
      {capitalizeFirstLetter(type)}
    </span>
  )
}


export type DifficultyBadgeProps = {
  difficulty: ProblemDifficulty
}

const DOT_COUNT: Record<ProblemDifficulty, number> = {
  [ProblemDifficulty.EASY]: 1,
  [ProblemDifficulty.MEDIUM]: 2,
  [ProblemDifficulty.HARD]: 3,
}

export const DifficultyBadge = ({ difficulty }: DifficultyBadgeProps) => {
  const filledDots = DOT_COUNT[difficulty]

  return (
    <span className={DIFFICULTY_BADGE.base}>
      <span className={DIFFICULTY_BADGE.dotContainer}>
        {[1, 2, 3].map((dot) => (
          <span
            key={dot}
            className={
              dot <= filledDots
                ? DIFFICULTY_BADGE.dotFilled
                : DIFFICULTY_BADGE.dotEmpty
            }
          />
        ))}
      </span>
      {capitalizeFirstLetter(difficulty)}
    </span>
  )
}

export type ThinkingPromptProps = {
  onReveal: () => void
  isTheory: boolean
}

export const ThinkingPrompt = ({ onReveal, isTheory }: ThinkingPromptProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className={THINKING_PROMPT.container}
  >
    <HiBookOpen className={THINKING_PROMPT.icon} />
    <p className={THINKING_PROMPT.text}>
      Take a moment to think about this before revealing the answer
    </p>
    <p className={THINKING_PROMPT.hint}>
      Active recall strengthens memory retention
    </p>
    <button
      onClick={onReveal}
      className={clsx(
        PROBLEM_CARD.revealButton,
        isTheory
          ? PROBLEM_CARD.revealButtonTheory
          : PROBLEM_CARD.revealButtonCoding,
        'mt-3',
      )}
    >
      Reveal answer
    </button>
  </motion.div>
)

export type LessonBadgeProps = {
  title: string
  href: string
}

export const LessonBadge = ({ title, href }: LessonBadgeProps) => (
  <a
    href={href}
    className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-300 hover:text-zinc-900 dark:bg-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-500 dark:hover:text-zinc-100"
  >
    {title}
  </a>
)
