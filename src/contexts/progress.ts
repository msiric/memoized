import { Curriculum, LessonConfig, ProblemConfig } from '@/types'
import { create } from 'zustand'

interface ContentStore {
  completedLessons: Set<string>
  completedProblems: Set<string>
  fullCurriculum: Curriculum[]
  allLessons: LessonConfig[]
  allProblems: ProblemConfig[]
  currentLessonProgress: number
  currentProblemProgress: number
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

function calculateProgress<T>(completed: Set<string>, total: T[]) {
  const progress = (completed.size / total.length) * 100
  return progress
}

export const useContentStore = create<ContentStore>((set, get) => ({
  completedLessons: new Set<string>(),
  completedProblems: new Set<string>(),
  fullCurriculum: [],
  allLessons: [],
  allProblems: [],
  currentLessonProgress: 0,
  currentProblemProgress: 0,
  initializeContent: (
    lessons,
    problems,
    curriculum,
    allLessons,
    allProblems,
  ) => {
    const completedLessonsSet = new Set(lessons)
    const completedProblemsSet = new Set(problems)
    const lessonProgress = calculateProgress(completedLessonsSet, allLessons)
    const problemProgress = calculateProgress(completedProblemsSet, allProblems)
    set({
      completedLessons: completedLessonsSet,
      completedProblems: completedProblemsSet,
      fullCurriculum: curriculum,
      allLessons: allLessons,
      allProblems: allProblems,
      currentLessonProgress: lessonProgress,
      currentProblemProgress: problemProgress,
    })
  },
  toggleCompletedLesson: (lessonId: string) => {
    const completedLessons = new Set(get().completedLessons)
    const allLessons = get().allLessons
    if (completedLessons.has(lessonId)) {
      completedLessons.delete(lessonId)
    } else {
      completedLessons.add(lessonId)
    }
    const newLessonProgress = calculateProgress(completedLessons, allLessons)
    set({ completedLessons, currentLessonProgress: newLessonProgress })
  },
  toggleCompletedProblem: (problemId: string) => {
    const completedProblems = new Set(get().completedProblems)
    const allProblems = get().allProblems
    if (completedProblems.has(problemId)) {
      completedProblems.delete(problemId)
    } else {
      completedProblems.add(problemId)
    }
    const newProblemProgress = calculateProgress(completedProblems, allProblems)
    set({ completedProblems, currentProblemProgress: newProblemProgress })
  },
}))
