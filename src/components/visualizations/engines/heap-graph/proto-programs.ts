import type { TreeProgram } from '../annotated-tree/programs/types'

/**
 * Prototypes (js-track/core-fundamentals/prototypes, FREE): the programs
 * the prototype object graph draws, by locator and sha256 (the premium-code
 * policy keeps every lesson block out of the repo, free or not). Each runs
 * byte for byte under the inspector (the annotated-tree recorder,
 * `../annotated-tree/truth/record.ts`); one harness line at the end, `void
 * 0`, is where it pauses, and the watch `graph` reads the objects the panel
 * draws there: every own property (names and values, an object by its
 * label), the [[Prototype]] of each, and for each lookup the objects it
 * visits until one owns the key.
 */

const PAGE = 'content/js-track/core-fundamentals/prototypes/page.mdx'
const ANSWERS = 'content/js-track/core-fundamentals/_lessons.json'

/** The objects a panel draws: a label, the expression that reaches it in the paused frame. */
export type ProtoTarget = readonly [label: string, expr: string]

/** A lookup the panel highlights: the receiver's label and the key. */
export type ProtoLookup = readonly [from: string, key: string]

export type ProtoProgram = TreeProgram & { targets: readonly ProtoTarget[]; lookups: readonly ProtoLookup[] }

/**
 * The watch: an expression evaluated in the paused frame, returning the
 * graph as JSON. Objects outside `targets` print as `{ other }` (a function
 * by its name), so a value the panel would draw as an arrow cannot hide.
 */
function graphWatch(targets: readonly ProtoTarget[], lookups: readonly ProtoLookup[]): string {
  const list = targets.map(([l, e]) => `[${JSON.stringify(l)}, ${e}]`).join(', ')
  return String.raw`(() => {
  const L = [${list}];
  const label = new Map(L.map(([l, v]) => [v, l]));
  const text = (v) => typeof v === 'string' ? "'" + v + "'" : typeof v === 'bigint' ? v + 'n' : String(v);
  const val = (v) => v !== null && (typeof v === 'object' || typeof v === 'function')
    ? (label.has(v) ? { ref: label.get(v) } : { other: typeof v === 'function' ? 'function ' + v.name : Object.prototype.toString.call(v) })
    : { text: text(v) };
  const proto = (v) => { const p = Object.getPrototypeOf(v); return p === null ? null : label.has(p) ? { ref: label.get(p) } : { other: Object.prototype.toString.call(p) } };
  const objects = L.map(([l, v]) => ({
    label: l,
    fn: typeof v === 'function',
    keys: Reflect.ownKeys(v).filter((k) => typeof k === 'string').map((k) => {
      const d = Object.getOwnPropertyDescriptor(v, k);
      return [k, 'value' in d ? val(d.value) : { other: 'accessor' }, d.enumerable];
    }),
    proto: proto(v),
  }));
  const lookups = ${JSON.stringify(lookups)}.map(([from, key]) => {
    const visited = [];
    let at = L.find(([l]) => l === from)[1];
    while (at !== null) {
      const own = Object.hasOwn(at, key);
      visited.push([label.has(at) ? label.get(at) : '?', own]);
      if (own) return { from, key, visited, value: val(at[key]) };
      at = Object.getPrototypeOf(at);
    }
    return { from, key, visited, value: { text: 'undefined' } };
  });
  return { objects, lookups };
})()`
}

function program(id: string, source: TreeProgram['source'], probeLine: number, targets: readonly ProtoTarget[], lookups: readonly ProtoLookup[]): ProtoProgram {
  return {
    id,
    lang: 'js',
    source,
    probes: [{ line: probeLine, as: 'graph', read: ['graph'] }],
    watch: { graph: graphWatch(targets, lookups) },
    targets,
    lookups,
  }
}

/** The harness line the probe pauses on (no effect). */
const PAUSE = { code: 'void 0' } as const

const PERSON = {
  block: { path: PAGE, heading: '### **Prototype vs. `prototype` Property**', lang: 'javascript' },
  lessonSha256: 'd466cc1c605299162d130b159d9bf0a61a27972a6393c9e5e838dc4eafe9a46c',
} as const
const TO_STRING = {
  block: { path: PAGE, heading: '### **Accessing Properties Through the Prototype Chain**', lang: 'javascript' },
  lessonSha256: 'ea550b8b757d8270230157f522e2364b49165a063af609edc61220cd6f855114',
} as const
const SHADOW = {
  block: { path: ANSWERS, lesson: '/prototypes', problem: 'instance-vs-prototype-properties', lang: 'javascript', nth: 2 },
  lessonSha256: 'd4b44d9d70e6ba327232061eeaed09fc5177025b3d56b17a0ad613ad6c736bfd',
} as const
const EXERCISE = { path: PAGE, heading: '### **Exercise 3: Fixing Constructor Reference**', lang: 'javascript' } as const
const QUESTION = { block: EXERCISE, lessonSha256: 'e8159adc099da38cf7fa96f0921dff64c3d25031554b7e1634355483e8397b6d' } as const
const FIX = { block: { ...EXERCISE, nth: 2 }, lessonSha256: 'e5aa66cea1c2d8be74485aa7d6c689205ea34b48b84620f7b4518d0a42411405' } as const

/**
 * "Prototype vs. `prototype` Property" (Person, alice) and the next
 * section's `alice.toString()`: program lines 1-10 and 11, the pause on 12.
 */
export const personProgram = program(
  'person',
  [PERSON, TO_STRING, PAUSE],
  12,
  [
    ['alice', 'alice'],
    ['Person.prototype', 'Person.prototype'],
    ['Object.prototype', 'Object.prototype'],
    ['Person', 'Person'],
  ],
  [
    ['alice', 'toString'],
    ['alice', 'sayHello'],
    ['alice', 'name'],
  ],
)

/**
 * The practice answer "instance vs prototype properties", its shadowing
 * block (lines 1-8): paused before `delete` (line 6), while the own
 * property shadows the prototype's.
 */
export const shadowProgram = program(
  'shadow',
  [SHADOW],
  6,
  [
    ['dog', 'dog'],
    ['animal', 'animal'],
    ['Object.prototype', 'Object.prototype'],
  ],
  [['dog', 'sound']],
)

const CHILD_TARGETS: readonly ProtoTarget[] = [
  ['child', 'child'],
  ['Child.prototype', 'Child.prototype'],
  ['Parent.prototype', 'Parent.prototype'],
  ['Object.prototype', 'Object.prototype'],
  ['Child', 'Child'],
  ['Parent', 'Parent'],
]

/** Exercise 3's question as written (lines 1-10), paused after its log (11). */
export const constructorBeforeProgram = program('constructor-before', [QUESTION, PAUSE], 11, CHILD_TARGETS, [['child', 'constructor']])

/** Exercise 3's question up to "// Fix here" (lines 1-7), then its answer (8-11), paused on 12. */
export const constructorAfterProgram = program(
  'constructor-after',
  [{ ...QUESTION, lines: [1, 7] }, FIX, PAUSE],
  12,
  CHILD_TARGETS,
  [['child', 'constructor']],
)

export const PROTOTYPE_PROGRAMS: ProtoProgram[] = [personProgram, shadowProgram, constructorBeforeProgram, constructorAfterProgram]
