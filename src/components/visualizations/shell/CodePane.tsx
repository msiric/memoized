import { useEffect, useLayoutEffect, useRef, type CSSProperties, type RefObject } from 'react'
import { cn as clsx } from '../primitives/cn'
import type { CodeToken, StepLine } from '../step-log/types'
import { radius, transitionCls, type as typeScale } from '../primitives/tokens-v3'
import { CODE_GUTTER, CODE_PAD, CODE_STATUS, HANG, codePaneHeight, lineIndent, windowOffset } from './code-geometry'
import { LINE } from './footprint'
import type { PerVariant } from './types'
import { H_CLS, TRANSLATE_Y_CLS, heights, rem, translateY } from './vars'

/**
 * Code pane with line sync (spec §5.5). Reuses the lesson code-block surface
 * (zinc-900, mono 13/24, P: Code.tsx:297) with the one hairline as its edge (D4). The
 * current line gets a 2 px `now` bar, a 10 % `now`
 * background and a ▸ in the gutter, in the same frame as the stage. Windowed
 * panes keep the current line centred by translating the list; the pane never
 * scrolls, and neither does the page.
 *
 * The window clips at whole rows (F6): the list sits in a viewport exactly
 * `rows` lines tall, with the pane's padding outside it, so no part of the
 * previous or next line ever shows in the padding.
 *
 * Soft wrap (A4): a line wider than the pane wraps, and its continuation rows
 * hang after the gutter, indented two columns past the line's own indent,
 * with a hairline in the marker column beside them.
 * The current-line highlight covers every row of the line. Footprints count
 * wrapped rows at each variant's narrowest pane (`codeRows`), so real data
 * never needs more; when the pane is narrower than that (large text in a
 * narrow lesson column), the window measures the rows the browser drew and
 * keeps the anchor line in view, still at whole rows. The lint keeps
 * authored lines short (authoring guidance), so real presets do not wrap at
 * the default text size.
 */

export * from './code-geometry'

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export type CodePaneProps = {
  lines: readonly string[]
  tokens?: readonly (readonly CodeToken[])[]
  line?: StepLine
  /** The last real line up to this step, so the window holds still on host steps. */
  anchor?: number
  rows: PerVariant<number>
  /** Overrides the pane height (e.g. stretched to the stage); defaults to the rows. */
  height?: PerVariant<number>
  /** Widest line over every preset: fixes the pane width from 768 px. */
  cols?: number
  animate: boolean
}

