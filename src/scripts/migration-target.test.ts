// @vitest-environment node
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { verifyMigrationTarget } from '../../.github/scripts/verify-migration-target.mjs'

const url = 'postgresql://fixture:private-password@direct.example.test/memoized?sslmode=require'
const fingerprint = createHash('sha256')
  .update(JSON.stringify(['direct.example.test', '5432', 'memoized', 'public']))
  .digest('hex')
const verify = (value: string, override?: string) => verifyMigrationTarget(value, override, fingerprint)

describe('explicit production migration target', () => {
  it('accepts only the reviewed direct routing without changing the connection string', () => {
    expect(verify(url)).toBe(fingerprint)
    expect(verify(url + '&schema=public')).toBe(fingerprint)
    expect(verify(url.replace('postgresql:', 'postgres:'))).toBe(fingerprint)
    expect(verify(url + '&connection_limit=1&pool_timeout=10')).toBe(fingerprint)
  })

  it.each([
    url.replace('direct.example.test', 'direct-pooler.example.test'),
    url.replace('/memoized?', '/another?'),
    url + '&schema=private',
    url.replace('direct.example.test', 'direct.example.test:5433'),
  ])('rejects other routing rather than repairing or falling back', value => {
    expect(() => verify(value)).toThrow('reviewed direct migration target')
  })

  it.each([
    url + '&schema=public&schema=private',
    url + '&sslmode=disable',
    url + '&host=another.example.test',
    url + '&options=-c%20search_path=private',
    url + '&pgbouncer=true',
    url + '#fragment',
    url.replace('sslmode=require', 'sslmode=disable'),
    url.replace('?sslmode=require', ''),
    url.replace('postgresql:', 'https:'),
  ])('rejects ambiguous or unsafe connection options', value => {
    expect(() => verify(value)).toThrow()
  })

  it('never permits an advisory-lock bypass', () => {
    expect(() => verify(url, '1')).toThrow('advisory locking must remain enabled')
    expect(() => verify(url, 'true')).toThrow('advisory locking must remain enabled')
  })

  it('does not disclose credentials in validation errors', () => {
    for (const value of [url + '&host=another.example.test', 'private-password not a URL']) {
      let message: string | undefined
      try {
        verify(value)
      } catch (error) {
        if (!(error instanceof Error)) throw error
        message = error.message
      }
      expect(message).toBeTypeOf('string')
      expect(message).not.toContain('private-password')
      expect(message).not.toContain(value)
    }
  })

  it('rejects command-line credentials without echoing them', () => {
    const result = spawnSync(process.execPath, ['.github/scripts/verify-migration-target.mjs', url], {
      encoding: 'utf8', env: { ...process.env, DATABASE_URL: '' },
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('takes no command-line credentials')
    expect(result.stdout + result.stderr).not.toContain('private-password')
  })
})
