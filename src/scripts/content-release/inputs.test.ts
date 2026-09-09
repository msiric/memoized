import { describe, expect, it } from 'vitest'
import { fullRevision, verifyEnvironment } from './inputs'

const environment = {
  label: 'isolated fixture', mode: 'rehearsal',
  database: { host: 'localhost:5433', name: 'memoized_g0_fixture', schema: 'public' },
  search: { endpoint: 'http://127.0.0.1:7707' },
}
const database = 'postgresql://test:fake@localhost:5433/memoized_g0_fixture?schema=public&connection_limit=2'
const search = 'http://127.0.0.1:7707'

describe('reviewed publishing inputs', () => {
  it('requires immutable full commit references', () => {
    expect(fullRevision('a'.repeat(40), 'source')).toBe('a'.repeat(40))
    for (const value of ['master', 'HEAD', 'abc123', 'A'.repeat(40), '--help']) {
      expect(() => fullRevision(value, 'source')).toThrow(/full immutable/)
    }
  })

  it('matches physical data-service targets without including credentials', () => {
    expect(verifyEnvironment(environment, database, `${search}/`)).toEqual(environment)
    expect(JSON.stringify(verifyEnvironment(environment, database, search))).not.toContain('fake')
  })

  it.each([
    database.replace('localhost', 'production.example'),
    database.replace('memoized_g0_fixture', 'postgres'),
    database.replace('schema=public', 'schema=private'),
    database + '&host=/private/socket',
    database + '&schema=private',
    database + '&options=endpoint%3Dother',
  ])('rejects unexpected or ambiguous database targets', (url) => {
    expect(() => verifyEnvironment(environment, url, search)).toThrow()
  })

  it.each([
    'https://production.example',
    `${search}/another-instance`,
    'http://token:secret@127.0.0.1:7707',
    `${search}?key=secret`,
  ])('rejects changed or credential-bearing search targets', (url) => {
    expect(() => verifyEnvironment(environment, database, url)).toThrow()
  })

  it('cannot relabel nonlocal services as a rehearsal', () => {
    const remote = {
      ...environment,
      database: { ...environment.database, host: 'database.example' },
      search: { endpoint: 'https://search.example' },
    }
    expect(() => verifyEnvironment(remote,
      'postgresql://test:fake@database.example/memoized_g0_fixture?schema=public',
      'https://search.example')).toThrow(/loopback/)
  })

  it('requires nonempty target identities and an explicit environment mode', () => {
    expect(() => verifyEnvironment({ ...environment, mode: 'preview' }, database, search)).toThrow()
    expect(() => verifyEnvironment({ ...environment, database: { ...environment.database, name: '' } }, database, search)).toThrow()
  })
})
