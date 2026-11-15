import type { StaticDescriptor, StaticEngineCore, StaticTextAlternative } from '../../../shell/static-types'
import { nodeName, type LLState } from '../model'
import { layoutFrames } from './layout'
import type { FramePanel, FramesData } from './model'
import { floydRho, fullReversalStrip } from './presets'

/**
 * The pointer-rewiring frames without their renderer: the static presets of
 * R4 shared visual 3 (linked-list-reversal's full-reversal strip and
 * fast-and-slow-pointers' Floyd rho), on the step engine's glyphs.
 */

const name = (s: LLState, i: number | null) => (i === null ? 'null' : nodeName(s, i))

function describePanel(p: FramePanel): string[] {
  const s = p.state
  const out = [
    `Links: ${s.nodes.map((_, i) => `${name(s, i)} to ${name(s, s.next[i])}`).join(', ')}.`,
    `Pointers: ${s.pointers.map((x) => `${x.name} on ${name(s, x.at)}`).join(', ')}.`,
  ]
  if (p.kind === 'row' && p.changed !== undefined) out.push(`Marked: the arrow from ${name(s, p.changed)}, flipped in this pass.`)
  if (p.kind === 'rho') {
    if (p.mark) out.push(`Marked: ${name(s, p.mark.node)}, the ${p.mark.label === 'meet' ? 'meeting node (not the entry)' : 'cycle entry'}.`)
    out.push(`${p.pairs.names.join(', ')} after each step: ${p.pairs.values.join(' ')}.`)
    if (p.distances) {
      const { a, b, c } = p.distances
      out.push(`Distances in links: a = ${a} from head to the entry, b = ${b} from the entry to the meeting node, c = ${c} round the cycle.`)
    }
  }
  return out
}

export function describeFrames(d: FramesData): Omit<StaticTextAlternative, 'outputs'> {
  return {
    parts: d.panels.map((p) => ({ heading: p.heading, lines: describePanel(p) })),
    model:
      'Each panel is a pointer state recorded from a real run: which node every pointer held and where every next pointed. Nodes are drawn in the order they were created.' +
      (d.footnote ? ` ${d.footnote}` : ''),
  }
}

export const linkedListFramesEngineCore: StaticEngineCore<FramesData> = {
  id: 'linked-list-frames',
  stageHeight: (d) => layoutFrames(d).height,
  describe: describeFrames,
}

export const linkedListFramesDescriptor: StaticDescriptor<FramesData> = {
  id: 'linked-list-frames',
  form: 'static',
  title: 'Linked list: pointer frames',
  engine: linkedListFramesEngineCore,
  presets: [floydRho, fullReversalStrip],
  defaultPreset: 'floyd-rho',
  since: '2026-11',
}
