import { CARD, SPACING, TYPOGRAPHY } from '@/constants/designTokens'

export interface FAQCardProps {
  question: string
  answer: string
  className?: string
}

export const FAQCard = ({ question, answer, className = '' }: FAQCardProps) => {
  return (
    <div className={`${CARD.base} ${className}`}>
      <h3
        className={`${SPACING.headingMargin.h5} ${TYPOGRAPHY.heading.h5} ${TYPOGRAPHY.color.primary}`}
      >
        {question}
      </h3>
      <p className={`${TYPOGRAPHY.body.small} ${TYPOGRAPHY.color.secondary}`}>{answer}</p>
    </div>
  )
}
