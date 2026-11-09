import * as React from 'react'
import { getUserProgressWithCurriculum } from '@/services/user'

// React.cache exists in the server (RSC) build of React; client-build test
// environments get a pass-through, i.e. one call per use.
const requestCache: <T extends (...args: never[]) => unknown>(fn: T) => T =
  (React as { cache?: <T>(fn: T) => T }).cache ?? ((fn) => fn)

// One read per server request: the course header and navigation slots both
// need the curriculum and the viewer's progress. React cache() memoizes the
// result for the current request only, so it is never shared across users.
export const getCourseNavigationSnapshot = requestCache((userId?: string) =>
  getUserProgressWithCurriculum(userId),
)
