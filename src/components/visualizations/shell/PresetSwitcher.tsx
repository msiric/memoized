'use client'

import clsx from 'clsx'
import { useRef, type KeyboardEvent } from 'react'
import { transitionCls } from '../primitives/tokens-v2'

/**
 * Preset switcher (spec §5.1): a quiet segmented control for 2 or 3 presets,
 * a native select for more. It reads as secondary to the title: a 32 px
 * track with 28 px segments, while each segment keeps a 44 px hit area and
 * 8 px between targets. The selected segment is filled and outlined
 * (3:1 against the track), not only recolored. One tab stop; arrows move and
 * select. Switching resets to Start instantly.
 */
export function PresetSwitcher({
  presets,
  value,
  onChange,
  interactive,
}: {
  presets: readonly { id: string; label: string }[]
  value: number
  onChange: (index: number) => void
  interactive: boolean
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  if (presets.length < 2) return null

  if (presets.length > 3) {
    return (
      <select
        aria-label="Example"
        data-viz-own-keys
        disabled={!interactive}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 rounded-[10px] border border-zinc-600 bg-zinc-900 px-3 text-[13px] text-zinc-100 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
      >
        {presets.map((p, i) => (
          <option key={p.id} value={i}>
            {p.label}
          </option>
        ))}
      </select>
    )
  }

  const move = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const delta =
      e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const n = (i + delta + presets.length) % presets.length
    onChange(n)
    refs.current[n]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label="Example"
      data-viz-own-keys
      className="relative flex h-11 items-center gap-2 px-0.5"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 inset-y-1.5 rounded-[10px] bg-zinc-900/70 ring-1 ring-inset ring-zinc-700/60"
      />
      {presets.map((p, i) => {
        const checked = i === value
        return (
          <button
            key={p.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={interactive && checked ? 0 : -1}
            onClick={() => interactive && onChange(i)}
            onKeyDown={(e) => move(e, i)}
            className="group relative flex h-11 items-center outline-none"
          >
            <span
              className={clsx(
                'flex h-7 items-center whitespace-nowrap rounded-lg px-3 text-[13px] leading-5',
                transitionCls.feedback,
                'group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-lime-400',
                checked
                  ? 'bg-zinc-700 font-semibold text-zinc-50 ring-1 ring-inset ring-zinc-500'
                  : 'font-medium text-zinc-300 group-hover:text-zinc-50',
              )}
            >
              {p.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
