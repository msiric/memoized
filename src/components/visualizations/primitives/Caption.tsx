import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'
import { ink, type as typeScale } from './tokens-v3'

/**
 * Caption (D3, R3): the why-sentence under a stage. UI type, 14/24 sans in
 * zinc-300 (the platform component body, P: ProblemCard/index.tsx:224), with
 * `text-wrap: pretty` so a caption never ends on an orphan (critique F-X-05).
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

/** The checkpoint prompt: 16/28 semibold, pretty wrapping (D3, R3). */
export const promptCls = cn('m-0', typeScale.prompt.cls, ink.base)

/** The bold lead of a feedback or recap line ("Right.", "Not quite."). */
export const feedbackLeadCls = cn('font-semibold', ink.base)

/**
 * Feedback after a prediction (R4, drift X05): one style in every visual. The
 * caption, led by a semibold zinc-100 verdict. Ghost copies (for reserved
 * height) must use this same markup, so they wrap exactly like the live one.
 */
export function Feedback({
  lead,
  body,
  className,
  ...rest
}: HTMLAttributes<HTMLParagraphElement> & { lead: ReactNode; body?: ReactNode }) {
  return (
    <p className={cn(captionCls, className)} {...rest}>
      <span className={feedbackLeadCls}>{lead}</span>
      {body ? <> {body}</> : null}
    </p>
  )
}
