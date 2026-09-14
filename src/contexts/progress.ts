import { Curriculum, LessonConfig, ProblemConfig } from '@/types'
import type { ProgressSnapshot, ProgressSnapshotResult } from '@/types/progress'
import { create } from 'zustand'

interface ContentStore {
  progressOwnerId: string | null | undefined
  progressStatus: 'loading' | 'ready' | 'anonymous' | 'unavailable'
  progressRevision: number
  progressEpoch: number
  completedLessons: Set<string>
  completedProblems: Set<string>
  pendingProblems: Map<string, number>
  confirmedLessonChanges: Map<string, boolean>
  confirmedProblemChanges: Map<string, boolean>
  fullCurriculum: Curriculum[]
  allLessons: LessonConfig[]
  allProblems: ProblemConfig[]
  currentLessonProgress: number
  currentProblemProgress: number
  setProgressOwner: (userId: string | null | undefined) => void
  hydrateProgressSnapshot: (snapshot: ProgressSnapshot, expectedRevision?: number) => boolean
  hydrateProgressFromHeader: (result: ProgressSnapshotResult) => void
  setProgressUnavailable: (userId: string | null) => void
  beginProblemSave: (userId: string, problemId: string) => number | null
  finishProblemSave: (userId: string, problemId: string, token: number, completed?: boolean) => boolean
  updateContent: (
    completedLessons?: string[],
    completedProblems?: string[],
    fullCurriculum?: Curriculum[],
    allLessons?: LessonConfig[],
    allProblems?: ProblemConfig[],
  ) => void
  initializeContent: (
    completedLessons: string[],
    completedProblems: string[],
    fullCurriculum: Curriculum[],
    allLessons: LessonConfig[],
    allProblems: ProblemConfig[],
  ) => void
  toggleCompletedLesson: (lessonId: string) => void
  toggleCompletedProblem: (problemId: string) => void
}

const calculateProgress = <T extends { id: string }>(completed: Set<string>, total: T[]) =>
  total.length === 0
    ? 0
    : (total.filter(({ id }) => completed.has(id)).length / total.length) * 100

const assignCompletion = (ids: Set<string>, id: string, completed: boolean) => {
  const next = new Set(ids)
  if (completed) next.add(id)
  else next.delete(id)
  return next
}

const applyChanges = (ids: string[], changes: Map<string, boolean>) => {
  const next = new Set(ids)
  changes.forEach((completed, id) => {
    if (completed) next.add(id)
    else next.delete(id)
  })
  return next
}

const emptyProgress = () => ({
  completedLessons: new Set<string>(),
  completedProblems: new Set<string>(),
  pendingProblems: new Map<string, number>(),
  confirmedLessonChanges: new Map<string, boolean>(),
  confirmedProblemChanges: new Map<string, boolean>(),
  currentLessonProgress: 0,
  currentProblemProgress: 0,
})

