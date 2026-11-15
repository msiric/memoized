import type { StepThroughDefinition, VizCode } from './types'

/**
 * Puts a page's resolved practice-answer panes (`VizCode`, from the content
 * when the page was built) into a definition's presets: each premium
 * preset's placeholder lines become the answer's lines, with their tokens.
 * Widths are unchanged (the resolver refuses lines of another width), so the
 * layout and the reserved footprint are exactly the committed ones.
 */
export function withCode<S>(def: StepThroughDefinition<S>, code?: VizCode): StepThroughDefinition<S> {
  if (!code) return def
  return {
    ...def,
    presets: def.presets.map((p) => {
      const c = code[p.id]
      if (!c || !p.log.code?.premium) return p
      return { ...p, log: { ...p.log, code: { ...p.log.code, lines: c.lines, tokens: c.tokens } } }
    }),
  }
}
