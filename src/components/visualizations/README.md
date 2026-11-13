# Lesson visualizations

Reusable, data-driven visual components for interview-prep lessons. Full
rationale in the audit repo's `ADR-001-visualization-framework.md`.

## v2 system (VIZ-01)

The production system from the VIZ-01 design spec (audit repo,
`program-runs/VIZ/2026-11-11-plan/D-DESIGN-SPEC.md`). Lessons embed a visual
only as `<Viz id="event-loop" preset="basic-ordering" />`; the definitions,
step logs and presets live here and are listed at `/viz-manifest.json` for
content CI.

```
Viz.tsx              the lazy mount: the only up-front code (server HTML, then
                     the engine chunk within 800 px of the viewport)
entry-table.ts       id -> [loader, narrow height, wide height] (kept tiny)
registry.ts          id -> descriptor, presets, footprint, text alternative,
                     manifest (React-free)
registry.server.tsx  server renderers for the static Start frame
primitives/          the Visualization Design System (VDS, VIZ-H WS1)
  tokens-v3.ts       the only vocabulary: color roles, type, space, radii,
                     strokes, focus vs now, motion; each value traced to a
                     platform file or an H1 decision (contrast-tested)
  tokens-lint.test.ts  fails on raw hex/rgb, arbitrary sizes and literal
                     durations in shell/, engines/, substrates/, primitives/
  cn.ts              class merging (tailwind-merge, taught the project theme)
  Frame, Button, SegmentedControl, ChoiceRow, Disclosure, Tag, Caption,
  Provenance         the primitives; every state is on the specimen page
                     /dev/visualizations/system (the visual contract)
step-log/            the step-log contract, authoring lint, Node truth harness,
                     pre-computed Shiki tokens (`yarn viz:tokens`)
shell/               StepThrough: frame, dock, scrubber, checkpoints,
                     narration, footprint, motion gate, FLIP moves
  motion.ts          the gate (reduce, instant, epoch, direction, allow),
                     presence() for every stage glyph, motionBudget()
  pace.ts            the shared burst window (250 ms) and Esc rule (D13)
  flip.ts            FLIP moves: instant finish, resize re-measure, lift
substrates/          reusable glyph regions (Lane)
engines/<name>/      model, layout, stage renderer, logs, descriptor
```

Static diagrams (`form: 'static'`, spec §6.4) share the same registry and
mount but ship no client JavaScript: `shell/StaticFigure.tsx` is plain server
markup (title, `role="img"` stage described by "Diagram as text", why-caption,
provenance, print styles), the engine computes every coordinate from data
(`engines/env-records/layout.ts` on the `substrates/box-arrow.ts` geometry),
one SVG per layout width is switched by CSS container queries, and the mount
keeps that HTML on hydration. The chunk is requested only after a client-side
navigation. Each preset lists the programs it draws (verified output) and
claims derived from its data, which `*.truth.test.ts` re-runs in Node.

Adding a visual: write the logs (record `observed.log` from a real run; the
truth test re-runs it), a descriptor and a stage, register it in
`registry.ts`, `registry.server.tsx` and `entry-table.ts` (the registry test
prints the footprint to use), then check it on `/dev/visualizations` and with
`yarn test:e2e`.

### Shell behavior contract (VIZ-H WS2)

- **Instant means instant (D7).** Scrub, Home, End, Restart, a preset switch
  and a burst (two commands inside 250 ms, `shell/pace.ts`) render with
  `gate.instant`. Glyph keys and each `AnimatePresence` are keyed by
  `gate.epoch`, so even a glyph still leaving from an earlier step is gone
  in the next frame; CSS-driven chrome uses `transitionCls.instant`
  (`transition: none` cancels a running transition, removing the class does
  not). FLIP moves finish under the whole stage root.
- **Back mirrors Next (D8).** Render enters and exits with
  `presence(id, gate, { from, to })`: forward a glyph enters from `from` and
  exits toward `to`, Back the reverse. Put the presence `custom` (`{ gate }`,
  plus `present` for moved chips) on the `AnimatePresence`.
