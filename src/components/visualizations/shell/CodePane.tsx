import clsx from 'clsx'
import type { CodeToken, StepLine } from '../step-log/types'
import { transitionCls } from '../primitives/tokens-v2'
import { LINE } from './footprint'
import type { PerVariant } from './types'
import { H_CLS, TRANSLATE_Y_CLS, heights, translateY } from './vars'

/**
 * Code pane with line sync (spec §5.5). Reuses the lesson code-block surface
 * (zinc-900, mono 13/24). The current line gets a 3 px `now` bar, a 10 % `now`
 * background and a ▸ in the gutter, in the same frame as the stage. Windowed
 * panes keep the current line centred by translating the list; the pane never
 * scrolls, and neither does the page.
 */

export const CODE_PAD = 8
/** A 16 px status line under the code (plus the bottom padding), so the host note never covers code. */
export const CODE_STATUS = 16

export function codePaneHeight(rows: number): number {
  return rows * LINE + 2 * CODE_PAD + CODE_STATUS
}

/** Rows to translate so `anchor` (1-based) sits in the middle of a `rows`-tall window. */
export function windowOffset(anchor: number | undefined, total: number, rows: number): number {
  if (!anchor || total <= rows) return 0
  const top = anchor - 1 - Math.floor((rows - 1) / 2)
  return Math.max(0, Math.min(total - rows, top))
}

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
  const current =
    from > 0 ? (from === to ? `line ${from}` : `lines ${from} to ${to}`) : line === 'host' ? 'host' : 'none'
  return (
    <div
      data-viz-region="code"
      className={clsx(
        'relative overflow-hidden rounded-lg bg-zinc-900 font-mono text-[13px] print:border print:border-zinc-300',
        // From 768 the pane is exactly as wide as the widest line of any preset
        // (gutter 8 + marker 12 + number 24 + 8), so presets never move the stage.
        cols && 'md:w-[calc(var(--vz-cols)*1ch+52px)] xl:w-auto',
        // From 768 the pane hugs this preset's code and sits at the top.
        'md:self-start',
        H_CLS,
      )}
      style={heights(
        height ?? { narrow: codePaneHeight(rows.narrow), wide: codePaneHeight(rows.wide) },
        cols ? { ['--vz-cols' as string]: String(cols) } : undefined,
      )}
    >
      <ol
        aria-label={`Code, current: ${current}`}
        className={clsx('m-0 list-none p-0', TRANSLATE_Y_CLS, animate && transitionCls.highlight)}
        style={translateY(offset, { paddingTop: CODE_PAD, paddingBottom: CODE_PAD })}
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
                'relative flex h-6 items-center pl-2 pr-2',
                animate && transitionCls.highlight,
                active ? 'bg-lime-400/10' : 'bg-transparent',
              )}
            >
              <span
                aria-hidden
                className={clsx('absolute inset-y-0 left-0 w-[3px]', active ? 'bg-lime-400' : 'bg-transparent')}
              />
              <span aria-hidden className="w-3 shrink-0 select-none font-mono text-[12px] leading-6 text-lime-400">
                {active && n === from ? '▸' : ''}
              </span>
              <span
                aria-hidden
                className="hidden w-6 shrink-0 select-none pr-2 text-right font-mono text-[12px] tabular-nums leading-6 text-zinc-400 md:inline"
              >
                {n}
              </span>
              <code className="min-w-0 whitespace-pre bg-transparent p-0 font-mono text-[12px] leading-6 text-zinc-100 xs:text-[13px]">
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 flex items-start justify-end bg-zinc-900 px-2"
        style={{ height: CODE_STATUS + CODE_PAD }}
      >
        <span
          className={clsx('font-sans text-[12px] leading-4 text-zinc-400', line === 'host' ? 'visible' : 'invisible')}
        >
          host: not a line of your code
        </span>
      </div>
    </div>
  )
}
