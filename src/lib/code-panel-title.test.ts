import { describe, expect, it } from 'vitest'
import { getPanelTitle } from './code-panel-title'

describe('shared code-panel labels', () => {
  it.each([
    ['js', 'JavaScript'], ['javascript', 'JavaScript'],
    ['ts', 'TypeScript'], ['typescript', 'TypeScript'],
    ['php', 'PHP'], ['python', 'Python'], ['ruby', 'Ruby'], ['go', 'Go'],
    ['json', 'Code'], ['bash', 'Code'], ['text', 'Code'], ['unknown', 'Code'],
  ])('keeps the existing renderer label for %s', (language, label) => {
    expect(getPanelTitle({ language })).toBe(label)
  })

  it('preserves explicit titles and the language-free fallback', () => {
    expect(getPanelTitle({ title: 'math.ts', language: 'typescript' })).toBe('math.ts')
    expect(getPanelTitle({ title: '', language: 'typescript' })).toBe('TypeScript')
    expect(getPanelTitle({})).toBe('Code')
  })
})
