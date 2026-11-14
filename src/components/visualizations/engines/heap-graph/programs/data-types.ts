import type { HeapProgram } from '../model'

/**
 * Data Types (js-track/core-fundamentals/data-types, FREE): the lesson's
 * three identity examples, verbatim from the content repo
 * (`fix/batch-2d-wording` at 273a771). `observed` is what a real Node 24 run
 * prints; the snapshot points are where the heap is recorded
 * (`yarn viz:heap`, re-checked by `heap-graph.truth.test.ts`).
 */

const RUNTIME = 'node@24.x'

/** "Start with two names for one object". */
export const aliasProgram: HeapProgram = {
  id: 'alias',
  snippet: `const original = { count: 1 }
const alias = original
alias.count = 2

console.log(original.count) // 2
console.log(original === alias) // true`,
  runtime: RUNTIME,
  sha256: 'fd1eb57f1c2a61314b9aa5711519b8cc652e1c531ea2742a24ce974cfb86b09d',
  observed: ['2', 'true'],
  snapshots: [{ id: 'alias', after: 'end', bindings: ['original', 'alias'], results: ['original === alias'] }],
}

/** "Arguments follow the same assignment rule": recorded inside the call, after the parameter is rebound. */
export const updateProgram: HeapProgram = {
  id: 'update',
  snippet: `const original = { count: 1 }

function update(record) {
  record.count = 2
  record = { count: 99 }
  return record
}

const replacement = update(original)
console.log(original.count) // 2
console.log(replacement.count) // 99
console.log(original === replacement) // false`,
  runtime: RUNTIME,
  sha256: 'df471379bb4e1ae1b8e11184bcc342d485ea7bc3e59e5707195abf525f13fac3',
  observed: ['2', '99', 'false'],
  snapshots: [
    { id: 'rebind', after: 'record = { count: 99 }', bindings: ['original', 'record'], results: ['original.count'] },
  ],
}

/** "Spread makes a new outer object, not a new graph of everything reachable from it". */
export const spreadProgram: HeapProgram = {
  id: 'spread',
  snippet: `const original = { name: 'Alice', stats: { count: 1 } }
const copy = { ...original }
copy.name = 'Bob'
copy.stats.count = 2
console.log(original.name) // Alice
console.log(original.stats.count) // 2
console.log(original === copy) // false
console.log(original.stats === copy.stats) // true`,
  runtime: RUNTIME,
  sha256: '2e6a056f2a7a8547b3a3e5606ef2d3fe2e64cbe11d256269c68476b36d87c2c3',
  observed: ['Alice', '2', 'false', 'true'],
  snapshots: [
    { id: 'spread', after: 'end', bindings: ['original', 'copy'], results: ['original.stats === copy.stats'] },
  ],
}

export const dataTypesPrograms = [aliasProgram, updateProgram, spreadProgram]
