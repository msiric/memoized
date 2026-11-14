import type { StaticPreset, VerifiedProgram } from '../../../shell/static-types'
import { lookup, type EnvDiagram, type EnvSection } from '../model'

/**
 * Scope chain lesson (js-track/core-fundamentals/scope-chain), R4 shared
 * visual 2 extended with a call-stack column: at the moment of a read, the
 * calls on the stack on the left, the environment records on the right.
 * Lookup follows outer links fixed by where the code is written, not the
 * stack, and the first binding it meets stops it (even an uninitialized one).
 *
 * The programs are the lesson's own code, verbatim: "The Caller Is Not the
 * Lexical Parent" and Exercise 4. Records are `modelled` (ECMA-262); every
 * value drawn, every frame and each call's chain are `observed`:
 * `env-records.truth.test.ts` runs each program in Node 24, and pauses it
 * under the inspector at each frame's line to compare the stack and the
 * scope chain DevTools reports with the drawing.
 */

const RUNTIME = 'node@24.x'

// ---------------------------------------------------------------------------
// Panel 1: printName called from shadowName.
// ---------------------------------------------------------------------------

export const callerProgram: VerifiedProgram = {
  id: 'caller',
  snippet: `let name = 'Global'

function printName() {
  console.log(name)
}

function shadowName() {
  let name = 'Local'
  printName()
}

shadowName()`,
  runtime: RUNTIME,
  sha256: '9e797aa79253c087835729bdb9048aad5503dba976e73df13f10a4c460571332',
  observed: ['Global'],
}

const callerSection: EnvSection = {
  id: 'caller',
  heading: 'console.log(name)',
  emphasis: 'name',
  nodes: [
    { kind: 'frame', id: 'printName', title: ['printName()'], env: 'printCall', line: 4, reads: 'name', logs: 'Global' },
    { kind: 'frame', id: 'shadowName', title: ['shadowName()'], env: 'shadowCall', line: 9 },
    { kind: 'frame', id: 'moduleCode', title: ['module'], env: 'module', line: 12 },
    { kind: 'record', id: 'module', title: ['module'], bindings: [{ name: 'name', value: { text: "'Global'" } }], outer: null },
    {
      kind: 'record',
      id: 'printCall',
      title: ['printName() call', 'printName()\ncall'],
      bindings: [],
      outer: 'module',
    },
    {
      kind: 'record',
      id: 'shadowCall',
      title: ['shadowName() call', 'shadowName()\ncall'],
      bindings: [{ name: 'name', value: { text: "'Local'" } }],
      outer: 'module',
    },
  ],
}

/** The text a record shows for a string, unquoted: what console.log prints. */
const printed = (section: EnvSection, frame: string, name: string): string => {
  const v = lookup(section, frame, name)
  if (!v || !('text' in v)) throw new Error(`${section.id}: ${frame} cannot read ${name}`)
  return v.text.replace(/^'(.*)'$/, '$1')
}

export const callerIsNotLexicalParent: StaticPreset<EnvDiagram> = {
  id: 'caller-is-not-lexical-parent',
  label: 'Caller vs parent',
  title: 'Caller vs lexical parent',
  caption:
    "printName runs while shadowName is on the stack, but its lookup follows its outer link to the module, so it finds 'Global'.",
  programs: [callerProgram],
  data: {
    sections: [callerSection],
    align: 'top',
    hint: { hover: 'Hover printName() to trace its lookup.', tap: 'Tap printName() to trace its lookup.' },
  },
  claims: [
    {
      // Called from the module instead of from shadowName: the same binding.
      says: `printName reads name = ${printed(callerSection, 'printName', 'name')} from any caller`,
      program: 'caller',
      probe: 'printName()',
      expect: [printed(callerSection, 'printName', 'name')],
    },
  ],
}

// ---------------------------------------------------------------------------
// Panel 2: Exercise 4, an uninitialized block binding stops the lookup.
// ---------------------------------------------------------------------------

export const tdzProgram: VerifiedProgram = {
  id: 'tdz',
  snippet: `let x = 'module'

function read() {
  {
    console.log(x)
    let x = 'block'
  }
}

function caller() {
  let x = 'caller'
  read()
}

caller()`,
  runtime: RUNTIME,
  sha256: 'e4953d042df1bde3238acb86cca43de744989876b9a32f84b5001a1a3d98d045',
  observed: [],
  throws: 'ReferenceError',
}

const tdzSection: EnvSection = {
  id: 'tdz',
  heading: 'console.log(x)',
  emphasis: 'x',
  nodes: [
    { kind: 'frame', id: 'read', title: ['read()'], env: 'block', line: 5, reads: 'x', throws: 'ReferenceError' },
    { kind: 'frame', id: 'caller', title: ['caller()'], env: 'callerCall', line: 12 },
    { kind: 'frame', id: 'moduleCode', title: ['module'], env: 'module', line: 15 },
    { kind: 'record', id: 'module', title: ['module'], bindings: [{ name: 'x', value: { text: "'module'" } }], outer: null },
    { kind: 'record', id: 'readCall', title: ['read() call', 'read()\ncall'], bindings: [], outer: 'module' },
    {
      kind: 'record',
      id: 'callerCall',
      title: ['caller() call', 'caller()\ncall'],
      bindings: [{ name: 'x', value: { text: "'caller'" } }],
      outer: 'module',
    },
    {
      kind: 'record',
      id: 'block',
      title: ['block in read()', 'block'],
      bindings: [{ name: 'x', value: { text: "'block'" }, uninitialized: true }],
      outer: 'readCall',
    },
  ],
}

export const tdzStopsLookup: StaticPreset<EnvDiagram> = {
  id: 'tdz-stops-lookup',
  label: 'TDZ stops lookup',
  title: 'The first binding stops the lookup',
  caption:
    "The block's x is found first, so the search stops there: still uninitialized, the read throws instead of using caller or module.",
  programs: [tdzProgram],
  data: {
    sections: [tdzSection],
    align: 'top',
    hint: { hover: 'Hover read() to trace its lookup.', tap: 'Tap read() to trace its lookup.' },
  },
  // The program throws before any probe could run: its claims are the
  // inspector pauses and the error (env-records.truth.test.ts).
  claims: [],
}
