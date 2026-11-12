import { envRecordsEngineCore } from '../engines/env-records/descriptor'
import type { EnvDiagram, EnvNode, EnvSection } from '../engines/env-records/model'
import type { StaticDescriptor, StaticPreset } from '../shell/static-types'

/**
 * VIZ-H H0-B adversarial fixtures for the environment-records static figure,
 * rendered through the real StaticFigure and EnvRecordsStage on
 * /dev/visualizations/stress. Never registered or shipped.
 */

const program = { id: 'p', snippet: 'x', runtime: 'node@24.x', sha256: 'stress', observed: ['1'] }

function preset(
  id: string,
  data: EnvDiagram,
  over: Partial<StaticPreset<EnvDiagram>> = {},
): StaticPreset<EnvDiagram> {
  return {
    id,
    label: id.slice(0, 18),
    title: `Stress: ${id}`.slice(0, 40),
    caption: 'Each call creates a new record, so the saved function reads its own binding.',
    programs: [program],
    claims: [],
    data,
    ...over,
  }
}

const ID44 = 'extraordinarilyLongBindingNameWithoutBreaks1'
const VAL44 = 'Map(1024) { someVeryLongKeyName => value }'

const rec = (id: string, title: string[], bindings: [string, string][], outer: string | null, extra = {}): EnvNode => ({
  kind: 'record',
  id,
  title: title as [string, ...string[]],
  bindings: bindings.map(([name, text]) => ({ name, value: { text } })),
  outer,
  ...extra,
})
const fn = (id: string, title: string[], env: string, logs?: string): EnvNode => ({
  kind: 'function',
  id,
  title: title as [string, ...string[]],
  env,
  logs,
})

// 1. Long unbreakable binding names, values and titles (no shorter fallbacks).
const longNames: EnvSection = {
  id: 'long',
  heading: 'function createExtraordinarilyLongFactoryName() { … }',
  emphasis: 'createExtraordinarilyLongFactoryName',
  nodes: [
    rec('call', ['createExtraordinarilyLongFactoryName() call'], [
      [ID44, VAL44],
      ['i', '0'],
    ], null),
    fn('f0', ['handleExtraordinarilyLongCallbackIdentifier'], 'call', 'ResponsePayloadReceivedFromUpstream'),
  ],
  highlight: ['env:f0'],
}
const erLongNames = preset('er-long-names', { sections: [longNames], align: 'top' })

// 2. Many bindings (15) and many reference bindings (8) in one module record.
const manyBindings: EnvSection = {
  id: 'many',
  heading: 'const a0 = …, a1 = …, …',
  nodes: [
    rec(
      'module',
      ['module'],
      Array.from({ length: 15 }, (_, k) => [`binding${k}`, `value ${k}`] as [string, string]),
      null,
    ),
    rec('call', ['factory() call'], [['n', '1']], 'module'),
    fn('f', ['f'], 'call', '1'),
  ],
  highlight: ['env:f'],
}
const refsSection: EnvSection = {
  id: 'refs',
  heading: 'const r0 = make(), r1 = make(), …',
  nodes: [
    {
      kind: 'record',
      id: 'module',
      title: ['module'],
      bindings: Array.from({ length: 8 }, (_, k) => ({ name: `ref${k}`, value: { ref: `g${k % 4}` } })),
      outer: null,
    },
    ...[0, 1, 2, 3].map((k) =>
      rec(`c${k}`, [`make() call ${k}`, `call ${k}`], [['n', String(k)]], 'module', { drawOuter: false }),
    ),
    ...[0, 1, 2, 3].map((k) => fn(`g${k}`, [`g${k}`], `c${k}`)),
  ],
  highlight: ['ref:module.ref0', 'ref:module.ref4'],
}
const erManyBindings = preset('er-many-bindings', { sections: [manyBindings, refsSection], align: 'top' })

// 3. Many records in one tier (8 iterations) and a deep outer chain (6 levels).
const wideTier: EnvSection = {
  id: 'wide',
  heading: 'for (let i = 0; i < 8; i++)',
  emphasis: 'let',
  nodes: [
    rec('call', ['loop() call'], [['arr', 'Array(8)']], null),
    ...Array.from({ length: 8 }, (_, k) =>
      rec(`it${k}`, [`iteration i=${k}`, `iter ${k}`, `${k}`], [['i', String(k)]], 'call'),
    ),
    ...Array.from({ length: 8 }, (_, k) => fn(`f${k}`, [`anonymous #${k}`, `#${k}`], `it${k}`, String(k))),
  ],
  highlight: ['env:f0'],
}
const erWideTier = preset('er-wide-tier', { sections: [wideTier], align: 'top' })

