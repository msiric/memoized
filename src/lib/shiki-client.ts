import type { HighlighterCore } from 'shiki/core'

// Browser-only highlighter for the home page's animated code sample. It loads
// just the TypeScript grammar and the nord theme with Shiki's JavaScript regex
// engine. The shared server highlighter (src/lib/shiki.ts) bundles 13
// languages plus the Oniguruma WebAssembly engine (~1.7 MB of JavaScript).
let highlighter: Promise<HighlighterCore> | null = null

export function getAnimatedCodeHighlighter(): Promise<HighlighterCore> {
  highlighter ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
    ])
    return createHighlighterCore({
      themes: [import('shiki/themes/nord.mjs')],
      langs: [import('shiki/langs/typescript.mjs')],
      engine: createJavaScriptRegexEngine(),
    })
  })()
  return highlighter
}
