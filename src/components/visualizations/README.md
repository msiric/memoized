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
- **The dock is measured (D15).** It holds an invisible ghost of every
  caption and checkpoint of every preset, so its height is the worst case
  at the current width and text size. `footprint.ts` only estimates it for
  the client-only placeholder.
- **The motion harness asserts.** `MOTION_STRICT=1 npx playwright test
  e2e/motion` fails on any section 4 flag, more than two animated stage
  glyphs, a Back that does not mirror Next, a tween after an instant
  command, or a settled frame that differs from a slow walk.

Explorables (`form: 'explorable'`, `shell/explorable.ts`) own their controls
and report their footprint directly; their presets still carry step-logs for
the lint, manifest and text alternative. `engines/list-keys/` is the first: its
outcomes are recorded from real React 18 and 19 renders (`truth/`) and
re-verified by `list-keys.truth.test.ts`.

The v1 components below still back the dev gallery and the MDX exports; they
are scheduled to be ported onto the v2 shell.

## Principle

Three concerns stay separate:

- **Data** (what to show) lives in the content lesson.
- **Rendering** (these components) is shared and reused.
- **Look** (theme, spacing, motion) comes from `primitives/tokens.ts`.

Lesson authors pass data and pick a type. They never write layout or pixels.

## Structure

```
primitives/          shared chrome, interaction, and theme (build once)
  tokens.ts          semantic roles -> platform palette/space/motion
  VizFrame.tsx       outer container: border, label, caption
  VizControls.tsx    Reset/Back/Step/Play + progress + counter
  useStepper.ts      step/back/play/keyboard/direction-aware logic
  useMounted.ts      SSR hydration gate (see "Layout stability")
ArrayVisualizer.tsx      arrays and strings (sliding window, two-pointer, ...)
SequenceStepper.tsx      temporal (event loop, call stack, async)
StructureVisualizer.tsx  hierarchical: binary trees, BSTs, heaps (d3-hierarchy)
index.ts                 barrel, registered in ../mdx.tsx
```

`StructureVisualizer` covers hierarchical structures (trees and heaps), laid out
deterministically by `d3-hierarchy`. Arbitrary-graph *structure* is served by the
Mermaid pipeline below; interactive graph traversal (non-deterministic force
layout) is deliberately out of scope until a lesson needs it.

Every component is reviewed side-by-side in the dev-only gallery at
`/dev/visualizations` (gated out of production). Add a specimen there when a new
component lands, so drift is easy to catch.

Static structural and flow diagrams are authored as Mermaid in `diagrams/*.mmd`,
rendered to committed SVG under `public/images/visualizations/` by `yarn
render-diagrams`, and referenced from MDX as
`![alt](/images/visualizations/<slug>.svg)`. See `diagrams/README.md` for the
authoring flow and theme.

## The step-log pattern

An algorithm emits an ordered list of frames (a step-log). A renderer plays it.
Arrays, sequences, trees, and graphs all use this shape, so the interaction model
is identical everywhere. To support a new algorithm, write a step-log generator,
not a new component.

## Adding a visualization to a lesson

```
1. Pick the tool (recorded per lesson in the audit store).
2. Write a one-line viz spec and get it reviewed.
3. Author the DATA (step-log input) or the .mmd source.
4. Reference it: <ArrayVisualizer data={[...]} windowSize={3} /> or the SVG.
5. Verify: tests, SVG well-formed, re-score the visualization dimension.
```

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
- **Gate motion behind `useMounted`.** framer-motion injects client-only inline styles
  that differ from the server HTML. Render static markup on the server and first client
  render, then enable motion after mount, or hydration mismatches force a full client
  re-render.
- **Place transient labels absolutely and uniformly.** Empty/placeholder labels are
  `absolute` overlays (they never travel), and sit in the same slot regardless of
  orientation — the top chip slot, where the first item renders — so an empty call
  stack and an empty queue read identically. Prefer a plain CSS `transition-opacity`
  span over a `motion` component for always-mounted overlays (no hydration risk).



- v2 code consumes `primitives/tokens-v3.ts` and the VDS primitives; the
  token lint enforces it. The v1 files (`tokens.ts`, `VizFrame.tsx`,
  `VizControls.tsx`, `useStepper.ts`) are legacy and excluded from the lint.
- Every interactive visual composes `VizFrame` + `VizControls` + `useStepper`.
- Respect `prefers-reduced-motion`.
- Keep visuals compact and responsive for a lesson page.
- Add a render test and cover step-log correctness.
