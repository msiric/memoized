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
  heights for the lazy mount; `footprint.ts` only estimates them. List keys
  reserves per combination (final polish): the key and the action on screen
  pick the stage's card rows (two, or three when the action adds a row; the
  code pane runs the columns' height beside them, so the stage has no empty
  quadrant) and the dock's ghosts (`engines/list-keys/DockGhosts.tsx`: that
  action's choice set and every question and verdict that key and action
  can show). Nothing moves while the learner checks rows, answers, skips or
  sees the reveal; choosing another key or action may resize the frame, as
  a preset switch does, and each preset's lazy reserve is its starting
  combination. Nothing reserves a band no state needs (F1 and F2
  rulings 2): stacked, Skip's target rises into the step bar so the prompt
  row is one line, the feedback takes the full row, and checkpoint copy
  fits one line on a 375 px phone; the list-keys verdict is two short
  sentences, with its tally as the note line under it (where "Last time"
  sits under the question).
- **Checkpoints (D9, R4, H3 R2 Q2 to Q5).** One layout for every visual
  (`primitives/Checkpoint.tsx`: `CheckpointBlock`, `PromptBlock`,
  `SkipButton`, geometry in `primitives/choice-geometry.ts`): one band under
  the stage, the text cell on the left (centred on the row) and the choice
  row on its right with Skip as its trailing text button, wherever the row
  fits beside text that keeps its `textMin` (list keys keeps 256 px for its
  two-sentence verdict); otherwise the text sits right over the choices, in
  one row across the band or two columns with Skip in the next free cell.
  Never two columns beside the text. Labels wrap,
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
  finale only Replay is offered: the row reads Back, Replay (Restart's
  slot moves to the row's end; Restart and Play are hidden and keep their
  size, so the row never rewraps). The recap is one bold result clause and
  one sentence, two lines at most on a phone ("Not quite: B logs last, not
  A." then the run's rule, or "C, a microtask, ran before B." when the
  later prediction was wrong), and a press during the playback lands it at
  once. On a phone the
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
  Web Animations, one curve for rider and lines; the 120 ms settle is the
  end of the travel, so the landing is the end of the motion). The checkbox
  sits on the card edge that faces the lines, so the path never crosses row
  text or an instance letter; a second check leaves only once it can no
  longer meet the first. Instance letters replace their `?` as their lines
  arrive (never a blank cell). After the last landing the outcome arrives in
  one ordered sequence, a 40 ms beat apart, each a 160 ms fade (`BEAT` in
  `reveal.ts`): the lime landing on the row that received the check, the
  in-row badges (Before and After) with the removed role, the verdict with
  the ✓ and × and the answer emphasis (narrated as it appears), and last the
  Before checks as a quiet record of the starting state, so a check never
  reads as copied. Lime is only the landing, the traced line and the correct
  choice (Q9). The key and the action are always-visible controls, the same
  shape in one block: where the four actions need the select, the key is a
  select too. Under very large text, or without container queries, the
  columns stack, Before above After, with the lines in a rail
  (`stack-css.ts`).
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

### Heap graph (R4 shared visual 4, identity mode)

`<Viz id="heap-graph" preset="…" />`, one id for the shared system and one
preset per lesson (as environment-records): `identity-alias-rebind-spread`
(Data Types) and `spread-vs-nested-vs-deep` (Objects). Names sit on the
left, the objects their values identify on the right, an arrow meaning
"identifies"; each panel is one of the lesson's own examples.

- **Built from a recording.** `programs/` holds each lesson program
  verbatim and its snapshot points; `yarn viz:heap` runs them in Node with
  a probe after each point (`truth/record.ts`: every object gets the index
  of its first discovery, so two names for one object record one index)
  and writes `recordings/<lesson>.json`. `build.ts` turns a snapshot into a
  panel (`Object A`, `Object B` in discovery order); the preset adds only
  the heading, the emphasis and which recorded change to mark. The truth
  test re-records every program, rebuilds the drawing from the fresh
  recording and probes the register's verification assertions and the
  identities the drawing claims, so the figure cannot disagree with a run.
- **Layout** (`layout.ts`). Columns by distance from the names where every
  panel fits them at the variant's narrowest width (wide), else one object
  column in reading order where a property's arrow drops into the object
  under it or turns back through a lane on the right (phones). Columns line
  up from panel to panel; rows are fit so arrows run straight (isotonic
  sweeps); converging arrows fan in with no jog under 16 px.
