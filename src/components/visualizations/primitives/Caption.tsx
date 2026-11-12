import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'
import { ink, type as typeScale } from './tokens-v3'

/**
 * Caption (D3): the why-sentence under a stage. 14/28 sans in zinc-300 (the
 * platform component body tone, P: ProblemCard/index.tsx:224) at the prose
 * line height (P: typography.ts:45), with `text-wrap: pretty` so a caption
 * never ends on an orphan (critique F-X-05).
 */
export const captionCls = cn('m-0', typeScale.caption.cls, ink.secondary)

export function Caption({
  as: Tag = 'p',
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLElement> & { as?: 'p' | 'figcaption'; children: ReactNode }) {
  return (
    <Tag className={cn(captionCls, className)} {...rest}>
      {children}
    </Tag>
  )
}

/** The checkpoint prompt: 16/28 semibold, pretty wrapping (D3). */
export const promptCls = cn('m-0', typeScale.prompt.cls, ink.base)