const deepChain: EnvSection = {
  id: 'deep',
  heading: 'a(b(c(d(e(f())))))',
  nodes: [
    rec('l0', ['module'], [['a', 'ƒ']], null),
    ...[1, 2, 3, 4, 5].map((k) => rec(`l${k}`, [`level${k}() call`], [[`v${k}`, String(k)]], `l${k - 1}`)),
    fn('inner', ['inner'], 'l5', '5'),
  ],
  highlight: ['outer:l5', 'env:inner'],
}
const erDeep = preset('er-deep-chain', { sections: [deepChain], align: 'top' })

// 4. Unicode: CJK (double-width) and emoji in names, values and titles.
const unicode: EnvSection = {
  id: 'uni',
  heading: 'const 名前 = "漢字" // 🎉',
  nodes: [
    rec('call', ['作成関数() 呼び出し'], [
      ['名前', '"漢字漢字漢字漢字"'],
      ['emoji', '"🎉🎉🎉🎉🎉🎉🎉🎉"'],
      ['rtl', '"שלום עולם"'],
    ], null),
    fn('f', ['関数 🚀'], 'call', '🎉🎉🎉'),
  ],
  highlight: ['env:f'],
}
const erUnicode = preset('er-unicode', { sections: [unicode], align: 'top' })

// 4b. Long, but short enough for the narrow layout to accept: what reaches rendering.
const nearLimit: EnvSection = {
  id: 'near',
  heading: 'function makeAccumulator() { … }',
  nodes: [
    rec('call', ['makeAccumulator() call', 'makeAccumulator()\ncall'], [
      ['runningTotal', '"accumulated"'],
      ['WWWWWWWWWW', 'MMMMMMMMMMMMM'],
    ], null),
    fn('f', ['accumulateIntoTotal', 'accumulate'], 'call', 'accumulated'),
    fn('g', ['resetRunningTotal', 'reset'], 'call', 'undefined'),
  ],
  highlight: ['env:f'],
}
const erNearLimit = preset('er-near-limit', { sections: [nearLimit, { ...nearLimit, id: 'near2' }], align: 'bottom' })

// 5. Text slots at and over their limits: heading, note, title 40 / 80, caption 140 / 260.
const CAPTION140 =
  'var gives the whole call one i, so every saved function reads the final 3; let gives each iteration its own binding, so each reads its own.'
const CAPTION260 = `${CAPTION140} ${CAPTION140}`.slice(0, 260)
const noted: EnvSection = {
  id: 'noted',
  heading: 'for (let index = 0; index < items.length; index++) { handlers.push(() => index) }',
  emphasis: 'let',
  nodes: [rec('call', ['build() call'], [['index', '0']], null), fn('f', ['handler'], 'call', '0')],
  highlight: ['env:f'],
  note: 'Hatched: index = 3 · the loop test fails, so no function is saved, and this note is long enough to wrap twice.',
}
const erTextLimit = preset(
  'er-text-limit',
  { sections: [noted, noted].map((s, i) => ({ ...s, id: `n${i}` })), align: 'bottom' },
  { title: 'A forty character title for the limit!!', caption: CAPTION140 },
)
const erTextOver = preset(
  'er-text-over',
  { sections: [noted], align: 'top' },
  {
    title: 'A figure title that is far over the forty character limit and keeps going',
    caption: CAPTION260,
    label: 'A preset label far over eighteen characters',
  },
)

export const ENV_PRESETS = [erLongNames, erNearLimit, erManyBindings, erWideTier, erDeep, erUnicode, erTextLimit, erTextOver]

export function envFixture(p: StaticPreset<EnvDiagram>): StaticDescriptor<EnvDiagram> {
  return {
    id: `stress-${p.id}`,
    form: 'static',
    title: 'Environment records (stress)',
    engine: envRecordsEngineCore,
    presets: [p],
    defaultPreset: p.id,
    since: '2026-11',
  }
}
