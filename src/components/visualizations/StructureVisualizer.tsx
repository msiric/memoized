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
  /**
   * Node shape. `circle` (default) suits short values — BST keys, heap elements.
   * `box` sizes a uniform rounded rect to the longest label, for named nodes that
   * never fit in a small circle (prototype-chain links, linked-list cells, trie nodes).
   */
  nodeShape?: 'circle' | 'box'
}

const NODE_R = 20 // node radius, px
const GAP_X = 18 // horizontal gap between sibling node edges, px
const GAP_Y = 58 // vertical distance between levels, px
const BOX_H = 32 // box-node height, px
const BOX_PAD_X = 14 // horizontal padding inside a box node, px
// Advance width of the node label font (font-mono text-sm). Used to size box nodes
// to their text without measuring in the DOM, so layout is identical on server and client.
const CHAR_W = 8.4

type NodeState = 'default' | 'visited' | 'active'

const NODE_STATE: Record<NodeState, { circle: string; text: string }> = {
  default: { circle: viz.node.default, text: viz.node.defaultText },
  visited: { circle: viz.node.visited, text: viz.node.visitedText },
  active: { circle: viz.node.active, text: viz.node.activeText },
}

export function StructureVisualizer({ tree, frames, label, nodeShape = 'circle' }: StructureVisualizerProps) {
  const stepper = useStepper(frames.length, { ariaLabel: 'Data structure traversal' })
  const frame = frames[stepper.index]

  // Lay the tree out once. Node half-extents drive both the spacing and the padding,
  // so circle and box nodes are laid out by the same math; we then normalise the
  // (possibly negative) coordinates into a 0,0-origin viewBox with padding.
  const layout = useMemo(() => {
    const isBox = nodeShape === 'box'
    const measured = hierarchy<TreeNode>(tree, (d) => d.children)
    const longest = Math.max(...measured.descendants().map((n) => n.data.label.length))
    const halfW = isBox ? Math.round((longest * CHAR_W + BOX_PAD_X * 2) / 2) : NODE_R
    const halfH = isBox ? BOX_H / 2 : NODE_R
    const root = treeLayout<TreeNode>().nodeSize([halfW * 2 + GAP_X, GAP_Y])(measured)
    const nodes = root.descendants()
    const xs = nodes.map((n) => n.x)
    const ys = nodes.map((n) => n.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const padX = halfW + 6
    const padY = halfH + 6
    return {
      nodes,
      links: root.links(),
      halfW,
      halfH,
      isBox,
      offsetX: -minX + padX,
      offsetY: -minY + padY,
      width: Math.max(...xs) - minX + padX * 2,
      height: Math.max(...ys) - minY + padY * 2,
    }
  }, [tree, nodeShape])

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
            {/* Edges run from the BOTTOM of the parent to the TOP of the child rather than
                centre to centre. Node fills are semi-transparent in some states (visited is
                lime at 15% in dark mode), so a centre-to-centre line would show through the
                node it is drawn behind. Stopping at the node boundary is also just how tree
                diagrams are drawn, and it works for both node shapes. */}
            {layout.links.map((link, i) => (
              <line
                key={i}
                x1={link.source.x + layout.offsetX}
                y1={link.source.y + layout.offsetY + layout.halfH}
                x2={link.target.x + layout.offsetX}
                y2={link.target.y + layout.offsetY - layout.halfH}
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
                  {layout.isBox ? (
                    <rect
                      x={-layout.halfW}
                      y={-layout.halfH}
                      width={layout.halfW * 2}
                      height={layout.halfH * 2}
                      rx={8}
                      strokeWidth={2}
                      className={clsx(viz.node.circle, state.circle)}
                    />
                  ) : (
                    <circle r={NODE_R} strokeWidth={2} className={clsx(viz.node.circle, state.circle)} />
                  )}
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
