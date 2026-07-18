'use client'

import clsx from 'clsx'
import type { ReactNode } from 'react'
import { viz } from './tokens'

/**
 * The shared outer chrome for every visualization: a themed frame with an
 * optional label, the stage (children), an optional caption, and a controls
 * slot. Owning the vertical rhythm here keeps all visuals framed identically.
 *
 * When `captionReserve` (all possible caption strings) is provided, the caption
 * area reserves the height of the TALLEST note by stacking every note as an
 * invisible ghost in one grid cell. This keeps the caption, and therefore the
 * controls below it, from moving as the step changes. No JS measurement, and it
 * works responsively at any width.
 */

export type VizFrameProps = {
  children: ReactNode
  label?: string
  caption?: ReactNode
  captionReserve?: string[]
  controls?: ReactNode
  /** Keyboard/focus props from `useStepper().containerProps`. */
  containerProps?: Record<string, unknown>
}

export function VizFrame({ children, label, caption, captionReserve, controls, containerProps }: VizFrameProps) {
  const hasCaption = caption !== undefined && caption !== null
  const reserve = captionReserve && captionReserve.length > 0
  return (
    <div className={`${viz.frame} outline-none focus-visible:ring-2 focus-visible:ring-lime-500/60`} {...containerProps}>
      {label ? <p className={viz.label}>{label}</p> : null}
      {children}
      {hasCaption ? (
        reserve ? (
          <div className="mt-3 grid">
            {captionReserve.map((c, i) => (
              <p key={i} aria-hidden className={clsx(viz.caption, 'invisible col-start-1 row-start-1 m-0')}>
                {c}
              </p>
            ))}
            <p className={clsx(viz.caption, 'col-start-1 row-start-1 m-0 h-full')} data-testid="narration">
              {caption}
            </p>
          </div>
        ) : (
          <p className={clsx('mt-3', viz.caption)} data-testid="narration">
            {caption}
          </p>
        )
      ) : null}
      {controls ? <div className="mt-3">{controls}</div> : null}
    </div>
  )
}
