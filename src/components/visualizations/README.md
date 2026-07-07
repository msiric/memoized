# Lesson visualizations

Reusable, data-driven visual components for interview-prep lessons. Full
rationale in the audit repo's `ADR-001-visualization-framework.md`.

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
ArrayVisualizer.tsx      arrays and strings (sliding window, two-pointer, ...)
SequenceStepper.tsx      temporal (event loop, call stack, async)
StructureVisualizer.tsx  trees, graphs, heaps (D3 auto-layout)
index.ts                 barrel, registered in ../mdx.tsx
```

Static structural and flow diagrams are authored as Mermaid and rendered to
committed SVG under `public/images/visualizations/`, referenced from MDX as
`![alt](/images/visualizations/<slug>.svg)`.

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

## Conventions

- Consume `tokens.ts` for all color, spacing, and motion. No inline hex.
- Every interactive visual composes `VizFrame` + `VizControls` + `useStepper`.
- Respect `prefers-reduced-motion`.
- Keep visuals compact and responsive for a lesson page.
- Add a render test and cover step-log correctness.