- **One rest mark per panel**, the neutral `changed` role (Q9, never lime):
  the row a mutation wrote (`.vz-ch`) or the arrow a rebinding moved
  (`.vz-cm`). Lime is only the trace: hovering, focusing or tapping a name
  lights it, its arrow and every object it reaches (`paths.ts`, server CSS
  on the closures rules, `.vz-*` shared). Names keep a 46 px touch band.
- **Gates.** `layout.test.tsx` (collisions, crossings, kinks, targets,
  every stress fixture), `heap-graph.truth.test.ts`,
  `e2e/viz-heap-graph.spec.ts`, the `heap-*` gate states, the lesson pages
  `data-types` and `objects`, and the static-figure consistency check
  against the closures figure.

### Frontier (R4 shared visual 1, `bfs-dfs-frontier`)

`<Viz id="bfs-dfs-frontier" preset="…" />`, a step-through with one preset
group per lesson: `bfs-levels` and `binary-matrix-8dir` (Graph BFS),
`dijkstra-lazy-heap` and `min-effort-grid` (Shortest Path Algorithms),
`bst-iterator-stack` (Trees). A canvas (graph, grid or tree, server-final
SVG), the frontier lane(s) on the shared `Lane` substrate (a queue, `q` and
`nq`, a heap in key order, a stack bottom-up) and the console.

- **Recorded under the inspector.** `programs/` names each lesson's code
  block by locator and sha256 (`source`, never its text: see "Premium
  code" below; a `code` part adds the register's input, a call, for a
  practice answer with no example usage) and its probes: lines to pause
  before and expressions to read there. `yarn viz:frontier` reads each
  block from the local content checkout, checks its hash, runs it in Node 24
  with breakpoints only (`truth/record.ts`, TypeScript through Node's own
  type stripping) and writes `recordings/<program>.json` (values only); the
  presets build every drawn value from it, captions included.
- **The pane** shows the lesson's lines rewrapped to 35 columns, only at
  their own spaces (`display`, checked token for token against the
  checkout): a lesson example's rows as text, a practice answer's as
  `wrap` rows with no text.
- **Gates.** `frontier.truth.test.ts` (with a checkout: the hash, a fresh
  re-recording, the rows against the block; everywhere: the register's
  assertions, every drawn frontier one the run passed through, lies that
  must fail),
  `e2e/viz-frontier.spec.ts`, `e2e/motion/frontier-steps.spec.ts`,
  `e2e/stress/frontier.stress.ts`, the `fr-*` gate states and the
  consistency check against the event loop. Gallery: `?fr=<preset>`.
### Pointer rewiring (R4 shared visual 3, wave 2B)

`<Viz id="linked-list-pointer-rewiring" preset="…" />` (step-through) and
`<Viz id="linked-list-frames" preset="…" />` (its static frames), one
engine (`engines/linked-list/`) and one lesson group per lesson:
`reverse-between-m2-n4` (Linked List Reversal), the palindrome presets
`palindrome-split-reverse-compare`, `palindrome-1221` and `palindrome-1231`
(Linked Lists), and the frames `floyd-rho` (Fast and Slow Pointers) and
`full-reversal-strip` (Linked List Reversal).

- **Built from a recording.** `programs/` names each lesson program by
  its blocks' locators and sha256s (never the text; a `code` part is the
  harness, calls only) and its probes, by line of the program as run;
  `yarn viz:linked-list` reads it from the local content checkout and runs it in Node 24 with
  the node class wrapped (one inserted line, so every node numbers itself
  in creation order) and a probe after each probed line, never editing a
  lesson line, and writes `recordings/<lesson>.json`: which node each
  pointer held and where every `next` pointed, every time a probe ran.
  `build.ts` makes one step per probe hit (the end step adds the printed
  output); presets add only words and checkpoints. The code pane shows the
  lesson function reflowed to the pane (rows by program line; the
  palindrome answer's as `wrap` rows with no text): the display check fails
  on any change beyond whitespace. With a checkout the truth test checks
  every hash, re-records every program and checks every row; everywhere it
  rebuilds every log and frame from the committed recordings, checks the
  register's assertions and that tampered recordings, steps and code fail.
- **Drawing** (`geometry.ts`, 288 wide, 1:1 at the default text size).
  Nodes never move. Each pointer variable has its own lane (above or below
  the row), so a tag slides to its node without crossing another tag; a
  pointer holding null sits in the `null` column. Arrows: to the right
  neighbour on the upper track, to the left neighbour on the lower track (a
  two-node cycle reads as two arrows), further as an arc whose side and
  level are fixed for the whole preset (never crossing, never jumping), and
  null as a grounded stub.
- **Motion.** A changed arrow cross-fades in place (one glyph, `link-i`), a
  tag slides on the `move` spring, both on the glyph beat; Back mirrors
  Next. The step's changed glyphs take the neutral `changed` mark (never
  lime). No designed reveal.
