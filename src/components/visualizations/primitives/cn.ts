import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge, validators } from 'tailwind-merge'

/**
 * Class merging for the visualization primitives (VIZ-H decision 2, drift
 * D08): a `className` passed to a primitive overrides the primitive's own
 * class of the same group (`text-xs` beats the base `text-sm`, `px-0` beats
 * `px-3`) instead of losing to CSS source order.
 *
 * The merger is taught this project's theme: the custom `text-2xs` size
 * (`tailwind.config.ts`), the `brightness-98` press step and the `vz-frame`
 * color, so none of them is mistaken for a color or dropped.
 *
 * tailwind-merge 3 follows Tailwind 4, where a bare `outline` is a width. In
 * this project's Tailwind 3 it is the solid style, so it moves back to the
 * style group (otherwise `outline outline-2` would lose `outline`).
 */
const merge = extendTailwindMerge({
  override: {
    classGroups: {
      'outline-style': [{ outline: ['', 'dashed', 'dotted', 'double', 'none', 'hidden'] }],
      'outline-w': [{ outline: [validators.isNumber, validators.isArbitraryLength] }],
    },
  },
  extend: {
    classGroups: {
      'font-size': [{ text: ['2xs'] }],
      brightness: [{ brightness: ['98'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs))
}
