import type { CSSProperties, InputHTMLAttributes } from 'react'
import { cn as clsx } from '../../primitives/cn'
import { radius, stroke, strokeWidth, transitionCls } from '../../primitives/tokens-v3'

/**
 * The list-keys checkbox, real (a Before row) or drawn (an After row and the
 * rider), in one look: a 16 px box with 4 px corners, a 1 px `line` edge when
 * empty (drift N07), zinc-100 with a dark tick when checked.
 *
 * Print (H3 R10, R1 correctness R1): the checked state is ink, not a fill, so
 * it survives "no backgrounds": a dark edge and a dark tick on paper.
 *
 * History (R2M-15): after a reveal the Before column is the starting state,
 * a record. Its checked boxes show a quiet check (the empty box's `line`
 * edge with a muted tick, no fill), so the solid check reads as the live
 * state where it landed and the Before check never reads as a copy of it.
 * It is still visibly checked, as the input is.
 */

export const CHECK_PATH = 'M3.5 8.5 6.5 11.5 12.5 5'

const box = clsx('flex h-4 w-4 shrink-0 items-center justify-center border', radius.chip.cls)
export const checkedBoxCls = 'border-zinc-100 bg-zinc-100 print:border-zinc-900 print:bg-transparent'
const emptyBoxCls = 'border-zinc-500 bg-transparent print:border-zinc-900'
/** The tick on a checked box, and the muted tick of a history box (`svgInk.muted`). */
const tickCls = 'text-zinc-900'
const historyTickCls = 'text-zinc-400 print:text-zinc-900'

export function Tick({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" className={clsx(tickCls, className)} style={style}>
      <path d={CHECK_PATH} fill="none" stroke="currentColor" strokeWidth={strokeWidth.mark} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { 'data-viz-focus'?: string }

export function CheckBox(
  props:
    | {
        /** A real checkbox (Before): `shown` is what it draws (empty while its check rides). */
        input: InputProps
        shown: boolean
        /** Drawn as the starting state's record (after a reveal), with its own transition timing. */
        history?: { on: boolean; style?: CSSProperties }
        state?: never
      }
    | {
        /** A drawn box (After): `?` unknown (dashed), `slot` an empty socket for a landing check. */
        state: boolean | '?' | 'slot'
        input?: never
        shown?: never
        history?: never
      },
) {
  if (props.input) {
    const { className, ...input } = props.input
    const history = props.history?.on ?? false
    // The check leaves at once (the rider takes it in the same frame) and
    // returns as history on the sequence's last beat (`history.style`).
    const style = props.shown ? props.history?.style : undefined
    return (
      <span className="relative flex h-4 w-4 shrink-0" data-lk-check data-lk-history={(history && props.shown) || undefined}>
        <input
          type="checkbox"
          {...input}
          className={clsx(
            'peer m-0 h-4 w-4 cursor-[inherit] appearance-none border outline-none',
            radius.chip.cls,
            props.shown && transitionCls.feedback,
            props.shown && !history ? checkedBoxCls : emptyBoxCls,
            className,
          )}
          style={style}
        />
        <Tick
          className={clsx(
            'pointer-events-none absolute inset-0',
            props.shown && 'transition-[color,opacity] motion-reduce:transition-none',
            props.shown ? 'opacity-100' : 'opacity-0',
            history && historyTickCls,
          )}
          style={style}
        />
      </span>
    )
  }
  const { state } = props
  return (
    <span
      aria-hidden
      data-check
      data-lk-check
      className={clsx(
        box,
        state === '?'
          ? clsx('border-dashed', stroke.line)
          : state === 'slot'
            ? 'border-transparent'
            : state
              ? checkedBoxCls
              : emptyBoxCls,
      )}
    >
      {state === true ? <Tick /> : null}
    </span>
  )
}