export function CodePane({ lines, tokens, line, anchor, rows, height, cols, animate }: CodePaneProps) {
  const [from, to] = typeof line === 'number' ? [line, line] : Array.isArray(line) ? line : [0, -1]
  const offset: PerVariant<number> = {
    narrow: -windowOffset(anchor, lines.length, rows.narrow) * LINE,
    wide: -windowOffset(anchor, lines.length, rows.wide) * LINE,
  }
  // The window is always `rows` whole lines, so wrapped rows have room and
  // the clip never cuts a row (F6).
  const windowRows: PerVariant<number> = { narrow: rows.narrow * LINE, wide: rows.wide * LINE }
  const view = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLOListElement>(null)
  useWindow(view, list, anchor, lines)
  const current =
    from > 0 ? (from === to ? `line ${from}` : `lines ${from} to ${to}`) : line === 'host' ? 'host' : 'none'
  return (
    <div
      data-viz-region="code"
      className={clsx(
        'relative overflow-hidden bg-zinc-900 ring-1 ring-zinc-700 print:border print:border-zinc-300',
        radius.row.cls,
        typeScale.code.cls,
        // From 768 the pane is exactly as wide as the widest line of any preset
        // plus the gutter, so presets never move the stage.
        cols && 'vz-wide:w-[calc(var(--vz-cols)*1ch+var(--vz-gutter))] vz-xl:w-auto',
        // From 768 the pane hugs this preset's code and sits at the top.
        'vz-wide:self-start',
        H_CLS,
      )}
      style={heights(
        height ?? { narrow: codePaneHeight(rows.narrow), wide: codePaneHeight(rows.wide) },
        cols ? { ['--vz-cols' as string]: String(cols), ['--vz-gutter' as string]: rem(CODE_GUTTER) } : undefined,
      )}
    >
      <div
        data-viz-part="code-window"
        ref={view}
        className={clsx('overflow-y-clip', H_CLS)}
        style={heights(windowRows, { marginTop: rem(CODE_PAD) })}
      >
        <ol
          ref={list}
          aria-label={`Code, current: ${current}`}
          className={clsx('m-0 list-none p-0', TRANSLATE_Y_CLS, animate ? transitionCls.highlight : transitionCls.instant)}
          style={translateY(offset)}
        >
          {lines.map((text, i) => {
            const n = i + 1
            const active = n >= from && n <= to
            return (
              <li
                key={i}
                aria-current={active ? 'true' : undefined}
                data-line={n}
                className={clsx(
                  'relative flex min-h-6 items-start pl-2 pr-2',
                  animate ? transitionCls.highlight : transitionCls.instant,
                  active ? 'bg-lime-400/10' : 'bg-transparent',
                )}
              >
                <span
                  aria-hidden
                  className={clsx(
                    'absolute inset-y-0 left-0 w-0.5',
                    active ? 'bg-lime-400 print:bg-lime-700' : 'bg-transparent',
                  )}
                />
                {/* Continuation rows of a wrapped line: a hairline under the marker
                    column, so a wrapped row never reads as a line of its own (A4). */}
                <span aria-hidden className="absolute bottom-1.5 left-3.5 top-6 w-px bg-zinc-700" />
                <span aria-hidden className="w-3 shrink-0 select-none font-mono text-2xs leading-6 text-lime-400">
                  {active && n === from ? '▸' : ''}
                </span>
                <span
                  aria-hidden
                  className="hidden w-6 shrink-0 select-none pr-2 text-right font-mono text-2xs tabular-nums leading-6 text-zinc-400 vz-wide:inline"
                >
                  {n}
                </span>
                <code
                  className={clsx(
                    'min-w-0 flex-1 whitespace-pre-wrap bg-transparent p-0 text-zinc-100 [overflow-wrap:anywhere]',
                    // The hanging indent: continuation rows start past the line's own indent.
                    'pl-[var(--vz-hang)] [text-indent:calc(-1*var(--vz-hang))]',
                    typeScale.code.cls,
                  )}
                  style={{ ['--vz-hang' as string]: `${lineIndent(text) + HANG}ch` } as CSSProperties}
                >
                  {tokens?.[i]
                    ? tokens[i].map((t, k) => (
                        <span key={k} style={t.color ? { color: t.color } : undefined}>
                          {t.text}
                        </span>
                      ))
                    : text || ' '}
                </code>
              </li>
            )
          })}
        </ol>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 flex items-start justify-end bg-zinc-900 px-2"
        style={{ height: rem(CODE_STATUS + CODE_PAD) }}
      >
        <span className={clsx('font-sans text-2xs leading-4 text-zinc-400', line === 'host' ? 'visible' : 'invisible')}>
          host: not a line of your code
        </span>
      </div>
    </div>
  )
}

/**
 * Keeps the anchor line in the window by the rows the browser drew (A4): the
 * server places the window by source lines, which is exact unless a line
 * wraps. After layout, and whenever the pane's width or the text size
 * changes, the list is placed again at whole rows with the anchor row where
 * `windowOffset` puts it. A re-measure snaps (D7); a step change takes the
 * list's own transition.
 */
function useWindow(
  view: RefObject<HTMLDivElement>,
  list: RefObject<HTMLOListElement>,
  anchor: number | undefined,
  lines: readonly string[],
) {
  useIsoLayoutEffect(() => {
    const v = view.current
    const ol = list.current
    if (!v || !ol) return
    const place = (snap: boolean) => {
      const first = ol.firstElementChild as HTMLElement | null
      const code = first?.querySelector('code')
      if (!first || !code) return
      const row = parseFloat(getComputedStyle(code).lineHeight)
      if (!row) return
      const rows = Math.round(v.clientHeight / row)
      const total = Math.round(ol.scrollHeight / row)
      const a = anchor ? (ol.children[anchor - 1] as HTMLElement | undefined) : undefined
      let top = 0
      if (a && total > rows) {
        const at = Math.round((a.offsetTop - first.offsetTop) / row)
        top = Math.max(0, Math.min(total - rows, at - Math.floor((rows - 1) / 2)))
      }
      if (snap) ol.style.transition = 'none'
      ol.style.transform = `translateY(${-top * row}px)`
      if (snap) {
        void ol.offsetHeight
        ol.style.transition = ''
      }
    }
    place(false)
    if (typeof ResizeObserver === 'undefined') return
    let width = v.clientWidth
    let size = getComputedStyle(ol).fontSize
    const ro = new ResizeObserver(() => {
      const f = getComputedStyle(ol).fontSize
      if (v.clientWidth === width && f === size) return
      width = v.clientWidth
      size = f
      place(true)
    })
    ro.observe(v)
    return () => ro.disconnect()
  }, [anchor, lines])
}