export const useContentStore = create<ContentStore>((set, get) => ({
  ...emptyProgress(),
  progressOwnerId: undefined,
  progressStatus: 'loading',
  progressRevision: 0,
  progressEpoch: 0,
  fullCurriculum: [],
  allLessons: [],
  allProblems: [],
  setProgressOwner: (userId) => {
    const state = get()
    if (state.progressOwnerId === userId && (userId !== null || state.progressStatus === 'anonymous')) return
    set({
      ...emptyProgress(),
      progressOwnerId: userId,
      progressStatus: userId === null ? 'anonymous' : 'loading',
      progressRevision: state.progressRevision + 1,
      progressEpoch: state.progressEpoch + 1,
    })
  },
  hydrateProgressSnapshot: (snapshot, expectedRevision) => {
    const state = get()
    if (expectedRevision !== undefined && expectedRevision !== state.progressRevision) return false
    const sameOwner = state.progressOwnerId === snapshot.userId
    if (sameOwner && state.pendingProblems.size > 0) return false
    const completedLessons = new Set(snapshot.userId === null ? [] : snapshot.completedLessons)
    const completedProblems = new Set(snapshot.userId === null ? [] : snapshot.completedProblems)
    set({
      ...emptyProgress(),
      progressOwnerId: snapshot.userId,
      progressStatus: snapshot.userId === null ? 'anonymous' : 'ready',
      progressRevision: state.progressRevision + 1,
      progressEpoch: state.progressEpoch + (sameOwner ? 0 : 1),
      completedLessons,
      completedProblems,
      currentLessonProgress: calculateProgress(completedLessons, state.allLessons),
      currentProblemProgress: calculateProgress(completedProblems, state.allProblems),
    })
    return true
  },
  hydrateProgressFromHeader: (result) => {
    if (result.status === 'unavailable') {
      get().setProgressUnavailable(result.userId)
      return
    }
    const state = get()
    // Headers bootstrap an owner, but cannot date their RSC reads relative to
    // client saves or focus refreshes. Ready owners use guarded explicit reads.
    if (state.progressOwnerId === result.userId && state.progressStatus === 'ready') return
    if (state.progressOwnerId !== result.userId || result.status === 'anonymous') {
      state.hydrateProgressSnapshot(result)
      return
    }
    // Keep local confirmations if a header recovers a failed progress read.
    const completedLessons = applyChanges(result.completedLessons, state.confirmedLessonChanges)
    const completedProblems = applyChanges(result.completedProblems, state.confirmedProblemChanges)
    state.pendingProblems.forEach((_, id) => {
      if (state.completedProblems.has(id)) completedProblems.add(id)
      else completedProblems.delete(id)
    })
    set({
      completedLessons,
      completedProblems,
      progressStatus: 'ready',
      progressRevision: state.progressRevision + 1,
      currentLessonProgress: calculateProgress(completedLessons, state.allLessons),
      currentProblemProgress: calculateProgress(completedProblems, state.allProblems),
    })
  },
  setProgressUnavailable: (userId) => {
    const state = get()
    const sameOwner = state.progressOwnerId === userId
    set({
      ...(!sameOwner ? emptyProgress() : {}),
      progressOwnerId: userId,
      progressStatus: 'unavailable',
      progressRevision: state.progressRevision + 1,
      progressEpoch: state.progressEpoch + (sameOwner ? 0 : 1),
    })
  },
  beginProblemSave: (userId, problemId) => {
    const state = get()
    if (state.progressOwnerId !== userId || state.progressStatus !== 'ready' || state.pendingProblems.has(problemId)) return null
    const token = state.progressRevision + 1
    set({
      pendingProblems: new Map(state.pendingProblems).set(problemId, token),
      progressRevision: token,
    })
    return token
  },
  finishProblemSave: (userId, problemId, token, completed) => {
    const state = get()
    if (state.progressOwnerId !== userId || state.pendingProblems.get(problemId) !== token) return false
    const pendingProblems = new Map(state.pendingProblems)
    pendingProblems.delete(problemId)
    const completedProblems = completed === undefined
      ? state.completedProblems
      : assignCompletion(state.completedProblems, problemId, completed)
    set({
      pendingProblems,
      completedProblems,
      confirmedProblemChanges: completed === undefined
        ? state.confirmedProblemChanges
        : new Map(state.confirmedProblemChanges).set(problemId, completed),
      currentProblemProgress: calculateProgress(completedProblems, state.allProblems),
      progressRevision: state.progressRevision + 1,
    })
    return true
  },
  updateContent: (lessons, problems, curriculum, allLessons, allProblems) => {
    const state = get()
    const completedLessons = lessons === undefined ? state.completedLessons : new Set(lessons)
    const completedProblems = problems === undefined ? state.completedProblems : new Set(problems)
    const nextLessons = allLessons ?? state.allLessons
    const nextProblems = allProblems ?? state.allProblems
    set({
      fullCurriculum: curriculum ?? state.fullCurriculum,
      allLessons: nextLessons,
      allProblems: nextProblems,
      completedLessons,
      completedProblems,
      currentLessonProgress: calculateProgress(completedLessons, nextLessons),
      currentProblemProgress: calculateProgress(completedProblems, nextProblems),
      progressRevision: state.progressRevision + (lessons !== undefined || problems !== undefined ? 1 : 0),
    })
  },
  initializeContent: (lessons, problems, curriculum, allLessons, allProblems) => {
    get().updateContent(lessons, problems, curriculum, allLessons, allProblems)
  },
  toggleCompletedLesson: (lessonId) => {
    const state = get()
    const completed = !state.completedLessons.has(lessonId)
    const completedLessons = assignCompletion(state.completedLessons, lessonId, completed)
    set({
      completedLessons,
      confirmedLessonChanges: new Map(state.confirmedLessonChanges).set(lessonId, completed),
      currentLessonProgress: calculateProgress(completedLessons, state.allLessons),
      progressRevision: state.progressRevision + 1,
    })
  },
  toggleCompletedProblem: (problemId) => {
    const state = get()
    const completed = !state.completedProblems.has(problemId)
    const completedProblems = assignCompletion(state.completedProblems, problemId, completed)
    set({
      completedProblems,
      confirmedProblemChanges: new Map(state.confirmedProblemChanges).set(problemId, completed),
      currentProblemProgress: calculateProgress(completedProblems, state.allProblems),
      progressRevision: state.progressRevision + 1,
    })
  },
}))
