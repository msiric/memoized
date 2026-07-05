'use client'

import { Prisma } from '@prisma/client'
import { PreserializedMdxRenderer } from './PreserializedMdxRenderer'

export type ProblemQuestionProps = {
  question: string
  serializedQuestion?: Prisma.JsonValue | null
  className?: string
}

/**
 * Renders a problem's question. Questions can contain markdown (fenced code
 * blocks, inline code, ...), so when the pre-serialized MDX is available we
 * render it through the same pipeline as answers. The raw-string fallback keeps
 * questions readable for rows synced before `serializedQuestion` existed.
 */
export const ProblemQuestion = ({
  question,
  serializedQuestion,
  className,
}: ProblemQuestionProps) => {
  if (serializedQuestion) {
    return (
      <PreserializedMdxRenderer
        serializedContent={serializedQuestion}
        withPadding={false}
        showFooter={false}
        showNextPage={false}
      />
    )
  }

  return <p className={className}>{question}</p>
}
