'use client'

import clsx from 'clsx'
import { hierarchy, tree as treeLayout } from 'd3-hierarchy'
import { useMemo } from 'react'
import { VizControls } from './primitives/VizControls'
import { VizFrame } from './primitives/VizFrame'
import { useStepper } from './primitives/useStepper'
import { viz } from './primitives/tokens'
import type { StructureFrame, TreeNode } from './StructureVisualizer.data'

/**
 * A reusable, data-driven visualizer for hierarchical structures (binary trees,
 * BSTs, heaps). The author provides the tree and a step-log; d3-hierarchy lays the
 * tree out deterministically (Reingold–Tilford), so there are no hand-placed
 * coordinates. The structure is laid out ONCE and never moves — only each node's
 * highlight changes per frame — so the stage cannot reflow, and colours animate
 * with a plain CSS transition (no framer-motion, so nothing to gate on hydration).
 * Traversals, searches, and heap operations are all just different step-logs over
 * the same renderer.
 *
 * Scope: hierarchical (tree/heap) structures. Arbitrary-graph structure is served
 * by the Mermaid pipeline; interactive graph traversal (non-deterministic force
 * layout) is intentionally out of scope until a lesson needs it.
 */

export type StructureVisualizerProps = {
  tree: TreeNode
  frames: StructureFrame[]
  label?: string
}

const NODE_R = 20 // node radius, px
const GAP_X = 18 // horizontal gap between sibling node edges, px
const GAP_Y = 58 // vertical distance between levels, px
const PAD = NODE_R + 6 // padding around the laid-out tree, px

type NodeState = 'default' | 'visited' | 'active'

const NODE_STATE: Record<NodeState, { circle: string; text: string }> = {
  default: { circle: viz.node.default, text: viz.node.defaultText },
  visited: { circle: viz.node.visited, text: viz.node.visitedText },
  active: { circle: viz.node.active, text: viz.node.activeText },
}

export function StructureVisualizer({ tree, frames, label }: StructureVisualizerProps) {
  const stepper = useStepper(frames.length, { ariaLabel: 'Data structure traversal' })
  const frame = frames[stepper.index]

  // Lay the tree out once. nodeSize gives uniform spacing; we then normalise the
  // (possibly negative) coordinates into a 0,0-origin viewBox with padding.
  const layout = useMemo(() => {
    const root = treeLayout<TreeNode>().nodeSize([NODE_R * 2 + GAP_X, GAP_Y])(
      hierarchy<TreeNode>(tree, (d) => d.children),
    )
    const nodes = root.descendants()
    const xs = nodes.map((n) => n.x)
    const ys = nodes.map((n) => n.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    return {
      nodes,
      links: root.links(),
      offsetX: -minX + PAD,
      offsetY: -minY + PAD,
      width: Math.max(...xs) - minX + PAD * 2,
      height: Math.max(...ys) - minY + PAD * 2,
    }
  }, [tree])

  const visited = new Set(frame.visited)
  const stateOf = (id: string): NodeState => (id === frame.active ? 'active' : visited.has(id) ? 'visited' : 'default')

  return (
    <VizFrame
      label={label}
      caption={frame.note}
      captionReserve={frames.map((f) => f.note)}
      controls={<VizControls stepper={stepper} />}
      containerProps={stepper.containerProps}
    >
      <div className="py-1">
        <svg
          role="img"
          aria-label={label ?? 'Tree structure'}
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="mx-auto h-auto max-w-full"
          data-testid="structure-svg"
        >
          <g>
            {layout.links.map((link, i) => (
              <line
                key={i}
                x1={link.source.x + layout.offsetX}
                y1={link.source.y + layout.offsetY}
                x2={link.target.x + layout.offsetX}
                y2={link.target.y + layout.offsetY}
                strokeWidth={1.5}
                className={viz.node.edge}
              />
            ))}
          </g>
          <g>
            {layout.nodes.map((n) => {
              const state = NODE_STATE[stateOf(n.data.id)]
              return (
                <g
                  key={n.data.id}
                  transform={`translate(${n.x + layout.offsetX},${n.y + layout.offsetY})`}
                  data-testid="node"
                >
                  <circle r={NODE_R} strokeWidth={2} className={clsx(viz.node.circle, state.circle)} />
                  <text textAnchor="middle" dominantBaseline="central" className={clsx(viz.node.label, state.text)}>
                    {n.data.label}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      </div>
    </VizFrame>
  )
}
