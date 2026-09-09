import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { isDeepStrictEqual } from 'node:util'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

export type ReleaseEnvironment = {
  label: string
  mode: 'rehearsal' | 'production'
  database: { host: string; name: string; schema: string }
  search: { endpoint: string }
}

export function verifyEnvironment(value: unknown, databaseUrl: string, searchUrl: string): ReleaseEnvironment {
  if (!isRecord(value) || typeof value.label !== 'string' || !value.label.trim() ||
      (value.mode !== 'rehearsal' && value.mode !== 'production') ||
      !isRecord(value.database) || !isRecord(value.search) ||
      typeof value.database.host !== 'string' || typeof value.database.name !== 'string' ||
      typeof value.database.schema !== 'string' || typeof value.search.endpoint !== 'string' ||
      !value.database.host.trim() || !value.database.name.trim() ||
      !value.database.schema.trim() || !value.search.endpoint.trim()) {
    throw new Error('A reviewed environment descriptor with explicit data-service targets is required')
  }
  const database = new URL(databaseUrl)
  const search = new URL(searchUrl)
  if (!['postgres:', 'postgresql:'].includes(database.protocol) ||
      database.hash || database.searchParams.getAll('schema').length > 1 ||
      ['host', 'port', 'dbname', 'database', 'options'].some((key) => database.searchParams.has(key)) ||
      !['http:', 'https:'].includes(search.protocol) || search.username || search.password || search.search || search.hash) {
    throw new Error('Invalid or credential-bearing release target URL')
  }
  const actualDatabase = {
    host: database.host,
    name: decodeURIComponent(database.pathname.slice(1)),
    schema: database.searchParams.get('schema') ?? 'public',
  }
  const actualSearch = { endpoint: `${search.origin}${search.pathname.replace(/\/+$/, '')}` }
  if (!isDeepStrictEqual(actualDatabase, value.database) || !isDeepStrictEqual(actualSearch, value.search)) {
    throw new Error('Configured data services do not match the reviewed environment descriptor')
  }
  const local = (hostname: string) => ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname)
  if (value.mode === 'rehearsal' && (!local(database.hostname) || !local(search.hostname))) {
    throw new Error('Rehearsal publishing must use loopback database and search services')
  }
  return {
    label: value.label, mode: value.mode,
    database: { host: value.database.host, name: value.database.name, schema: value.database.schema },
    search: { endpoint: value.search.endpoint },
  }
}

export function fullRevision(value: string, label: string): string {
  if (!/^[a-f0-9]{40}$/.test(value)) throw new Error(`${label} must be a full immutable commit SHA`)
  return value
}

function git(cwd: string, args: string[]) {
  return execFileSync('git', ['-C', cwd, ...args], {
    encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()
}

export function verifyAppRevision(root: string, revision: string) {
  fullRevision(revision, 'App revision')
  if (git(root, ['rev-parse', 'HEAD']) !== revision ||
      git(root, ['status', '--porcelain', '--untracked-files=normal']) !== '') {
    throw new Error('Publisher app must be a clean checkout of the approved app revision')
  }
}

/** Read Git objects, not mutable working-tree payloads. */
export function archiveContent(repository: string, revision: string) {
  fullRevision(revision, 'Content revision')
  if (git(repository, ['rev-parse', '--verify', `${revision}^{commit}`]) !== revision) {
    throw new Error('Content revision is not an available commit')
  }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'memoized-content-release-'))
  fs.chmodSync(directory, 0o700)
  try {
    const archive = execFileSync('git', ['-C', repository, 'archive', revision, 'content', 'resources'], {
      maxBuffer: 32 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
    })
    execFileSync('tar', ['-x', '-C', directory], { input: archive, stdio: ['pipe', 'pipe', 'pipe'] })
    return {
      directory,
      dispose: () => fs.rmSync(directory, { recursive: true }),
    }
  } catch (error) {
    fs.rmSync(directory, { recursive: true })
    throw error
  }
}
