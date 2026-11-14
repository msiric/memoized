'use client'

import { createElement, useEffect, useRef, useState, useSyncExternalStore, type ComponentType } from 'react'
import { VIZ_TABLE } from './entry-table'
import { frameCls } from './primitives/frame-cls'
import type { VizComponentProps } from './shell/types'

/**
 * `<Viz id preset />`: the only visualization code in a lesson's first-load
 * bundle (budget 1.5 KB gz, spec §6.5).
 *
 * - Server: renders the visual's static Start frame (real HTML plus the
 *   steps-as-text list) through `registry.server`, which is required only
 *   when `window` is undefined, so it never ships to the browser.
 * - Hydration: keeps that server HTML untouched (empty `dangerouslySetInnerHTML`
 *   plus `suppressHydrationWarning`); no engine code runs yet.
 * - Client-only render (soft navigation): a placeholder with the exact
 *   reserved footprint.
 * - Within 800 px of the viewport, or on first focus or pointer contact, the
 *   engine chunk is imported and swapped in at Start: same footprint, so no
 *   layout shift. Focus and an open "Steps as text" survive the swap.
 * - Static figures (entry with per-preset heights) are final server markup:
 *   hydration keeps them and no chunk is ever requested. Only a client-only
 *   render loads the figure's chunk, at once, over a placeholder of the
 *   preset's exact footprint.
 */

type Loaded = ComponentType<VizComponentProps>

const SERVER: Record<string, Loaded> | null =
  typeof window === 'undefined' ? require('./registry.server').VIZ_SERVER : null

const KEEP = { __html: '' }
const subscribe = () => () => {}
const loaded: Record<string, Loaded> = {}

export function Viz({ id, preset }: { id: string; preset?: string }) {
  const entry = VIZ_TABLE[id]
  const hydrating = useSyncExternalStore(
    subscribe,
    () => false,
    () => true,
  )
  const [keep] = useState(hydrating)
  const [Live, setLive] = useState<Loaded | undefined>(() => loaded[id])
  const ref = useRef<HTMLDivElement>(null)
  const restore = useRef<{ focus?: string | null; open?: boolean }>()

  const statics = entry?.[3]
  useEffect(() => {
    const el = ref.current
    if (Live || !entry || !el) return
    if (statics) {
      if (keep) return
      let live = true
      entry[0]().then((mod) => {
        loaded[id] = mod.default
        if (live) setLive(() => mod.default)
      })
      return () => {
        live = false
      }
    }
    let io: IntersectionObserver | undefined
    const stop = () => {
      io?.disconnect()
      el.removeEventListener('focusin', go)
      el.removeEventListener('pointerenter', go)
    }
    function go() {
      stop()
      const active = document.activeElement
      restore.current = {
        focus:
          el && active && el.contains(active)
            ? active.closest('[data-viz-focus]')?.getAttribute('data-viz-focus')
            : null,
        open: el?.querySelector('details')?.open,
      }
      entry[0]().then((mod) => {
        loaded[id] = mod.default
        setLive(() => mod.default)
      })
    }
    if (typeof IntersectionObserver === 'undefined') go()
    else {
      io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && go(), { rootMargin: '800px 0px' })
      io.observe(el)
      el.addEventListener('focusin', go)
      el.addEventListener('pointerenter', go)
    }
    return stop
  }, [Live, entry, id, keep, statics])

  useEffect(() => {
    const r = restore.current
    const el = ref.current
    if (!Live || !r || !el) return
    restore.current = undefined
    if (r.open) el.querySelector('details')?.setAttribute('open', '')
    if (r.focus) el.querySelector<HTMLElement>(`[data-viz-focus="${r.focus}"]`)?.focus()
  }, [Live])

  if (!entry) return null
  const sized: Record<string, readonly number[]> | undefined = statics ?? entry[4]
  const row = (sized && (sized[preset ?? ''] ?? Object.values(sized)[0])) || [entry[1], entry[2]]
  // Static figures: [narrow, wide, col]. Step-throughs: [narrow, wide, small,
  // tight, tighter] (Q16: each narrow band reserves its narrowest layout).
  const [narrow, wide] = row
  const col = statics ? row[2] : wide
  const small = statics ? narrow : (row[2] ?? narrow)
  const tight = statics ? narrow : (row[3] ?? small)
  const tighter = statics ? narrow : (row[4] ?? tight)
  return (
    <div ref={ref} data-viz={id} className="my-8">
      {Live ? (
        <Live preset={preset} />
      ) : SERVER?.[id] ? (
        <div data-viz-ssr="">{createElement(SERVER[id], { preset, interactive: false })}</div>
      ) : keep ? (
        <div data-viz-ssr="" suppressHydrationWarning dangerouslySetInnerHTML={KEEP} />
      ) : (
        <div
          aria-hidden
          data-viz-placeholder=""
          className={frameCls}
          // In rem, so the reserve follows the reader's text size like the frame (D19).
          style={{
            ['--vz-n' as string]: `${narrow / 16}rem`,
            ['--vz-w' as string]: `${wide / 16}rem`,
            ['--vz-c' as string]: `${col / 16}rem`,
            ['--vz-s' as string]: `${small / 16}rem`,
            ['--vz-t' as string]: `${tight / 16}rem`,
            ['--vz-u' as string]: `${tighter / 16}rem`,
          }}
        >
          {/* The frame is the variant's size container, so the reserve sits inside
              it: the footprint less the frame's 1rem padding and 1 px borders.
              The narrow bands are the content width in rem (`footprint.ts`
              BANDS: 19.3125, 15.875, 12.875); `vz-col` is the full lesson
              column (static figures, INTEG 4). */}
          <div className="h-[calc(var(--vz-u)-2rem-2px)] [@container_vz_(min-width:12.875rem)_and_(max-width:15.874rem)]:h-[calc(var(--vz-t)-2rem-2px)] [@container_vz_(min-width:15.875rem)_and_(max-width:19.312rem)]:h-[calc(var(--vz-s)-2rem-2px)] [@container_vz_(min-width:19.3125rem)_and_(max-width:37.874rem)]:h-[calc(var(--vz-n)-2rem-2px)] vz-wide:h-[calc(var(--vz-w)-2rem-2px)] vz-col:h-[calc(var(--vz-c)-2rem-2px)]" />
        </div>
      )}
    </div>
  )
}
