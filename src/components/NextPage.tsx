'use client'

import { usePages } from '@/hooks/usePages'

export function NextPage() {
  const { nextPage, nextSection, isEndOfCourse, isEndOfSection } = usePages()

  if (isEndOfCourse)
    return (
      <>
        <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          Congratulations on completing the entire course! Your dedication and
          effort have paid off. This accomplishment is a significant step
          towards your career goals. Best of luck in your future interviews and
          let me know if my platform helped you land your desired position. Make
          sure to regularly revise the material for a deeper understanding and
          to stay sharp on the concepts.
        </p>
        <p className="mt-6 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          Stay safe,
        </p>
        <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          Mario
        </p>
      </>
    )

  return (
    <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">
      {isEndOfSection
        ? `Great job completing this section! Take a well-deserved break to reflect on what you’ve learned. Don’t hesitate to revisit this material whenever you need a refresher. In the next section we'll cover ${nextSection.title}.`
        : nextPage
          ? `Up next, we'll explore ${nextPage.title}. Take your time, and proceed when you're ready.`
          : "Let's continue exploring the next page. Take your time, and proceed when you're ready."}
    </p>
  )
}
