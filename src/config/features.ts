function booleanFeature(name: 'G4_TS_FIRST_PASS_ENABLED' | 'PRACTICE_GROUPING_ENABLED'): boolean {
  const value = process.env[name]
  if (value === undefined || value === '' || value === 'false') return false
  if (value === 'true') return true
  throw new Error(`${name} must be true or false`)
}

export function isTypescriptFirstPassEnabled(): boolean {
  return booleanFeature('G4_TS_FIRST_PASS_ENABLED')
}

export function isPracticeGroupingEnabled(): boolean {
  return booleanFeature('PRACTICE_GROUPING_ENABLED')
}
