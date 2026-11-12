import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn'
import { frameCls } from './tokens-v3'

/**
 * The single frame shell of every visualization (D1, D17, drift X01): the
 * raised surface (zinc-800/40), the one hairline, radius 16 from 640 and a
 * full bleed below it, padding 16. Step-throughs and explorables render a
 * `section`, static diagrams a `figure`, and the lazy mount a sized
 * placeholder `div` with the same box.
 */

export type FrameProps = HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'figure' | 'div'
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export const Frame = forwardRef<HTMLElement, FrameProps>(function Frame(
  { as: Tag = 'section', className, ...rest },
  ref,
) {
  return <Tag ref={ref as never} className={cn(frameCls, className)} {...rest} />
})
