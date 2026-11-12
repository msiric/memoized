'use client'

import { createElement, useEffect, useRef, useState, useSyncExternalStore, type ComponentType } from 'react'
import { VIZ_TABLE } from './entry-table'
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
  const [narrow, wide] = (statics && (statics[preset ?? ''] ?? Object.values(statics)[0])) || [entry[1], entry[2]]
  return (
    <div ref={ref} data-viz={id} className={statics ? 'my-8' : 'my-8 xl:max-w-[960px]'}>
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
          className="-mx-4 h-[var(--vz-n)] border-y border-zinc-700/60 bg-zinc-800/40 sm:mx-0 sm:rounded-xl sm:border-x md:h-[var(--vz-w)]"
          style={{ ['--vz-n' as string]: `${narrow}px`, ['--vz-w' as string]: `${wide}px` }}
        />
      )}
    </div>
  )
}
