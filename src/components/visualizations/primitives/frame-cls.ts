/**
 * The frame's class string (D1, D4): the raised surface (P: Button.tsx:22),
 * the one hairline (P: designTokens.ts:263), radius 16 from 640 (P:
 * Code.tsx:297) and a full bleed below it, padding 16 (P: mdx.tsx:154).
 * It is the size container `vz` whose width picks the layout variant
 * (`vz-wide`, `vz-narrow`, `vz-xl` in tailwind.config.ts, D19).
 *
 * Its own module so the lazy mount (`Viz.tsx`, the only up-front code) can
 * draw its placeholder with it without pulling in the token module or the
 * class merger. Re-exported from `tokens-v3`.
 */
export const frameCls =
  'not-prose relative m-0 [container:vz/inline-size] -mx-4 border-y border-zinc-700 bg-zinc-800/40 p-4 sm:mx-0 sm:rounded-2xl sm:border-x print:break-inside-avoid print:border-zinc-300 print:bg-zinc-50'
