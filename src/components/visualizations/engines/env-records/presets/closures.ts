import type {
  Claim,
  StaticPreset,
  VerifiedProgram,
} from '../../../shell/static-types'
import {
  bindingText,
  lookup,
  nodeById,
  referent,
  type EnvDiagram,
  type EnvSection,
} from '../model'

/**
 * Closures lesson (js-track/core-fundamentals/closures), spec §8.2.
 *
 * The programs are the lesson's own code, verbatim (panel 2 adds the one
 * line `const sameCounter = counter1` the spec asks the lesson to add).
 * Records are `modelled` (ECMA-262 FunctionDeclarationInstantiation and
 * CreatePerIterationEnvironment); every value drawn in them is `observed`:
 * the claims below are derived from the diagram data and re-checked against
 * a real Node run by `env-records.truth.test.ts`.
 */

const RUNTIME = 'node@24.x'

// ---------------------------------------------------------------------------
// Panel 1: var vs let per-iteration bindings.
// ---------------------------------------------------------------------------

const loop = (decl: 'var' | 'let') => `function buildFunctions() {
  var arr = []

  for (${decl} i = 0; i < 3; i++) {
    arr.push(function () {
      console.log(i)
    })
  }

  return arr
}

var fs = buildFunctions()
fs[0]()
fs[1]()
fs[2]()`

export const varLoopProgram: VerifiedProgram = {
  id: 'var',
  snippet: loop('var'),
  runtime: RUNTIME,
  sha256: '97999f3cea7c4b13b86c52221293354a4709635e61cc147d50358d2d024e1d27',
  observed: ['3', '3', '3'],
}

export const letLoopProgram: VerifiedProgram = {
  id: 'let',
  snippet: loop('let'),
  runtime: RUNTIME,
  sha256: '0af56b4758693df2ed9d8c70c30fe048a4351c0c01df10364899414f6121bd47',
  observed: ['0', '1', '2'],
}

const callTitle = ['buildFunctions() call', 'buildFunctions()\ncall'] as const
const fnTitle = (k: number) => [`anonymous #${k}`, `#${k}`] as const

const varSection: EnvSection = {
  id: 'var',
  heading: 'for (var i = 0; i < 3; i++)',
  emphasis: 'var',
  nodes: [
    {
      kind: 'record',
      id: 'call',
      title: callTitle,
      bindings: [
        { name: 'arr', value: { text: 'Array(3)' } },
        { name: 'i', value: { text: '3' } },
      ],
      outer: null,
    },
    ...[0, 1, 2].map((k) => ({
      kind: 'function' as const,
      id: `f${k}`,
      title: fnTitle(k),
      env: 'call',
      logs: '3',
    })),
  ],
  highlight: ['env:f0', 'env:f1', 'env:f2'],
}

const letSection: EnvSection = {
  id: 'let',
  heading: 'for (let i = 0; i < 3; i++)',
  emphasis: 'let',
  nodes: [
    {
      kind: 'record',
      id: 'call',
      title: callTitle,
      bindings: [{ name: 'arr', value: { text: 'Array(3)' } }],
      outer: null,
    },
    ...[0, 1, 2, 3].map((k) => ({
      kind: 'record' as const,
      id: `it${k}`,
      title: [`iteration i=${k}`, `iteration ${k}`, `iter ${k}`] as const,
      bindings: [{ name: 'i', value: { text: String(k) } }],
      outer: 'call',
      unused: k === 3,
    })),
    ...[0, 1, 2].map((k) => ({
      kind: 'function' as const,
      id: `f${k}`,
      title: fnTitle(k),
      env: `it${k}`,
      logs: String(k),
    })),
    {
      kind: 'slot',
      id: 'none',
      under: 'it3',
      title: ['no function saved', 'no ƒ saved', 'no ƒ'],
    },
  ],
  highlight: ['env:f0', 'env:f1', 'env:f2'],
  note: 'Hatched: i = 3 · the loop test fails, so no function is saved.',
}

export const varVsLetLoop: StaticPreset<EnvDiagram> = {
  id: 'var-vs-let-loop',
  label: 'var vs let loop',
  title: 'Loop bindings: var vs let',
  caption:
    'var gives the whole call one i, so every saved function reads the final 3; let gives each iteration its own binding.',
  programs: [varLoopProgram, letLoopProgram],
  data: { sections: [varSection, letSection], align: 'bottom' },
  claims: [varSection, letSection].flatMap((section) =>
    [0, 1, 2].map(
      (k): Claim => ({
        says: `${section.id}: fs[${k}] reads i = ${valueOf(section, `f${k}`, 'i')} through its [[Environment]]`,
        program: section.id,
        probe: `fs[${k}]()`,
        expect: [valueOf(section, `f${k}`, 'i')],
      }),
    ),
  ),
}

function valueOf(section: EnvSection, fn: string, name: string): string {
  const v = lookup(section, fn, name)
  if (!v || !('text' in v))
    throw new Error(`${section.id}: ${fn} cannot read ${name}`)
  return v.text
}

// ---------------------------------------------------------------------------
// Panel 2: factory calls vs aliases, and methods sharing one record.
// ---------------------------------------------------------------------------

export const countersProgram: VerifiedProgram = {
  id: 'counters',
  snippet: `function createCounter() {
  let count = 0
  return function () {
    count++
    console.log(count)
  }
}

const counter1 = createCounter()
counter1()
counter1()
const sameCounter = counter1

const counter2 = createCounter()
counter2()`,
  runtime: RUNTIME,
  sha256: 'e0790ea68b28abe0c4eeda10f67b3d200830d5bd62923fd2cb256c76b113f67b',
  observed: ['1', '2', '1'],
}

