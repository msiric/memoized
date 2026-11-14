import type { Claim, StaticPreset } from '../../../shell/static-types'
import { buildPanel, identityClaims, type PanelSpec } from '../build'
import type { HeapDiagram, HeapRecording } from '../model'
import { deepProgram, nestedProgram, shallowProgram } from '../programs/objects'
import recording from '../recordings/objects.json'

/**
 * JavaScript Objects (R4 register row dsa-track/built-in-data-structures/
 * objects, preset `identity: spread-vs-nested-vs-deep`): does changing the
 * copy change the original? Panel 1: the shallow-copy gotcha, one shared
 * `{c}` object, written through `copy`. Panel 2: the nested update, a new
 * outer object and a new `address`; `name` copied as a value; `person`'s
 * address untouched. Panel 3: `deepClone`, every object duplicated.
 */

const REC = recording as unknown as Record<string, HeapRecording>

const panels: PanelSpec[] = [
  {
    program: shallowProgram,
    snapshot: 'shallow',
    heading: 'let copy = {...original};',
    emphasis: '{...original}',
    changed: { path: 'copy.b.c' },
    changedBy: 'copy.b.c = 3;',
  },
  {
    program: nestedProgram,
    snapshot: 'nested',
    heading: "...person.address, city: 'Newtown'",
    emphasis: '...person.address',
    changed: { path: 'updatedPerson.address.city' },
    changedBy: "city: 'Newtown'",
  },
  {
    program: deepProgram,
    snapshot: 'deep',
    heading: 'let copy = deepClone(original);',
    emphasis: 'deepClone(original)',
    changed: { path: 'copy.b.c' },
    changedBy: 'copy.b.c = 3;',
  },
]

const data: HeapDiagram = { panels: panels.map((s) => buildPanel(s, REC)) }

/** The register's verification (Node 24), as probes run after the lesson code. */
const verification: Claim[] = [
  { says: 'copy.b is original.b', program: 'shallow', probe: 'console.log(copy.b === original.b)', expect: ['true'] },
  {
    says: 'updatedPerson.address is a new object',
    program: 'nested',
    probe: 'console.log(updatedPerson.address !== person.address)',
    expect: ['true'],
  },
  {
    says: "person.address.city is unchanged ('Anytown')",
    program: 'nested',
    probe: 'console.log(person.address.city)',
    expect: ['Anytown'],
  },
  {
    says: 'deepClone shares no object with original',
    program: 'deep',
    probe: 'console.log(copy !== original, copy.b !== original.b)',
    expect: ['true true'],
  },
]

export const objectsPanels = panels

export const spreadVsNestedVsDeep: StaticPreset<HeapDiagram> = {
  id: 'spread-vs-nested-vs-deep',
  label: 'Spread vs deep',
  title: 'Shallow, nested and deep copies',
  caption:
    'Spread copies one level, so nested objects stay shared; a nested spread rebuilds only its path; deepClone duplicates every object.',
  programs: [shallowProgram, nestedProgram, deepProgram],
  data,
  claims: [...verification, ...panels.flatMap((s, i) => identityClaims(s, data.panels[i]))],
}
