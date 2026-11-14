import type { ReactNode } from 'react'
import { cn } from './cn'
import { ink, radius, surface, type as typeScale } from './tokens-v3'

/**
 * Tag (badge): a short word that names a state in text, so no state depends
 * on color alone (spec A7). Sans 12/500 (D3), a 4 px chip on the zinc-800
 * tag fill (P: styles/tailwind.css:261 badge family). Always in flow: a tag
 * never sits on a border or covers an edge (D17, drift T10). Tones follow
 * the roles: `now` lime, `removed` rose, `neutral` zinc-300, `muted` zinc-400.
 * Amber is output only and never a tag tone (D4).
 */

export type TagTone = 'neutral' | 'muted' | 'now' | 'removed'

const tones: Record<TagTone, string> = {
  neutral: ink.secondary,
  muted: ink.muted,
  now: ink.now,
  removed: ink.removed,
}

export const tagCls = (tone: TagTone = 'neutral') =>
  cn(
    'inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap px-1.5',
    radius.chip.cls,
    typeScale.tag.cls,
    surface.tag,
    tones[tone],
  )

export function Tag({
  tone = 'neutral',
  className,
  children,
  ...rest
}: {
  tone?: TagTone
  className?: string
  children: ReactNode
  'aria-hidden'?: boolean
  'data-viz-part'?: string
}) {
  return (
    <span className={cn(tagCls(tone), className)} {...rest}>
      {children}
    </span>
  )
}
