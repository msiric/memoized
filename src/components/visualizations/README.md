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
                     strokes, focus vs changed vs now (Q9), motion; each
                     value traced to a
                     platform file or an H1 decision (contrast-tested)
  tokens-lint.test.ts  fails on raw hex/rgb, arbitrary sizes, literal
                     durations, literal SVG strokes and radii and off-palette
                     colors anywhere in this folder and in the .vz-* rules
                     of src/styles/tailwind.css (see "Gates")
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

The closures figure's one interaction, tracing what a function remembers, is
CSS the server writes per figure (`engines/env-records/paths.ts`), with no
script and no dimming (G ruling 1):

- **Who lights it.** Hover and keyboard focus (`:focus-visible`) where the
  reader can hover; a tap (`:focus`) where they cannot. A second tap on the
  lit function puts it down: while focused it lets taps through to the
  figure, which cannot take focus, so the tap blurs it (R2M-16). Hover rules
  stay out of touch browsers, which keep `:hover` on what was tapped. On
  real iOS this relies on the figure counting as clickable (`cursor:
  pointer` under `hover: none`); the e2e test covers emulated Chromium and
  WebKit only.
- **What lights.** The function, its link and that link's label (`data-o`
  names the label's owner, R2M-14), the record, the row it reads, its
  aliases. Links are labelled with one word at every width, `env` and
  `outer` (the text alternative spells out `[[Environment]]`).
- **Where.** Screen only: paper never shows a trace. In print the drawing
  is one region (`break-inside: avoid` on the stage, the title kept with
  it), so a frame may break before its caption or text alternative but
  never through the drawing, whose height is fixed.
- **Unused records** are hatched, with a clear plate under every run of
  text (`platesPath` in `substrates/box-arrow.ts`), so the hatch never runs
  through a letter (R16).
- **No `:has()`** (Firefox before 121): the figure stays static and
  complete; only the trace is missing.

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
- **Three beats per step (H3 R2 Q1).** A paced step plays in order, 560 ms
  at most (`STEP_BEATS` in `tokens-v3.ts`, `gate.beats`): (1) the code line
  highlights (120 ms); (2) the moving glyph travels on the `move` spring,
  keeping its own colors under the lift until it settles (`flip.ts`); (3)
  the console line and the caption land (`land`, 160 ms). Until beat 3 the
  previous step's name and caption hold. Back plays the beats in reverse.
  Bursts, scrubs and instant paths are instant; reduced motion crossfades
  with no beats. Stage glyphs pass `{ beat: 'glyph' | 'land' }` to
  `presence()`; the strict motion gate asserts the order.
