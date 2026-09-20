import { afterEach, describe, expect, it, vi } from 'vitest'
import { isPracticeGroupingEnabled, isTypescriptFirstPassEnabled } from './features'

describe('first-pass server flag', () => {
  afterEach(() => vi.unstubAllEnvs())

  it.each([undefined, '', 'false'])('defaults off for %s', value => {
    vi.stubEnv('G4_TS_FIRST_PASS_ENABLED', value)
    expect(isTypescriptFirstPassEnabled()).toBe(false)
  })

  describe('platform-wide practice grouping flag', () => {
    afterEach(() => vi.unstubAllEnvs())

    it.each([undefined, '', 'false'])('keeps the existing reader for %s', value => {
      vi.stubEnv('PRACTICE_GROUPING_ENABLED', value)
      expect(isPracticeGroupingEnabled()).toBe(false)
    })

    it('activates only explicitly without changing the guided-path flag', () => {
      vi.stubEnv('PRACTICE_GROUPING_ENABLED', 'true')
      vi.stubEnv('G4_TS_FIRST_PASS_ENABLED', 'false')
      expect(isPracticeGroupingEnabled()).toBe(true)
      expect(isTypescriptFirstPassEnabled()).toBe(false)
    })

    it('rejects an invalid configuration instead of silently choosing a reader', () => {
      vi.stubEnv('PRACTICE_GROUPING_ENABLED', 'yes')
      expect(() => isPracticeGroupingEnabled()).toThrow('PRACTICE_GROUPING_ENABLED must be true or false')
    })
  })
  it('enables only the explicit accepted value', () => {
    vi.stubEnv('G4_TS_FIRST_PASS_ENABLED', 'true')
    expect(isTypescriptFirstPassEnabled()).toBe(true)
  })
  it('does not silently accept an invalid flag', () => {
    vi.stubEnv('G4_TS_FIRST_PASS_ENABLED', 'yes')
    expect(() => isTypescriptFirstPassEnabled()).toThrow(/must be true or false/)
  })
})