- **Gates.** `linked-list.truth.test.ts`, `frames/frames.truth.test.ts`,
  `layout.test.ts`, `e2e/viz-linked-list.spec.ts`,
  `e2e/motion/linked-list-steps.spec.ts`, `e2e/stress/linked-list.stress.ts`,
  the `ll-*` and `llf-*` gate states (gallery `?ll=<preset>`,
  `?ll=static`) and the heap-graph consistency check.

### Sliding window (R4 shared visual 2, wave 2C)

`<Viz id="sliding-window" preset="…" />`, a step-through with one lesson
group per lesson: `araaci-k2` and `araaci-k2-if` (Sliding Window Technique:
the lesson's longestSubstringWithKDistinct on "araaci", K = 2, as written and
with its shrink `while` written as `if`), and `set-shrink-longest-substring`
("pwwkew"), `set-shrink-abcabcbb`, `set-shrink-abba` and `set-shrink-abba-if`
(JavaScript Strings: the practice answer to longest substring without
repeating characters, a Set-backed window).

- **Recorded under the inspector** (the frontier's method): `programs/`
  names each lesson block or answer by locator and sha256 and the lines to
  pause before; `yarn viz:sliding-window` runs each program in Node 24 with
  breakpoints only and reads the edges, the count map (`[key, count]`
  pairs) or the Set's members, the best length and the string at every
  pause, writing `recordings/<lesson>.json` (values only). `build.ts` reads
  an iteration as the first shrink check (the right edge on its new
  character), every later pause whose left edge moved (one per pass of a
  `while`, the single pass of an `if`) and the record; presets add words
  and checkpoints only. An `if` program is the lesson's own block with one
  keyword changed (`SourcePart.replace: ['while', 'if']`), so the variant
  of a practice answer commits no answer text either.
- **Steps.** A count map's iteration is one step while it stays within K
  (count, no shrink, record), else count, one step per shrink pass, record;
  a Set's is one step per delete (the first also moves the right edge onto
  the character it read, drawn dashed until the Set takes it) and the add
  with its record. Each prediction is asked on the step before its reveal:
  where windowStart stops (asked after the first of two passes), which
  character leaves first (asked before j reads the repeat), and, judged at
  the end, what each `if` variant returns (4 for araaci, right by luck; 3
  for abba, wrong: the window holds b twice while `ss` holds one).
- **Drawing** (`layout.ts`): one svg strip of 30 px cells with their indices
  over them, the window band under them (one segment per cell, joined across
  the gaps) and the two edge tags in their own lanes, named as the code
  names them; the heading names K, the window's length (the Set) and the
  best length (amber, tinted on the step that records it); the store is the
  shared `Lane`, labelled with its key count or size. A tag slides on the
  `move` spring and the band's segment it took in or let go fades on the
  same beat; a store chip enters or leaves at its end, and a change that
  would make chips close up lands at once. Nothing changes size, and the
  best length switches without a fade.
