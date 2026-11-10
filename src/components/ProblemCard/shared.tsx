import {
  DIFFICULTY_BADGE,
  PROBLEM_CARD,
  PROBLEM_TYPE_BADGE,
  THINKING_PROMPT,
} from '@/constants/designTokens'
import { capitalizeFirstLetter } from '@/utils/helpers'
import { ProblemDifficulty, ProblemType } from '@/lib/prisma-enums'
import clsx from 'clsx'
import { m } from 'framer-motion'
import { HiBookOpen, HiCodeBracket } from 'react-icons/hi2'

export type TypeBadgeProps = {
  type: ProblemType | string
  /** Reference icons from a once-per-page <ProblemTypeIconSprite /> instead of inlining them. */
  spriteIcons?: boolean
}

const TYPE_ICON_IDS = { theory: 'problem-type-theory', coding: 'problem-type-coding' } as const

/** Render once above any list that uses <TypeBadge spriteIcons />. */
export const ProblemTypeIconSprite = () => (
  <svg aria-hidden="true" width="0" height="0" className="absolute">
    <symbol id={TYPE_ICON_IDS.theory} viewBox="0 0 24 24">
      <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
    </symbol>
    <symbol id={TYPE_ICON_IDS.coding} viewBox="0 0 24 24">
      <path fillRule="evenodd" clipRule="evenodd" d="M14.447 3.026a.75.75 0 0 1 .527.921l-4.5 16.5a.75.75 0 0 1-1.448-.394l4.5-16.5a.75.75 0 0 1 .921-.527ZM16.72 6.22a.75.75 0 0 1 1.06 0l5.25 5.25a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 1 1-1.06-1.06L21.44 12l-4.72-4.72a.75.75 0 0 1 0-1.06Zm-9.44 0a.75.75 0 0 1 0 1.06L2.56 12l4.72 4.72a.75.75 0 0 1-1.06 1.06L.97 12.53a.75.75 0 0 1 0-1.06l5.25-5.25a.75.75 0 0 1 1.06 0Z" />
    </symbol>
  </svg>
)

export const TypeBadge = ({ type, spriteIcons = false }: TypeBadgeProps) => {
  const isTheory = type === ProblemType.THEORY || type === 'THEORY'
  return (
    <span
      className={clsx(
        PROBLEM_TYPE_BADGE.base,
        isTheory ? PROBLEM_TYPE_BADGE.theory : PROBLEM_TYPE_BADGE.coding,
      )}
    >
      {spriteIcons ? (
        <svg aria-hidden="true" className="h-3.5 w-3.5" fill="currentColor">
          <use href={`#${isTheory ? TYPE_ICON_IDS.theory : TYPE_ICON_IDS.coding}`} />
        </svg>
      ) : isTheory ? (
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
  <m.div
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
      Explain your reasoning or try an implementation before comparing answers.
    </p>
    <button
      type="button"
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
  </m.div>
)

export type LessonBadgeProps = {
  title: string
  href: string
}

export const LessonBadge = ({ title, href }: LessonBadgeProps) => (
  <a
    href={href}
    className="badge-lesson"
  >
    {title}
  </a>
)