- **Two stage glyphs per step.** `motionBudget()` allows at most two glyphs
  (entering, leaving or moving) per step: the step's `focus` first, then
  arrivals, then departures. Chrome (caption, code line, step bar,
  scrubber) is exempt. Ask `animates(gate, id)` before animating a glyph.
- **The lift (D6).** A glyph whose `data-flip-id` changes region renders
  above every lane on an opaque raised backing with the one lift shadow,
  ramped with the move. Nothing else casts a shadow.
- **Geometry in rem (D19).** Author px at the 16 px root and emit through
  `heights()`, `translateY()` or `rem()` (`shell/vars.ts`).
- **The frame picks the variant (D19).** The frame is a size container
  (`vz`); write `vz-wide:` (from 37.875rem, the frame's content at a 768 px
  viewport), `vz-narrow:` and `vz-xl:` (from 53.875rem), never `md:` or
  `xl:`. Under 150 % or 200 % text the frame gets the narrow layout
  wherever the wide one would not fit. Viewport variants stay only for the
  page itself (the frame's bleed and radius, the mount's max width).
- **Segments that do not fit become a select (A2).** `SegmentedControl` is a
  size container; a container query at `segmentedWidth()` (in rem) swaps in
  a native select styled like the platform `Select`. Give its parent the
  width it may use.
- **Code soft-wraps (A4).** Long lines wrap with a hanging indent and a
  continuation hairline; footprints count wrapped rows
  (`shell/code-geometry.ts`), and the window re-measures rows the browser
  drew when the pane is narrower than its variant's minimum.
- **The dock is measured (D15).** It holds an invisible ghost of every
  caption and checkpoint of every preset, so its height is the worst case
  at the current width and text size. `footprint.ts` only estimates it for
  the client-only placeholder. The list-keys explorable's dock works the same way
  (`engines/list-keys/DockGhosts.tsx`, ghosts of its tallest strings).
- **The motion harness asserts.** `MOTION_STRICT=1 npx playwright test
  e2e/motion` fails on any section 4 flag, more than two animated stage
  glyphs, a Back that does not mirror Next, a tween after an instant
  command, or a settled frame that differs from a slow walk.

### Payoff moments (VIZ-H WS4, D21)

Each visual has one designed reveal, the single explicit exception to the
two-glyph budget and the 300 ms cap (`reveal` in `tokens-v3.ts`): at most
800 ms, only on the step that pays the visual off, never on load, landed at
once by Back and by every instant command, a crossfade or nothing under
reduced motion, and it never moves the page. Elements that play it carry
`data-viz-reveal`; the strict motion harness asserts them separately.

- **Event loop.** Next onto the last step (`gate.reveal`) plays the console
  back left to right (`consoleReveal`), then the caption lands leading with a
  recap of this pass's predictions (`recapText`, or a neutral invitation).
  The primary becomes Replay in the same slot (restart, answers kept as
  "last time"); a press inside the reveal is ignored.
- **List keys.** Each carried checkbox lifts out of its Before box (which
  empties), rides its own match line as the line draws behind it, and
  settles into the After box its instance now renders (`CheckRider.tsx`,
  Web Animations, one curve for rider and lines, a single 120 ms settle).
  The checkbox sits on the card edge that faces the lines, so the path never
  crosses row text or an instance letter; a second check leaves only once it
  can no longer meet the first. Instance letters show as their lines arrive;
  the verdict, the ✓ and × in the choice slots, badges and tally fade in
  (160 ms) after the last landing (`reveal.ts` holds the timeline). The key
  and the action are always-visible controls, and under very large text the
  columns stack, Before above After, with the lines in a rail (`stack-css.ts`).
- **Closures.** No script: function objects are focusable and named, and
  hover or focus dims everything but the function's `[[Environment]]` path
  and, in the factory preset, its aliases (`engines/env-records/paths.ts`
  writes the per-figure rules, `.vz-s` in `tailwind.css` the generic dim).

