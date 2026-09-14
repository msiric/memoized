import { afterEach, describe, expect, it, vi } from 'vitest'
import { isTypescriptFirstPassEnabled } from './features'

describe('first-pass server flag', () => {
  afterEach(() => vi.unstubAllEnvs())

  it.each([undefined, '', 'false'])('defaults off for %s', value => {
    vi.stubEnv('G4_TS_FIRST_PASS_ENABLED', value)
    expect(isTypescriptFirstPassEnabled()).toBe(false)
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
