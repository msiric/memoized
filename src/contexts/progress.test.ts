import { beforeEach, describe, expect, it } from 'vitest'
import { useContentStore } from './progress'
import type { LessonConfig, ProblemConfig } from '@/types'
import type { ProgressSnapshot } from '@/types/progress'

const store = () => useContentStore.getState()
const snapshot = (userId: string | null = 'a', problems = ['p1', 'optional', 'unrelated']): ProgressSnapshot => ({
  userId, completedLessons: ['l1', 'other-lesson'], completedProblems: problems,
})
const lessons = [{ id: 'l1' }] as LessonConfig[]
const problems = [{ id: 'p1' }, { id: 'p2' }] as ProblemConfig[]

beforeEach(() => useContentStore.setState(useContentStore.getInitialState(), true))

describe('Full-user progress store', () => {
  it('distinguishes loading, ready, unavailable and anonymous without retaining other accounts', () => {
    expect(store()).toMatchObject({ progressOwnerId: undefined, progressStatus: 'loading' })
    store().hydrateProgressSnapshot(snapshot())
    expect(store()).toMatchObject({ progressOwnerId: 'a', progressStatus: 'ready' })
    store().setProgressUnavailable('a')
    expect(store().progressStatus).toBe('unavailable')
    expect(store().completedProblems.has('p1')).toBe(true)
    store().setProgressUnavailable('b')
    expect(store()).toMatchObject({ progressOwnerId: 'b', progressStatus: 'unavailable' })
    expect(store().completedProblems.size).toBe(0)
    store().hydrateProgressSnapshot(snapshot('b'))
    store().hydrateProgressSnapshot(snapshot(null))
    expect(store()).toMatchObject({ progressOwnerId: null, progressStatus: 'anonymous' })
    expect(store().completedLessons.size).toBe(0)
    expect(store().completedProblems.size).toBe(0)
  })

  it('atomically replaces both full sets and readiness', () => {
    store().hydrateProgressSnapshot(snapshot())
    const observed: unknown[] = []
    const unsubscribe = useContentStore.subscribe((state) => observed.push({
      owner: state.progressOwnerId, status: state.progressStatus,
      lessons: [...state.completedLessons], problems: [...state.completedProblems],
    }))
    store().hydrateProgressSnapshot({ userId: 'b', completedLessons: ['b-lesson'], completedProblems: ['b-problem'] })
    unsubscribe()
    expect(observed).toEqual([{ owner: 'b', status: 'ready', lessons: ['b-lesson'], problems: ['b-problem'] }])
  })

  it('clears marks on a known account change before the new snapshot arrives', () => {
    store().hydrateProgressSnapshot(snapshot())
    store().setProgressOwner('b')
    expect(store()).toMatchObject({ progressOwnerId: 'b', progressStatus: 'loading', currentProblemProgress: 0 })
    expect(store().completedProblems.size).toBe(0)
    store().setProgressOwner(null)
    expect(store().progressStatus).toBe('anonymous')
  })

  it('distinguishes unavailable session identity from a subsequently known anonymous visitor', () => {
    store().setProgressUnavailable(null)
    expect(store().progressStatus).toBe('unavailable')
    store().setProgressOwner(null)
    expect(store().progressStatus).toBe('anonymous')
  })

  it('uses finite zero percentages for empty initialization and writes', () => {
    store().initializeContent([], [], [], [], [])
    expect(store().currentLessonProgress).toBe(0)
    expect(store().currentProblemProgress).toBe(0)
    store().toggleCompletedLesson('unknown')
    store().toggleCompletedProblem('unknown')
    expect(store().currentLessonProgress).toBe(0)
    expect(store().currentProblemProgress).toBe(0)
  })

  it('updates nonzero percentages to zero and recalculates metadata-only totals', () => {
    store().initializeContent(['l1'], ['p1'], [], lessons, problems)
    expect(store().currentLessonProgress).toBe(100)
    expect(store().currentProblemProgress).toBe(50)
    store().updateContent([], [])
    expect(store().currentLessonProgress).toBe(0)
    expect(store().currentProblemProgress).toBe(0)
    store().updateContent(['l1'], ['p1'])
    store().updateContent(undefined, undefined, [], [], [])
    expect(store().currentProblemProgress).toBe(0)
    expect(store().completedProblems.has('p1')).toBe(true)
  })

  it('preserves optional and unrelated marks when navigation provides only metadata', () => {
    store().hydrateProgressSnapshot(snapshot())
    const revision = store().progressRevision
    store().updateContent(undefined, undefined, [], lessons, problems)
    expect(store().completedLessons).toEqual(new Set(['l1', 'other-lesson']))
    expect(store().completedProblems).toEqual(new Set(['p1', 'optional', 'unrelated']))
    expect(store().currentProblemProgress).toBe(50)
    expect(store().progressRevision).toBe(revision)
  })

  it('assigns confirmed mark/unmark values idempotently and blocks same-item overlap', () => {
    store().hydrateProgressSnapshot(snapshot('a', []))
    const token = store().beginProblemSave('a', 'p1')!
    expect(store().beginProblemSave('a', 'p1')).toBeNull()
    expect(store().completedProblems.has('p1')).toBe(false)
    expect(store().finishProblemSave('a', 'p1', token, true)).toBe(true)
    expect(store().finishProblemSave('a', 'p1', token, true)).toBe(false)
    const second = store().beginProblemSave('a', 'p1')!
    store().finishProblemSave('a', 'p1', second, true)
    expect(store().completedProblems.has('p1')).toBe(true)
    const third = store().beginProblemSave('a', 'p1')!
    store().finishProblemSave('a', 'p1', third, false)
    const fourth = store().beginProblemSave('a', 'p1')!
    store().finishProblemSave('a', 'p1', fourth, false)
    expect(store().completedProblems.has('p1')).toBe(false)
  })

  it('allows independent saves to finish out of order without dropping either', () => {
    store().hydrateProgressSnapshot(snapshot('a', []))
    const first = store().beginProblemSave('a', 'p1')!
    const second = store().beginProblemSave('a', 'p2')!
    store().finishProblemSave('a', 'p2', second, true)
    store().finishProblemSave('a', 'p1', first, true)
    expect(store().completedProblems).toEqual(new Set(['p1', 'p2']))
  })

  it('leaves the last confirmed mark after failure and permits retry', () => {
    store().hydrateProgressSnapshot(snapshot())
    const token = store().beginProblemSave('a', 'p1')!
    store().finishProblemSave('a', 'p1', token)
    expect(store().completedProblems.has('p1')).toBe(true)
    expect(store().beginProblemSave('a', 'p1')).not.toBeNull()
  })

  it('rejects old-account responses even after switching away and back', () => {
    store().hydrateProgressSnapshot(snapshot('a', []))
    const token = store().beginProblemSave('a', 'p1')!
    store().setProgressOwner('b')
    store().hydrateProgressSnapshot(snapshot('a', []))
    const next = store().beginProblemSave('a', 'p1')!
    expect(store().finishProblemSave('a', 'p1', token, true)).toBe(false)
    expect(store().pendingProblems.get('p1')).toBe(next)
    expect(store().completedProblems.has('p1')).toBe(false)
  })

  it('rejects stale refresh reads and reads while a save is pending', () => {
    store().hydrateProgressSnapshot(snapshot())
    const revision = store().progressRevision
    const token = store().beginProblemSave('a', 'p2')!
    expect(store().hydrateProgressSnapshot(snapshot('a', []))).toBe(false)
    store().finishProblemSave('a', 'p2', token, true)
    expect(store().hydrateProgressSnapshot(snapshot('a', []), revision)).toBe(false)
    expect(store().completedProblems.has('p2')).toBe(true)
    expect(store().hydrateProgressSnapshot(snapshot('a', []), store().progressRevision)).toBe(true)
    expect(store().completedProblems.size).toBe(0)
  })

  it('rejects late snapshots after switching accounts, including away and back', () => {
    store().hydrateProgressSnapshot(snapshot())
    const revision = store().progressRevision
    store().hydrateProgressSnapshot(snapshot('b', ['b-only']))
    expect(store().hydrateProgressSnapshot(snapshot(), revision)).toBe(false)
    store().hydrateProgressSnapshot(snapshot('a', ['new-a-mark']))
    expect(store().hydrateProgressSnapshot(snapshot(), revision)).toBe(false)
    expect(store().completedProblems).toEqual(new Set(['new-a-mark']))
  })

  it('protects pending and confirmed values from stale server-action header revalidation', () => {
    store().hydrateProgressSnapshot(snapshot('a', ['optional', 'unrelated']))
    const token = store().beginProblemSave('a', 'p1')!
    store().hydrateProgressFromHeader({ status: 'ready', ...snapshot('a', ['p1', 'optional']), userId: 'a' })
    expect(store().completedProblems).toEqual(new Set(['optional', 'unrelated']))
    store().finishProblemSave('a', 'p1', token, true)
    store().hydrateProgressFromHeader({ status: 'ready', ...snapshot('a', ['unrelated']), userId: 'a' })
    expect(store().completedProblems).toEqual(new Set(['optional', 'unrelated', 'p1']))
    const unmark = store().beginProblemSave('a', 'p1')!
    store().finishProblemSave('a', 'p1', unmark, false)
    store().hydrateProgressFromHeader({ status: 'ready', ...snapshot(), userId: 'a' })
    expect(store().completedProblems.has('p1')).toBe(false)
    expect(store().completedProblems.has('optional')).toBe(true)
    store().hydrateProgressSnapshot(snapshot('a', ['p2']))
    store().hydrateProgressFromHeader({ status: 'ready', ...snapshot(), userId: 'a' })
    expect(store().completedProblems).toEqual(new Set(['p2']))
  })
})