- **Gates.** `sliding-window.truth.test.ts` (with a checkout: hashes, fresh
  re-recordings, every row against the content, each `if` program the
  lesson's with one keyword changed; everywhere: the register's assertions,
  the `if` variants' real answers, lies that must fail), `layout.test.ts`,
  `e2e/viz-sliding-window.spec.ts` (with the 375x667 fit, the site header
  reserved on the gallery page), `e2e/motion/sliding-window-steps.spec.ts`,
  `e2e/stress/sliding-window.stress.ts`, the `sw-*` gate states (gallery
  `?sw=<preset>`) and the consistency checks against the event loop's shell
  and the pointer-rewiring glyphs.

### Annotated tree (R4 shared visual, wave 2D)

`<Viz id="annotated-tree" preset="…" />`, a static substrate (as the heap
graph) for trees whose nodes and edges carry recorded values, one preset
per lesson: `max-path-gain-vs-through` (Tree DFS), `trie-end-markers`
(Tries) and `suffix-tree-banana` (Suffix Arrays and Suffix Trees). Three
panel kinds (`model.ts`): a binary tree of two-cell boxes (value | the
through value l + r + value) with what each call returned beside its
edge; a trie left to right, END nodes double-ringed, a pruned node a dashed
ghost; a compressed suffix tree left to right, edges labelled with their
substring and [start, end], leaves top to bottom as the suffix array with
the LCP beside it (a narrow and a wide drawing, CSS picks one).

- **Built from a recording.** `programs/` names each lesson block (or the
  Maximum Path Sum practice answer) by locator and sha256 and its probes;
  `yarn viz:tree` reads the code from the local content checkout and runs it
  in Node 24 under the inspector (`truth/record.ts`). A line probe pauses
  before a line; a return probe pauses at the line's return position and
  records the call's `returnValue` (what `dfs` returned, what each step of
  the trie's recursive delete returned), so nothing is inserted into the
  code. `build.ts` arranges the recorded values into panels; a node's
  through value is the sum of its three recorded terms, which the truth test
  ties to the recorded `ans`. The figure shows values only, no code.
- **One mark family per panel**, the neutral `changed` role (never lime):
  the recorded best path and its through cell, the clamped edge, the search
  path, the cleared END flag, where pruning stopped, the path to the deepest
  internal node and its LCP cell. Printed output (`false`, `true`) is the
  result amber.
- **Gates.** `annotated-tree.truth.test.ts` (with a checkout: hashes and a
  fresh re-recording; everywhere: the register's values and lies that must
  fail: a returned through value, a delete that unmarks apple, a tampered
  suffix tree or LCP), `layout.test.ts` (text inside, boxes apart, labels
  clear of boxes, edges and each other), `e2e/viz-annotated-tree.spec.ts`,
  `e2e/stress/annotated-tree.stress.ts` (the edge detector checks headless
  tree edges end on their node), the `at-*` gate states (gallery
  `?at=static`), print, and the heap-graph consistency check.

### Premium code (owner policy, wave 2)

The app repo is public. It holds the engines, presets (captions,
questions), recordings (recorded values only), each program's locators and
sha256s, and the short lines a visual displays from a lesson example. It
never holds a lesson's full code block or any text of a practice answer,
including the lines of a visual that steps through one.

- `step-log/lesson-source.ts` (no Node): `BlockRef` (a lesson fence under a
  heading, or a practice answer in `_lessons.json`), `ProgramSource` (the
  program as run: block parts with their `lessonSha256`, then harness
  calls), `DisplayRow` (`text` for a lesson example, `wrap: [indent, from,
  to]` for an answer) and the display check.
- `step-log/lesson-block.ts` (Node): reads a block from `src/content`
  (gitignored, `yarn setup:content`), checks its sha256 and composes the
  program. Truth tests and the `yarn viz:*` recorders use it; without the
  checkout (CI) they skip what needs the text, saying so, and run the rest.
- A practice answer's log carries same-width placeholders and
  `code.premium`; its tokens are not in `code-tokens.json`.
  `step-log/resolve-code.ts` resolves the rows (and tokens) from the
  content when a page is built: `remark-viz-code.ts` adds them to a
  serialized lesson's `<Viz code>` (`sync-content.ts`, the dev lesson
  pages), the dev gallery resolves them on the server. The entry table's
  sixth slot lists, per preset, the answers its frame needs; a frame
  missing any renders nothing (server and client alike). Footprints never
  depend on the text.
