'use client'

import type { VizComponentProps } from '../../shell/types'
import { ListKeys } from './ListKeys'

/**
 * The lazily loaded list-keys chunk: renderer, recorded outcomes and code
 * tokens. Loaded by `<Viz id="list-keys">` when the frame nears the viewport.
 */
export default function ListKeysViz({
  preset,
  interactive,
}: VizComponentProps) {
  return <ListKeys preset={preset} interactive={interactive} />
}
