import { StructureVisualizer } from '../StructureVisualizer'
import { buildPrototypeChainSteps } from '../StructureVisualizer.data'

/**
 * The prototype-chain lookup walkthrough for the objects lesson, ready to drop in with
 * a single tag: `<PrototypeChainExample />`. It composes the generic StructureVisualizer
 * with the verified chain step-log and renders box nodes, since the links are named
 * objects rather than short values (ADR-002, Tier 2).
 */
export function PrototypeChainExample() {
  const { tree, frames } = buildPrototypeChainSteps()
  return (
    <StructureVisualizer
      tree={tree}
      frames={frames}
      nodeShape="box"
      label="Prototype chain · how a property lookup resolves"
    />
  )
}
