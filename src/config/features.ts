export function isTypescriptFirstPassEnabled(): boolean {
  const value = process.env.G4_TS_FIRST_PASS_ENABLED
  if (value === undefined || value === '' || value === 'false') return false
  if (value === 'true') return true
  throw new Error('G4_TS_FIRST_PASS_ENABLED must be true or false')
}
