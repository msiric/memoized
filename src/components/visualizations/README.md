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