- **Two stage glyphs per step.** `motionBudget()` allows at most two glyphs
  (entering, leaving or moving) per step: the step's `focus` first, then
  arrivals, then departures. Chrome (caption, code line, step bar,
  scrubber) is exempt. Ask `animates(gate, id)` before animating a glyph.
  One exception (R1M-13): a glyph leaving the place a moving glyph arrives
  at fades in place on the 100 ms `vacate` token (`gate.vacate`, from the
  introspection's `region`), so it never vanishes under the arrival.
- **The lift (D6).** A glyph whose `data-flip-id` changes region renders
  above every lane on an opaque raised backing with the one lift shadow,
  ramped with the move. Nothing else casts a shadow.
- **Geometry in rem (D19).** Author px at the 16 px root and emit through
  `heights()`, `translateY()` or `rem()` (`shell/vars.ts`).
- **In the lesson column (H3 R2 Q6).** Every frame stays in the lesson's 800
  px column at every width, with the code-block inset and radius 16 below
  640 too: no breakout, no bleed. On paper it breaks between regions, never
  inside one.
- **The frame picks the variant (D19).** The frame is a size container
  (`vz`); write `vz-wide:` (from 37.875rem, the frame's content at a 768 px
  viewport), `vz-narrow:`, `vz-col:` (from 47.875rem, the full lesson
  column) and `vz-tight:` (under 17.875rem), never `md:` or `xl:`. Under 150 % or 200 % text the frame gets the narrow layout
  wherever the wide one would not fit. Without container-query support
  (Safari before 16, Firefox before 110, Q17) the default classes are the
  narrow layout, a segmented control shows only its select and the scrubber
  thumb is placed by `left` (`src/styles/tailwind.css`).
- **Segments that do not fit become a select (A2).** `SegmentedControl` is a
  size container; a container query at `segmentedWidth()` (in rem) swaps in
  a native select styled like the platform `Select`. Give its parent the
  width it may use. More than `maxSegments` options (default 3) always
  render the select; the list-keys action raises it to 4 (H3 R8).
- **Code soft-wraps (A4).** Long lines wrap with a hanging indent and a
  continuation hairline; footprints count wrapped rows
  (`shell/code-geometry.ts`), and the window re-measures rows the browser
  drew when the pane is narrower than its variant's minimum.
- **The dock is measured (D15, R2).** It holds an invisible ghost of every
  caption and checkpoint of the preset on screen, so its height is that
  preset's worst case at the current width and text size. Every reserved
  band (stage, dock) is sized per preset: a preset switch may change the
  frame's height, stepping never does. The entry table carries per-preset
  heights for the lazy mount; `footprint.ts` only estimates them. The
  list-keys dock works the same way (`engines/list-keys/DockGhosts.tsx`, a
  ghost of every verdict). Nothing reserves a band no state needs (F1 and F2
  rulings 2): stacked, Skip's target rises into the step bar so the prompt
  row is one line, the feedback takes the full row, and checkpoint copy
  fits one line on a 375 px phone; the list-keys verdict is two short
  sentences, with its tally in the action row.
- **Checkpoints (D9, R4, H3 R2 Q2 to Q5).** One layout for every visual
  (`primitives/Checkpoint.tsx`: `CheckpointBlock`, `PromptBlock`,
  `SkipButton`, geometry in `primitives/choice-geometry.ts`): the text cell,
  then the choice row with Skip as its trailing text button (two columns
  with Skip in the next free cell where one row does not fit). Labels wrap,
  never truncate. Choices are outline rows with a quiet numeral (the 1 to 4
  keys); a locked-in pick takes the selected segment look; on the reveal the
  correct choice gets ✓ on the `now` tint, the rest drop to muted ink and a
  wrong pick shows ×. The verdict and its marks land with the third beat, on
  the 160 ms `land` fade. While a question is open Next looks unavailable;
  a press moves focus to the first choice and the note line under the
  prompt says "Pick an answer, or Skip." (the same line shows "Last time:
  B" after Restart, at the end of the prompt's line when both fit).
  A checkpoint with `verdict: 'end'` is a prediction about the whole run
  (the event loop's "Which logs last?" at Start): it locks in with no
  verdict and the verdict lands in the end recap. More than two short
  choices take one row wherever it fits (server-final container rules).
- **Copy is UI type (R3).** Captions 14/24, the step's name (sentence case,
  14/600) joined to its caption with the counter ("3 of 8") beside it. The
  counter is a position and moves with the thumb at once; a host step says
  "not a line of your code" beside its name.
- **Controls (Q11, Q12, Q13, Q14).** Restart, Back, Next and Play are Tab
  stops, after the dock in the DOM (the visual order). Next and Replay are
  the platform `primary` (the lesson's own main action). Autoplay dwells
  1.6 s plus 25 ms per character of the step's text, at most 4 s. At the
  finale only Replay is offered (Restart and Play keep their place,
  hidden), the recap leads with one bold verdict clause ("Right: B logs
  last."), and a press during the playback lands it at once. On a phone the
  button row sits above the scrubber, so the code line, the changed glyph,
  the caption and Next fit a 375x667 screen under the site header (Q15).
- **Lazy reserve under text zoom (Q16).** A step-through's entry-table row
  per preset is [narrow, wide, small, tight, tighter]: the frame laid out at
  the narrowest content width of each band (`footprint.ts` `BANDS`). The
  placeholder picks the band by its own width in rem, so its reserve holds
  at any root font size (the title, the dock, the button row and the footer
  wrap; the stage does not).
- **Hover and press (R13).** Hover is a white/5 step on hover devices, press
  one step on (`press:` variant, registered after `can-hover:` so it wins);
  surfaces with their own fill step the fill.
- **The motion harness asserts** (strict by default; `MOTION_STRICT=0`
  only records). `npx playwright test --project=motion` fails on any
  section 4 flag, a mid-tween jump, more than two animated stage glyphs, a
  Back that does not mirror Next by vector and duration, a moving or fading
  text over other text, a tween after an instant command, a settled frame
  that differs from a slow walk, a control without visible hover, press
  and focus feedback, an event-loop step whose beats play out of order or
  past 560 ms (Q1), or a checkpoint verdict that shows before its step has
  landed (Q4); at 1024 on pull requests, 320 to 1920 nightly.

### Payoff moments (VIZ-H WS4, D21)

Each visual has one designed reveal, the single explicit exception to the
two-glyph budget and the 300 ms cap (`reveal` in `tokens-v3.ts`): at most
800 ms, only on the step that pays the visual off, never on load, landed at
once by Back and by every instant command, a crossfade or nothing under
reduced motion, and it never moves the page. Elements that play it carry
`data-viz-reveal`; the strict motion harness asserts them separately.

- **Event loop (R7).** Next onto the last step (`gate.reveal`) plays the
  console back left to right (`consoleReveal`): each output's ground comes
  up with a tag naming its source line, and the code pane relights that
  line (`codeTrace`), in run order. The previous name and caption hold
  until the playback lands; then the recap replaces them (`recapText`, or a
  neutral invitation) and the primary becomes Replay in the same slot.
  Presses are ignored until the recap has landed (about 560 ms); a resize
  lands the reveal at once.
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
- **Closures.** No script. At rest every link is `line` grey (lime means
  current, chosen or traced). Hovering a function, focusing it from the
  keyboard (`:focus-visible`) or tapping it on a device that cannot hover
  traces it in lime: the function, its `[[Environment]]` link, its record,
  the row its body reads (`reads` in the data, checked by the truth test)
  and, in the factory preset, every name that refers to it. Nothing else
  changes (emphasis only, G ruling 1). One path at a time: a hovered function wins over a keyboard focus,
  and a mouse click never sticks. A one-line hint names the gesture, and
  each function has a 45 px touch band (`HIT`). `engines/env-records/paths.ts`
  writes the per-figure rules; `.vz-s` in `tailwind.css` holds the rest
  colours and the lit colours (`--vz-k`); nothing dims (G ruling 1).

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

## Gates (VIZ-H G)

Every visual, the 52 still to come included, passes the same gates before it
ships; each fails CI. Unit gates run in the existing test job (`yarn
test:check`); the browser gates run in the "Visualization gates" CI job,
inside the Playwright Linux image, against `next dev` (the dev-only gallery,
specimen, stress and lesson pages need no database; `next build` does, for
the course pages, and the build job covers production).

| Gate | Where | Catches |
| --- | --- | --- |
| Truth tests | `*.truth.test.ts` | a drawn value or claim that a real run contradicts |
| Footprints | `registry.test.ts` | an entry-table reserve that drifts from the computed footprint |
| Token lint | `primitives/tokens-lint.test.ts` | raw colors, arbitrary sizes, literal durations, literal SVG strokes and radii anywhere in this folder or in the `.vz-*` stylesheet; a color class the token tables do not paint in that capacity (palette rule) |
| Token contrast | `primitives/tokens-v3.test.ts` | a declared text or graphic pair under 4.5:1 or 3:1, dark and light |
| Contrast crawl | `e2e/gates/contrast.spec.ts` | a pair that renders below WCAG (text, focus rings, state marks, connectors), or a text color outside the tokens, on the specimen, in seven driven gallery states, in lesson context and in print; only aria-disabled controls are exempt |
| Visual regression | `e2e/gates/visual.spec.ts` | any changed pixel on the specimen, the gallery states and the lesson-context pages at 375, 768 and 1440, and in print |
| Functional | `e2e/viz-*.spec.ts` | behavior, keyboard, axe, no-JS rendering, console errors and hydration warnings, footprints |
| Motion | `e2e/motion/*.spec.ts` (strict by default) | section 4 flags, jumps, more than two animated glyphs, a Back that does not mirror Next by vector, a moving glyph over text, tweens after instant commands, missing press and focus feedback |
| Stress | `e2e/stress/*.stress.ts` (strict by default) | clipping, spill, overflow, overlap, detached edges, small targets, contrast, layout shift per preset, scroll jumps, hover, print and hydration defects across widths, zooms and text sizes, in full and reduced motion |

Commands (a dev server with the gallery at `E2E_BASE_URL`, default
`http://localhost:3100`):

- `yarn test:viz:gate`: the PR gate, exactly what CI runs on a pull request
  (functional, contrast, motion at 1024, the stress PR tier; visual too
  inside the image). CI runs it as seven parallel shards
  (`e2e/gate.sh pr <shard>`, listed with their times in the script), so the
  wall time stays under 10 minutes.
- `yarn test:viz:full`: the full matrix (every stress configuration, motion
  from 320 to 1920, so 375 and 1440 too), nightly on master and on demand
  (`.github/workflows/viz-nightly.yml`).
- `yarn test:viz:visual`: the visual gate in the Playwright image via
  Docker; `yarn test:viz:visual --update-snapshots` after an intended change,
  then review the PNG diff. Baselines live in `e2e/gates/__screenshots__/linux`.
- `MOTION_STRICT=0` and `STRESS_STRICT=0` only record (for audits).

A new visual is covered by adding it to the gallery (and its states to
`e2e/gates/drive.ts`), its primitives' states to the specimen, and, once a
lesson embeds it, its lesson to `src/app/dev/visualizations/lesson/fixtures.ts`.

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
