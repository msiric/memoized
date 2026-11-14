import { heapGraphDescriptor, heapGraphEngineCore } from '../engines/heap-graph/descriptor'
import type { HeapDiagram, HeapObject, HeapPanel, HeapValue } from '../engines/heap-graph/model'
import type { StaticDescriptor, StaticPreset } from '../shell/static-types'

/**
 * Adversarial fixtures for the heap-graph static figure, rendered through
 * the real StaticFigure and HeapGraphStage on /dev/visualizations/stress.
 * Never registered or shipped. Long identifiers, many names, CJK and emoji,
 * long values, a cycle and a deep shared chain; one fixture the lint must
 * reject (a name too long for a phone).
 */

const program = { id: 'p', snippet: 'x', runtime: 'node@24.x', sha256: 'stress', observed: ['1'] }

function preset(id: string, panels: HeapPanel[], over: Partial<StaticPreset<HeapDiagram>> = {}): StaticPreset<HeapDiagram> {
  return {
    id,
    label: id.slice(0, 18),
    title: `Stress: ${id}`.slice(0, 40),
    caption: 'A binding holds a value that identifies an object; two arrows into one box are one object.',
    programs: [program],
    claims: [],
    data: { panels },
    ...over,
  }
}

const ref = (to: string): HeapValue => ({ ref: to })
const txt = (text: string): HeapValue => ({ text })
const obj = (letter: string, rows: [string, HeapValue][], array = false): HeapObject => ({
  id: `o${letter}`,
  title: [`${array ? 'Array' : 'Object'} ${letter}`],
  rows: rows.map(([key, value]) => ({ key, value })),
})
const names = (pairs: [string, HeapValue][]) =>
  pairs.map(([name, value], i) => ({ id: /^[A-Za-z_][\w-]*$/.test(name) ? `v-${name}` : `v-${i}`, name, value }))

// 1. Long identifiers that still fit a 320 px phone, and long string values.
const longNames = preset('hg-long-names', [
  {
    id: 'long',
    heading: 'const shippingAddress = { ...home }',
    emphasis: 'shippingAddress',
    bindings: names([
      ['shippingAddress', ref('oA')],
      ['billingAddress', ref('oA')],
    ]),
    objects: [obj('A', [['zip', txt("'95014'")]])],
    changed: { row: { object: 'oA', key: 'zip' } },
    results: [{ expr: 'billingAddress.zip', text: "'95014'" }],
  },
])

// 2. Many names: aliases converging, primitives, an array, distinct objects.
const manyNames = preset('hg-many-names', [
  {
    id: 'many',
    heading: 'const a = b = c = shared',
    bindings: names([
      ['a', ref('oA')],
      ['b', ref('oA')],
      ['c', ref('oA')],
      ['n', txt('42')],
      ['list', ref('oB')],
      ['other', ref('oC')],
      ['again', ref('oB')],
      ['flag', txt('true')],
    ]),
    objects: [
      obj('A', [['count', txt('3')]]),
      obj('B', [
        ['0', txt('1')],
        ['1', ref('oD')],
      ], true),
      obj('C', [['ok', txt('false')]]),
      obj('D', [['id', txt('7')]]),
    ],
    changed: { binding: 'v-other' },
  },
])

// 3. CJK and emoji names and values (the width model's wide clusters).
const cjk = preset('hg-cjk', [
  {
    id: 'cjk',
    heading: 'const 副本 = { ...用户 }',
    emphasis: '副本',
    bindings: names([
      ['用户', ref('oA')],
      ['副本', ref('oB')],
    ]),
    objects: [
      obj('A', [
        ['名前', txt("'東京'")],
        ['設定', ref('oC')],
      ]),
      obj('B', [
        ['名前', txt("'大阪 🎉'")],
        ['設定', ref('oC')],
      ]),
      obj('C', [['テーマ', txt("'暗い'")]]),
    ],
    changed: { row: { object: 'oC', key: 'テーマ' } },
    results: [{ expr: '用户.設定 === 副本.設定', text: 'true' }],
  },
])

// 4. A cycle and a three-level chain shared by two roots.
const cycle = preset('hg-cycle-chain', [
  {
    id: 'cycle',
    heading: 'node.self = node',
    bindings: names([['node', ref('oA')]]),
    objects: [
      obj('A', [
        ['value', txt('1')],
        ['self', ref('oA')],
      ]),
    ],
  },
  {
    id: 'chain',
    heading: 'const b = { ...a }',
    bindings: names([
      ['a', ref('oA')],
      ['b', ref('oB')],
    ]),
    objects: [
      obj('A', [['next', ref('oC')]]),
      obj('B', [['next', ref('oC')]]),
      obj('C', [['next', ref('oD')]]),
      obj('D', [['end', txt('null')]]),
    ],
  },
])

// 5. Rejected: a name no phone can hold (the lint fails it before it reaches a lesson).
const ID44 = 'extraordinarilyLongBindingNameWithoutBreaks1'
const overlong = preset('hg-overlong', [
  {
    id: 'overlong',
    heading: 'const x = y',
    bindings: names([[ID44, ref('oA')]]),
    objects: [obj('A', [['value', txt("'Map(1024) { someVeryLongKeyName => value }'")]])],
  },
])

export const HEAP_PRESETS = [longNames, manyNames, cjk, cycle, overlong]

/** A descriptor whose presets are the fixtures (the stress page renders it through StaticFigure). */
export function heapFixture(p: StaticPreset<HeapDiagram>): StaticDescriptor<HeapDiagram> {
  return { ...heapGraphDescriptor, engine: heapGraphEngineCore, presets: [p], defaultPreset: p.id }
}
