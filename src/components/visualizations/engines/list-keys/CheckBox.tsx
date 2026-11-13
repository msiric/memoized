import type { InputHTMLAttributes } from 'react'
import { cn as clsx } from '../../primitives/cn'
import { radius, strokeWidth, transitionCls } from '../../primitives/tokens-v3'

/**
 * The list-keys checkbox, real (a Before row) or drawn (an After row and the
 * rider), in one look: a 16 px box with 4 px corners, a 1 px `line` edge when
 * empty (drift N07), zinc-100 with a dark tick when checked.
 *
 * Print (H3 R10, R1 correctness R1): the checked state is ink, not a fill, so
 * it survives "no backgrounds": a dark edge and a dark tick on paper.
 */

export const CHECK_PATH = 'M3.5 8.5 6.5 11.5 12.5 5'

const box = clsx('flex h-4 w-4 shrink-0 items-center justify-center border', radius.chip.cls)
export const checkedBoxCls = 'border-zinc-100 bg-zinc-100 print:border-zinc-900 print:bg-transparent'
const emptyBoxCls = 'border-zinc-500 bg-transparent print:border-zinc-900'

export function Tick({ className }: { className?: string }) {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" className={clsx('text-zinc-900', className)}>
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
        settle?: boolean
        state?: never
      }
    | {
        /** A drawn box (After): `?` unknown (dashed), `slot` an empty socket for a landing check. */
        state: boolean | '?' | 'slot'
        settle?: boolean
        input?: never
        shown?: never
      },
) {
  if (props.input) {
    const { className, ...input } = props.input
    return (
      <span className="relative flex h-4 w-4 shrink-0" data-lk-check>
        <input
          type="checkbox"
          {...input}
          className={clsx(
            'peer m-0 h-4 w-4 cursor-[inherit] appearance-none border outline-none',
            radius.chip.cls,
            // The check fades back in (the Before snapshot returns with the
            // verdict) but leaves at once: the rider takes it in the same frame.
            props.shown && transitionCls.feedback,
            props.shown ? checkedBoxCls : emptyBoxCls,
            className,
          )}
        />
        <Tick
          className={clsx(
            'pointer-events-none absolute inset-0',
            props.settle && props.shown && transitionCls.highlight,
            props.shown ? 'opacity-100' : 'opacity-0',
          )}
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
          ? 'border-dashed border-zinc-500'
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