- Such frames are local-only: e2e gates skip them without the checkout
  (`e2e/premium.ts`), and their visual baselines go to the gitignored
  `__screenshots__/*/local-only/`.

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
| Token lint | `primitives/tokens-lint.test.ts` | raw colors, arbitrary sizes, literal durations, literal SVG strokes and radii anywhere in this folder or in the `.vz-*` stylesheet; a color class the token tables do not paint in that capacity (palette rule); a literal color class outside `primitives/` that is not a listed exception (`RAW_COLOR`, each with its role); a text color under 4.5:1 on the background set in the same class string, composited on the frame (R2 G-03) |
| Token contrast | `primitives/tokens-v3.test.ts` | a declared text or graphic pair under 4.5:1 or 3:1, dark and light |
| Contrast crawl | `e2e/gates/contrast.spec.ts` | a pair that renders below WCAG (text, focus rings, state marks, connectors), or a text color outside the tokens, on the specimen, in every driven gallery state (both event-loop presets, every list-keys scene, hover and press inside the frames), in lesson context (list keys through its committed stand-in lesson) and in print, at 375, 768 and 1440; and while each designed motion plays, frozen at +140 and +440 ms (R2 G-01, GB8); only aria-disabled controls are exempt |
| Consistency | `e2e/gates/consistency.spec.ts` | equivalent elements that compute differently across visuals (choice rows at rest and on the reveal, the marks, Skip, the prompt, the feedback and its lead, the checkpoint anatomy, the frame, the hairline, the current code line), and a frame whose edges are not the lesson's code-block edges at 375, 768 and 1440 (R2 G-05) |
| Visual regression | `e2e/gates/visual.spec.ts` | any changed pixel on the specimen, the gallery states and the lesson-context pages at 375, 768 and 1440, in print, and at the midpoint of three motions (the Start lock-in, the finale relight, the list-keys ride), frozen at a fixed time |
| Functional | `e2e/viz-*.spec.ts` | behavior, keyboard, axe, no-JS rendering, console errors and hydration warnings, footprints, the lazy placeholder under text zoom (both interactive visuals), the phone fit in a lesson, and the layout without container queries (emulated: one face per control, list keys stacked, the thumb on its step) |
| Motion | `e2e/motion/*.spec.ts` (strict by default) | section 4 flags, jumps, more than two animated glyphs, a Back that does not mirror Next by vector, a moving glyph or text over text, a raised layer covering text (only a lifted chip over a lane's own text is allowed), a label cut or rewrapped while it moves, the verdict and every mark or badge before the payoff lands (both visuals), a missing history tick, any list-keys ride that does not start on its box, turns back, crosses text, misses its box or blinks, tweens after instant commands, missing press and focus feedback |
| Stress | `e2e/stress/*.stress.ts` (strict by default) | clipping, spill, overflow, overlap, detached edges, small targets, contrast, ellipsis and line-clamp truncation, layout shift per preset, scroll jumps, hover, print and hydration defects across widths, zooms and text sizes, in full and reduced motion; a text-zoom run whose root size fell back (R2 G10); box checks measure a function's drawn box, not its touch band |

Commands (a dev server with the gallery at `E2E_BASE_URL`, default
`http://localhost:3100`):

- `yarn test:viz:gate`: the PR gate, exactly what CI runs on a pull request
  (functional, contrast, motion at 1024, the stress PR tier; visual too
  inside the image). CI runs it as nine parallel shards
  (`e2e/gate.sh pr <shard>`, listed with their times in the script), so the
  wall time stays near 10 minutes. The PR tier runs the full-motion contrast
  pass at 375 and every list-keys ride at 1024; the full tier runs both at
  every width, and hydration under very large text.
- `yarn test:viz:full`: the full matrix (every stress configuration, motion
  from 320 to 1920, so 375 and 1440 too), nightly on master and on demand
  (`.github/workflows/viz-nightly.yml`).
- `yarn test:viz:visual`: the visual gate in the Playwright image via
  Docker; `yarn test:viz:visual --update-snapshots` after an intended change,
  then review the PNG diff. Baselines live in `e2e/gates/__screenshots__/linux`.
- `MOTION_STRICT=0` and `STRESS_STRICT=0` only record (for audits).

A new visual is covered by adding it to the gallery (and its states to
`e2e/gates/drive.ts`: at rest in `STATES`, every scene and preset, hover and
press; its designed motions in `MOTION_STATES`), its primitives' states to
the specimen, its equivalent elements to `e2e/gates/consistency.spec.ts`,
and its lesson to `src/app/dev/visualizations/lesson/fixtures.ts` (a
premium lesson gets a committed stand-in body, as list keys has) and to
the warm and hydration lists.

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
