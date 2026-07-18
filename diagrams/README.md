# Diagram sources

Static structural, flow, sequence, and state diagrams are authored here as Mermaid
text and rendered to committed SVG by `yarn render-diagrams`. The SVGs land in
`public/images/visualizations/<slug>.svg` and are referenced from lesson MDX as
`![alt](/images/visualizations/<slug>.svg)`, so there is no runtime rendering cost.

## Adding or changing a diagram

```
1. Write diagrams/<slug>.mmd  (Mermaid text).
2. Run  yarn render-diagrams  (renders every *.mmd, verifies the SVG is well-formed).
3. Commit both the .mmd source and the generated .svg.
```

Rendering uses Puppeteer's Chromium. If your environment has no bundled Chromium,
point Puppeteer at an existing browser: `PUPPETEER_EXECUTABLE_PATH=/path/to/chrome`.

## Theme

`mermaid.config.json` themes every diagram with the platform palette: zinc line-art
(`#71717a`), a lime accent (`#84cc16`, applied per-diagram via `classDef`), and a
transparent canvas. Edge-label backgrounds are set to the dark page background
(`#18181b`, i.e. Tailwind `zinc-900`) so labels mask the line beneath them.

The app is dark-only (`forcedTheme="dark"`), so diagrams are tuned for the dark
surface. If a light theme is ever reintroduced, the label background here must be
revisited (an `<img>` cannot adapt its baked colors to two themes).
