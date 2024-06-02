import { Curriculum, LessonConfig } from '@/types'
import { create } from 'zustand'

interface ProgressStore {
  completedLessons: Set<string>
  fullCurriculum: Curriculum[]
  allLessons: LessonConfig[]
  currentProgress: number
  initializeProgress: (
    completedLessons: string[],
    fullCurriculum: Curriculum[],
    allLessons: LessonConfig[],
  ) => void
  toggleCompletedLesson: (lessonId: string) => void
}

function calculateProgress(
  completedLessons: Set<string>,
  allLessons: LessonConfig[],
) {
  const progress = (completedLessons.size / allLessons.length) * 100
  return progress
}

export const useProgressStore = create<ProgressStore>((set, get) => ({
  completedLessons: new Set<string>(),
  fullCurriculum: [],
  allLessons: [],
  currentProgress: 0,
  initializeProgress: (lessons, curriculum, total) => {
    const completedLessonsSet = new Set(lessons)
    const progress = calculateProgress(completedLessonsSet, total)
    set({
      completedLessons: completedLessonsSet,
      fullCurriculum: curriculum,
      allLessons: total,
      currentProgress: progress,
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
    const newProgress = calculateProgress(completedLessons, allLessons)
    set({ completedLessons, currentProgress: newProgress })
  },
}))
