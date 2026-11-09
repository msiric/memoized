import { LessonView, lessonPageMetadata, type LessonParams } from '@/app/courses/lesson-view'
import type { PathQueryValue } from '@/lib/typescript-first-pass'

// Session-aware lesson route. Signed-out requests without a guided-view query
// are rewritten by middleware to the cached /public/courses route instead.
export const dynamic = 'force-dynamic'

export function generateMetadata({ params }: { params: LessonParams }) {
  return lessonPageMetadata({ params })
}

export default async function Lesson({
  params,
  searchParams = {},
}: {
  params: LessonParams
  searchParams?: { path?: PathQueryValue; step?: PathQueryValue }
}) {
  return LessonView({ params, searchParams })
}
