import type { Claim, StaticPreset } from '../../../shell/static-types'
import { buildPanel, identityClaims, type PanelSpec } from '../build'
import type { HeapDiagram, HeapRecording } from '../model'
import { aliasProgram, spreadProgram, updateProgram } from '../programs/data-types'
import recording from '../recordings/data-types.json'

/**
 * Data Types, "Values, bindings and identity" (R4 register row
 * js-track/core-fundamentals/data-types, preset
 * `identity-alias-rebind-spread`): three panels, each the lesson's own
 * example at the moment that answers its gotcha. Panel 1: two names, one
 * object, and the count written through `alias`. Panel 2: inside
 * `update(original)`, after `record = { count: 99 }`: only `record` moved.
 * Panel 3: `copy = { ...original }`: two outer objects, one shared `stats`.
 */

const REC = recording as unknown as Record<string, HeapRecording>

const panels: PanelSpec[] = [
  {
    program: aliasProgram,
    snapshot: 'alias',
    heading: 'const alias = original',
    emphasis: 'alias',
    changed: { path: 'alias.count' },
    changedBy: 'alias.count = 2',
  },
  {
    program: updateProgram,
    snapshot: 'rebind',
    heading: 'record = { count: 99 }',
    emphasis: 'record',
    changed: { moved: 'record' },
    changedBy: 'record = { count: 99 }',
  },
  {
    program: spreadProgram,
    snapshot: 'spread',
    heading: 'const copy = { ...original }',
    emphasis: '{ ...original }',
    changed: { path: 'copy.stats.count' },
    changedBy: 'copy.stats.count = 2',
  },
]

const data: HeapDiagram = { panels: panels.map((s) => buildPanel(s, REC)) }

/** The register's verification (Node 24), as probes run after the lesson code. */
const verification: Claim[] = [
  {
    says: 'original.count is 2 after update(original)',
    program: 'update',
    probe: 'console.log(original.count === 2)',
    expect: ['true'],
  },
  {
    says: 'the replacement update returned is not original',
    program: 'update',
    probe: 'console.log(replacement !== original)',
    expect: ['true'],
  },
  {
    says: 'copy.stats is original.stats',
    program: 'spread',
    probe: 'console.log(copy.stats === original.stats)',
    expect: ['true'],
  },
]

export const dataTypesPanels = panels

export const identityAliasRebindSpread: StaticPreset<HeapDiagram> = {
  id: 'identity-alias-rebind-spread',
  label: 'Bindings, identity',
  title: 'Two names, one object',
  caption:
    'A binding holds a value that identifies an object: a change to the object shows through every name; rebinding moves one arrow.',
  programs: [aliasProgram, updateProgram, spreadProgram],
  data,
  claims: [...verification, ...panels.flatMap((s, i) => identityClaims(s, data.panels[i]))],
}