export const accountProgram: VerifiedProgram = {
  id: 'account',
  snippet: `function createBankAccount() {
  let balance = 0

  return {
    deposit: function (amount) {
      if (amount > 0) {
        balance += amount
        console.log(\`Deposited: $\${amount}\`)
      } else {
        console.log('Invalid deposit amount')
      }
    },
    withdraw: function (amount) {
      if (amount > 0 && amount <= balance) {
        balance -= amount
        console.log(\`Withdrew: $\${amount}\`)
      } else {
        console.log('Invalid withdraw amount')
      }
    },
    getBalance: function () {
      console.log(\`Balance: $\${balance}\`)
    },
  }
}

const account = createBankAccount()
account.deposit(100)
account.withdraw(30)
account.getBalance()
console.log(account.balance)
account.withdraw(80)

const secondAccount = createBankAccount()
secondAccount.getBalance()`,
  runtime: RUNTIME,
  sha256: '07337ed865f3fd14adbca8b299a67a22b7ddeed0bb6fec7029686bd1e68e84ee',
  observed: [
    'Deposited: $100',
    'Withdrew: $30',
    'Balance: $70',
    'undefined',
    'Invalid withdraw amount',
    'Balance: $0',
  ],
}

const counterTitle = (c: 'A' | 'B') =>
  [`createCounter() call ${c}`, `createCounter()\ncall ${c}`] as const

const countersSection: EnvSection = {
  id: 'counters',
  heading: 'const sameCounter = counter1',
  emphasis: 'sameCounter',
  nodes: [
    {
      kind: 'record',
      id: 'module',
      title: ['module'],
      bindings: [
        { name: 'counter1', value: { ref: 'fA' } },
        { name: 'sameCounter', value: { ref: 'fA' } },
        { name: 'counter2', value: { ref: 'fB' } },
      ],
      outer: null,
    },
    {
      kind: 'record',
      id: 'callA',
      title: counterTitle('A'),
      bindings: [{ name: 'count', value: { text: '2' } }],
      outer: 'module',
      drawOuter: false,
    },
    {
      kind: 'record',
      id: 'callB',
      title: counterTitle('B'),
      bindings: [{ name: 'count', value: { text: '1' } }],
      outer: 'module',
      drawOuter: false,
    },
    { kind: 'function', id: 'fA', title: ['A'], env: 'callA' },
    { kind: 'function', id: 'fB', title: ['B'], env: 'callB' },
  ],
  highlight: ['ref:module.counter1', 'ref:module.sameCounter'],
}

const methods = ['deposit', 'withdraw', 'getBalance'] as const

const accountSection: EnvSection = {
  id: 'account',
  heading: 'const account = createBankAccount()',
  emphasis: 'createBankAccount()',
  nodes: [
    {
      kind: 'record',
      id: 'call',
      title: ['createBankAccount() call', 'createBankAccount()\ncall'],
      bindings: [{ name: 'balance', value: { text: '70' } }],
      outer: null,
    },
    ...methods.map((name) => ({
      kind: 'function' as const,
      id: name,
      title: [name] as const,
      env: 'call',
    })),
  ],
  highlight: [],
}

/** What calling a counter name prints next: its record's count plus one. */
function nextCount(name: string, after = 0): string {
  const fn = nodeById(
    countersSection,
    referent(countersSection, 'module', name),
  )
  if (fn.kind !== 'function')
    throw new Error(`${name} does not refer to a function`)
  return String(
    Number(bindingText(countersSection, fn.env, 'count')) + 1 + after,
  )
}

const sameFunction = (a: string, b: string) =>
  String(
    referent(countersSection, 'module', a) ===
      referent(countersSection, 'module', b),
  )

const sharesBalance = methods.every(
  (m) => (nodeById(accountSection, m) as { env: string }).env === 'call',
)
const balance = Number(bindingText(accountSection, 'call', 'balance'))

export const factoryCallsVsAliases: StaticPreset<EnvDiagram> = {
  id: 'factory-calls-vs-aliases',
  label: 'Factories, aliases',
  title: 'Factory calls vs aliases',
  caption:
    'Each factory call creates a new record; another name for the same function is not a new counter.',
  programs: [countersProgram, accountProgram],
  data: { sections: [countersSection, accountSection], align: 'top' },
  claims: [
    ...(['counter1', 'sameCounter', 'counter2'] as const).map(
      (name): Claim => ({
        says: `${name}() continues from count = ${Number(nextCount(name)) - 1} in its own record`,
        program: 'counters',
        probe: `${name}()`,
        expect: [nextCount(name)],
      }),
    ),
    {
      says: 'counter1 and sameCounter name one function; counter2 names another',
      program: 'counters',
      probe: 'console.log(sameCounter === counter1, counter2 === counter1)',
      expect: [
        `${sameFunction('sameCounter', 'counter1')} ${sameFunction('counter2', 'counter1')}`,
      ],
    },
    {
      says: 'a call through either name updates the one count the other reads',
      program: 'counters',
      probe: 'sameCounter()\ncounter1()',
      expect: [nextCount('sameCounter'), nextCount('counter1', 1)],
    },
    {
      says: `the account's record holds balance = ${balance}`,
      program: 'account',
      probe: 'account.getBalance()',
      expect: [`Balance: $${balance}`],
    },
    {
      says: 'deposit and getBalance share one balance binding',
      program: 'account',
      probe: 'account.deposit(5)\naccount.getBalance()',
      expect: [
        'Deposited: $5',
        `Balance: $${sharesBalance ? balance + 5 : balance}`,
      ],
    },
  ],
}
