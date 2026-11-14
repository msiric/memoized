/**
 * The frame's class string (D1, D4, R2): the platform card, a white/10 edge
 * on the raised surface (P: Button.tsx:22,26: `bg-zinc-800/40`,
 * `ring-white/10`), radius 16, in the lesson column like the code blocks
 * and Notes beside it from a 375 px phone up (P: Code.tsx:297; H3 R2 Q6: no
 * bleed on phones, no breakout above 1280), padding 16 (P: mdx.tsx:154).
 * Below 375 (a 320 px phone) the frame still bleeds to the viewport edges
 * with square corners: the static figures are laid out for 288 px of
 * content and do not fit the 254 px an inset frame leaves there (open with
 * the lead; F3 can drop this once env-records lays out at 254).
 * Print (Q6): the frame may break across pages between its regions; each
 * region avoids a break inside (the print rules in `src/styles/tailwind.css`),
 * so a page never ends in a blank half.
 * It is the size container `vz` whose width picks the layout variant
 * (`vz-wide`, `vz-narrow`, `vz-col`, `vz-tight` in tailwind.config.ts, D19).
 *
 * Its own module so the lazy mount (`Viz.tsx`, the only up-front code) can
 * draw its placeholder with it without pulling in the token module or the
 * class merger. Re-exported from `tokens-v3`.
 */
export const frameCls =
  'not-prose relative m-0 [container:vz/inline-size] -mx-4 border-y border-white/10 bg-zinc-800/40 p-4 xs:mx-0 xs:rounded-2xl xs:border-x print:border-zinc-300 print:bg-zinc-50'
