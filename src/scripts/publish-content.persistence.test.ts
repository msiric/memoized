import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { publishContent } from './publish-content'
import { ADDITIVE_CHANGE_CLASS } from './content-release/scope'
import { G3B_LESSON_UID, G3B_TASK } from '@/lib/g3b-task'

const mocks = vi.hoisted(() => ({
  archive: vi.fn(), appRevision: vi.fn(), prepare: vi.fn(), apply: vi.fn(),
  check: vi.fn(), read: vi.fn(), describe: vi.fn(), index: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({ default: { $disconnect: vi.fn() } }))
vi.mock('./content-release/inputs', async original => ({
  ...(await original<typeof import('./content-release/inputs')>()),
  archiveContent: mocks.archive, verifyAppRevision: mocks.appRevision,
}))
vi.mock('./content-release/plan', () => ({
  planInPlaceRelease: mocks.prepare, applyInPlaceRelease: mocks.apply,
  checkReleaseState: mocks.check, readReleaseCatalog: mocks.read, describeInPlacePlan: mocks.describe,
}))
vi.mock('./index-search', () => ({ indexLessons: mocks.index }))

const root = path.join(process.cwd(), '.publisher-journal-unit-work')
const environment = path.join(root, 'targets.json')
const nativeUuid = '11111111-2222-4333-8444-555555555555'
const creation = { kind: 'problem', contentId: G3B_TASK.contentId, status: 'created', id: nativeUuid }
let serial = 0
function args(apply = false, plan = '') {
  return [
    '--repository', root, '--base', 'b'.repeat(40), '--candidate', 'c'.repeat(40),
    '--app', 'a'.repeat(40), '--environment', environment,
    '--report', path.join(root, `journal-${++serial}.json`),
    '--change-class', ADDITIVE_CHANGE_CLASS, '--lesson', G3B_LESSON_UID,
    ...(apply ? ['--apply', '--independent', '--approval', 'synthetic-unit-approval', '--expected-plan', plan] : []),
  ]
}
beforeEach(() => {
  vi.resetAllMocks()
  fs.mkdirSync(path.join(root, 'app'), { recursive: true })
  fs.writeFileSync(environment, JSON.stringify({
    label: 'unit-only targets', mode: 'rehearsal',
    database: { host: '127.0.0.1:1', name: 'unit', schema: 'public' },
    search: { endpoint: 'http://127.0.0.1:1' },
  }))
  vi.stubEnv('DATABASE_URL', 'postgresql://unit:unit@127.0.0.1:1/unit?schema=public')
  vi.stubEnv('MEILISEARCH_HOST', 'http://127.0.0.1:1')
  vi.spyOn(process, 'cwd').mockReturnValue(path.join(root, 'app'))
  vi.spyOn(console, 'log').mockImplementation(() => {})
  mocks.archive.mockReturnValue({ directory: '/synthetic-source', dispose: vi.fn() })
  mocks.prepare.mockResolvedValue({ changes: [], creations: [{ contentId: G3B_TASK.contentId }] })
  mocks.describe.mockReturnValue({
    changeClass: ADDITIVE_CHANGE_CLASS, profile: 'g3b-native-task-minimum',
    createdEntities: [{ contentId: G3B_TASK.contentId, answerSha256: 'd'.repeat(64) }],
    inventories: { before: { counts: { problems: 506 } }, candidate: { counts: { problems: 507 } } },
  })
  mocks.read.mockResolvedValue([])
  mocks.apply.mockImplementation(async (_plan, onChange) => { onChange(creation); return [creation] })
  mocks.index.mockResolvedValue({ documents: 120 })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  fs.rmSync(root, { recursive: true, force: true })
})

describe('publisher CLI journal/hash/index sequencing (unit mocks)', () => {
  it('has a deterministic reviewed hash and journals exact creation UUID before staging/swap indexing', async () => {
    const first = await publishContent(args())
    const repeat = await publishContent(args())
    expect(first.planSha256).toBe(repeat.planSha256)
    expect(mocks.apply).not.toHaveBeenCalled()
    const invocation = args(true, first.planSha256)
    const result = await publishContent(invocation)
    expect(result.status).toBe('published-awaiting-live-acceptance')
    expect(result.changes).toEqual([creation])
    const report = invocation[invocation.indexOf('--report') + 1]
    expect(JSON.parse(fs.readFileSync(report, 'utf8'))).toMatchObject({
      changes: [creation], indexResult: { documents: 120 }, cleanup: 'succeeded',
    })
    expect(mocks.apply.mock.invocationCallOrder[0]).toBeLessThan(mocks.index.mock.invocationCallOrder[0])
    expect(mocks.index).toHaveBeenCalledTimes(1)
  })
  it('blocks all mutations on wrong reviewed hash or changed prepared payload', async () => {
    const reviewed = await publishContent(args())
    await expect(publishContent(args(true, 'f'.repeat(64)))).rejects.toThrow(/separately reviewed plan/)
    mocks.describe.mockReturnValue({ different: 'payload or metadata' })
    await expect(publishContent(args(true, reviewed.planSha256))).rejects.toThrow(/separately reviewed plan/)
    expect(mocks.apply).not.toHaveBeenCalled()
    expect(mocks.index).not.toHaveBeenCalled()
  })
  it('reserves an exclusive journal before writes and refuses previous journal reuse', async () => {
    const invocation = args()
    await publishContent(invocation)
    await expect(publishContent(invocation)).rejects.toThrow(/EEXIST/)
    expect(mocks.prepare).toHaveBeenCalledTimes(1)
    expect(mocks.apply).not.toHaveBeenCalled()
  })
  it('blocks persistence when the planned journal cannot be saved', async () => {
    const reviewed = await publishContent(args())
    vi.spyOn(fs, 'renameSync').mockImplementationOnce(() => { throw new Error('503 journal unavailable') })
    await expect(publishContent(args(true, reviewed.planSha256))).rejects.toThrow(/503 journal/)
    expect(mocks.apply).not.toHaveBeenCalled()
    expect(mocks.index).not.toHaveBeenCalled()
  })
  it('does not index or continue dependent writes when saving the creation receipt fails', async () => {
    const reviewed = await publishContent(args())
    const rename = fs.renameSync.bind(fs)
    let rejected = false
    vi.spyOn(fs, 'renameSync').mockImplementation((source, destination) => {
      const journal = JSON.parse(fs.readFileSync(source, 'utf8'))
      if (!rejected && journal.changes.length) {
        rejected = true
        throw new Error('503 creation journal unavailable')
      }
      return rename(source, destination)
    })
    let dependent = false
    mocks.apply.mockImplementation(async (_plan, onChange) => {
      onChange(creation)
      dependent = true
      return [creation]
    })
    await expect(publishContent(args(true, reviewed.planSha256))).rejects.toThrow(/creation journal/)
    expect(dependent).toBe(false)
    expect(mocks.index).not.toHaveBeenCalled()
  })
  it('keeps complete creation receipts on index failure and retries using the same reviewed plan', async () => {
    const reviewed = await publishContent(args())
    mocks.index.mockRejectedValueOnce(new Error('unknown search receipt'))
    const failedArgs = args(true, reviewed.planSha256)
    await expect(publishContent(failedArgs)).rejects.toThrow(/search receipt/)
    const report = failedArgs[failedArgs.indexOf('--report') + 1]
    expect(JSON.parse(fs.readFileSync(report, 'utf8'))).toMatchObject({ status: 'failed', changes: [creation] })
    mocks.apply.mockImplementation(async (_plan, onChange) => {
      const retained = { ...creation, status: 'already-created' }
      onChange(retained)
      return [retained]
    })
    expect((await publishContent(args(true, reviewed.planSha256))).changes[0]).toMatchObject({
      status: 'already-created', id: nativeUuid,
    })
  })
  it('leaves unchanged 506-catalog profile validation/apply as a no-op', async () => {
    mocks.prepare.mockResolvedValue({ changes: [], creations: [] })
    mocks.apply.mockResolvedValue([])
    const reviewed = await publishContent(args())
    expect((await publishContent(args(true, reviewed.planSha256))).status).toBe('unchanged')
    expect(mocks.index).not.toHaveBeenCalled()
  })
})
