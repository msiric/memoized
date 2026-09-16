// @vitest-environment node
import vm from 'node:vm'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { G3B_LOCAL_STARTERS } from './g3b-local-practice'

describe('local starter contract', () => {
  it.each(G3B_LOCAL_STARTERS)('$language stays explicitly unimplemented rather than pretending to pass', starter => {
    const code = starter.language === 'typescript'
      ? ts.transpileModule(starter.code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
      : starter.code
    expect(() => new vm.Script(code).runInNewContext({}, { timeout: 1000 }))
      .toThrow('Not implemented: write your solution here.')
    expect(starter.code).toContain('findLongestCommonSubstring("abcdxyz", "xyzabcd")')
    expect(starter.commands).toContain(starter.filename)
    expect(starter.code).not.toContain('Array.from')
  })
})
