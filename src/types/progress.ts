export type ProgressSnapshot = {
  userId: string | null
  completedLessons: string[]
  completedProblems: string[]
}

export type ProgressSnapshotResult =
  | ({ status: 'ready' } & ProgressSnapshot & { userId: string })
  | {
      status: 'anonymous'
      userId: null
      completedLessons: []
      completedProblems: []
    }
  | { status: 'unavailable'; userId: string | null; message: string }