Explorables (`form: 'explorable'`, `shell/explorable.ts`) own their controls
and report their footprint directly; their presets still carry step-logs for
the lint, manifest and text alternative. `engines/list-keys/` is the first: its
outcomes are recorded from real React 18 and 19 renders (`truth/`) and
re-verified by `list-keys.truth.test.ts`.

The v1 components (ArrayVisualizer, SequenceStepper, StructureVisualizer, their
VizFrame/VizControls/useStepper primitives) and the Mermaid pipeline are
retired (VIZ-H D20): no lesson used them, and static diagrams are React SVG on
the box-arrow substrate. The promise-lifecycle seed was cut, not ported: the
R4 register marks it "remove" (a pending/fulfilled/rejected diagram is low
value) in favour of the promise-chain static diagram.

## Principle

Three concerns stay separate:

- **Data** (what to show): step-logs and presets, verified against real runs.
- **Rendering** (these components) is shared and reused.
- **Look** (theme, spacing, motion) comes from `primitives/tokens-v3.ts`.

Lesson authors pick a visual and a preset. They never write layout or pixels.

## Engine layouts (VIZ-H WS3)

- **Width model.** `substrates/text-metrics.ts` measures text without a DOM
  (grapheme clusters; CJK 1 em, emoji 1.25 em). Layouts, footprints and the
  authoring lint all use it, so a string that passes lint fits.
- **Units.** Geometry is authored in px at a 16 px root and emitted in rem
  (`substrates/units.ts`), so a reader's larger text grows every box with it.
- **Overflow policy.** Event-loop queues wrap to a second row, then collapse
  into `+N more`; the console keeps the newest outputs and collapses the
  oldest into `N earlier`. The lint keeps real presets from needing either.
- **Harness hooks.** Env-records boxes carry `data-node`, arrows `data-from`
  and `data-to`; list-keys match lines and state chips carry `data-from` and
  `data-to` row ids.
- **Lint.** `step-log/validate.ts` (`validateStepLog`, `validateDescriptor`),
  `engines/event-loop/lint.ts` and `engines/env-records/lint.ts` measure every
  slot that broke rendering at 320 px.

## The step-log pattern

An algorithm emits an ordered list of frames (a step-log). A renderer plays it.
Arrays, sequences, trees, and graphs all use this shape, so the interaction model
is identical everywhere. To support a new algorithm, write a step-log generator,
not a new component.

## Layout stability (do not skip)

Stepping through frames adds and removes elements every click. Without care, the
surrounding page reflows and jumps under the pointer. Every interactive visual must
hold its footprint perfectly still. The rules, learned the hard way:

- **Reserve from the data's maximum, with a fixed height.** Compute each region's
  size from the deepest frame across the whole step-log and pin it with `height`
  (never `min-height` — a floor still lets the box grow mid-animation). The stage
  size is then frame-independent.
- **Let exiting elements leave layout flow.** Use `<AnimatePresence mode="popLayout">`
  so a chip animating out is taken out of flow and never pushes its siblings.
- **Reserve the caption too (ghost-caption).** Stack every possible caption string as
  invisible copies in one grid cell so the caption box reserves the tallest line and
  the controls below it never move.
- **Render the server markup first.** framer-motion injects client-only inline styles
  that differ from the server HTML. Render static markup on the server and first client
  render, then enable motion after mount, or hydration mismatches force a full client
  re-render.
- **Place transient labels absolutely and uniformly.** Empty/placeholder labels are
  `absolute` overlays (they never travel), and sit in the same slot regardless of
  orientation — the top chip slot, where the first item renders — so an empty call
  stack and an empty queue read identically. Prefer a plain CSS `transition-opacity`
  span over a `motion` component for always-mounted overlays (no hydration risk).



- Code consumes `primitives/tokens-v3.ts` and the VDS primitives; the token
  lint enforces it.
- Every step-through renders through `shell/StepThrough`; explorables use the
  same primitives and report their own footprint.
- Respect `prefers-reduced-motion`.
- Keep visuals compact and responsive for a lesson page.
- Add a render test and cover step-log correctness.
