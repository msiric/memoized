'use client'

import { Problem } from '@prisma/client'
import { ProblemCard } from './ProblemCard'

export type ExpandableAnswerProps = {
  problem?: Problem
}

/**
 * ExpandableAnswer - Wrapper for ProblemCard in lesson context
 * 
 * This component maintains backward compatibility while using the new
 * unified ProblemCard component with progressive disclosure.
 */
export const ExpandableAnswer = ({ problem }: ExpandableAnswerProps) => {
  if (!problem) return null

  return (
    <ProblemCard
      problem={problem}
      defaultExpanded={false}
    />
  )
}

