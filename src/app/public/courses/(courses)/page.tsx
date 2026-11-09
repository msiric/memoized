import Courses from '@/app/courses/(courses)/page'
import { getCoursesSnapshot } from '@/lib/catalog-request'

// The live page degrades to "catalog unavailable" for one request when the
// database blips. In the shared cache that would be served to every signed-out
// visitor for hours, so fail the regeneration instead and keep the last good
// copy (Next ISR keeps serving the previous render when a revalidation throws).
export default async function CachedCourses() {
  const snapshot = await getCoursesSnapshot()
  if (snapshot.status !== 'available') throw new Error('Courses snapshot unavailable; keep the cached copy')
  return Courses({ searchParams: {} })
}
