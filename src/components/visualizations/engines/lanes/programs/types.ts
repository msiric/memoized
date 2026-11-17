/**
 * Advanced Types (js-track/typescript-introduction/advanced-types): the
 * register's panel code (not lesson code: the register wrote it to make the
 * inversion checkable), each case a separate file through `tsc --strict`
 * (`../truth/record.ts`). The value cases ask the compiler which object
 * literals each type admits; the member cases which reads it allows; the
 * `never` cases whether an intersection reduces to `never`.
 */

const AB = `type A = { a: string; shared: number }
type B = { b: string; shared: number }
`
const EQUAL = `type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false
`

export type TypeCase = { id: string; code: string }

/** The sample values, by the region they fall in. */
export const VALUES = {
  aOnly: "{ a: 'x', shared: 1 }",
  both: "{ a: 'x', b: 'y', shared: 1 }",
  bOnly: "{ b: 'y', shared: 1 }",
} as const

const admits = (type: string, value: string, id: string): TypeCase => ({ id, code: `${AB}const v: ${type} = ${value}\n` })

export const TYPE_CASES: readonly TypeCase[] = [
  admits('A | B', VALUES.aOnly, 'union-a'),
  admits('A | B', VALUES.both, 'union-both'),
  admits('A | B', VALUES.bOnly, 'union-b'),
  admits('A & B', VALUES.aOnly, 'inter-a'),
  admits('A & B', VALUES.both, 'inter-both'),
  admits('A & B', VALUES.bOnly, 'inter-b'),
  { id: 'union-shared', code: `${AB}declare const u: A | B\nu.shared\n` },
  { id: 'union-a-read', code: `${AB}declare const u: A | B\nu.a\n` },
  { id: 'union-b-read', code: `${AB}declare const u: A | B\nu.b\n` },
  { id: 'inter-reads', code: `${AB}declare const v: A & B\nv.a\nv.b\nv.shared\n` },
  { id: 'never-kind', code: `${EQUAL}const t: Equal<{ kind: 'a' } & { kind: 'b' }, never> = true\n` },
  { id: 'never-prims', code: `${EQUAL}const t: Equal<string & number, never> = true\n` },
  { id: 'never-kind-false', code: `${EQUAL}const t: Equal<{ kind: 'a' } & { kind: 'b' }, never> = false\n` },
  { id: 'never-x', code: `${EQUAL}const t: Equal<{ x: string } & { x: number }, never> = false\n` },
]

export type TypeDiagnostic = { code: number; line: number; message: string }
export type TypesRecording = { generator: string; tsc: string; sha256: string; cases: Record<string, TypeDiagnostic[]> }
