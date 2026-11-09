import { getCourseNavigationSnapshot } from '@/lib/course-navigation-request'
import { Curriculum, LessonConfig, ProblemConfig } from '@/types'
import { Wrapper } from '@/app/courses/[courseSlug]/@header/wrapper'

// Signed-out header: curriculum without progress, no session read.
export default async function Header({ params }: { params: { courseSlug: string } }) {
  const data = await getCourseNavigationSnapshot(undefined)
  return (
    <Wrapper
      courseSlug={params.courseSlug}
      userData={data?.user}
      progressData={data.progress}
      fullCurriculum={data?.curriculum as Curriculum[]}
      allLessons={data?.lessons as LessonConfig[]}
      allProblems={data?.problems as ProblemConfig[]}
    />
  )
}
