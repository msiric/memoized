/**
 * Guard that CONTENT_STATS (the single source of truth for headline counts shown
 * across the app) still matches the actual content. Derives the real counts from
 * the content files using the same identity walk the prune trusts, and exits
 * non-zero on any mismatch.
 *
 * Run by the content sync before deploying: adding or removing a lesson/problem
 * without updating CONTENT_STATS fails the sync instead of shipping a wrong,
 * inconsistent number to the marketing surfaces. Also runnable locally via
 * `yarn verify:stats`.
 */
import { CONTENT_FOLDER } from '@/constants'
import { CONTENT_STATS } from '@/constants/content-stats'
import { validContentIds } from '@/lib/content-identity'
import fs from 'fs'
import path from 'path'

function main() {
  const contentDir = path.join('src', CONTENT_FOLDER)
  if (
    !fs.existsSync(path.join(contentDir, 'js-track')) &&
    !fs.existsSync(path.join(contentDir, 'dsa-track'))
  ) {
    console.error(
      `❌ No content under ${contentDir}. This check must run where the real content is present (e.g. the content sync).`,
    )
    process.exit(1)
  }

  const ids = validContentIds(contentDir)
  const actual = {
    courses: ids.course.size,
    sections: ids.section.size,
    lessons: ids.lesson.size,
    problems: ids.problem.size,
    resources: ids.resource.size,
  }

  const mismatches = (
    Object.keys(actual) as Array<keyof typeof actual>
  ).filter((key) => actual[key] !== CONTENT_STATS[key])

  if (mismatches.length > 0) {
    console.error(
      '❌ CONTENT_STATS is out of date with the content. Update src/constants/content-stats.ts:\n',
    )
    for (const key of mismatches) {
      console.error(`   ${key}: constant=${CONTENT_STATS[key]} actual=${actual[key]}`)
    }
    process.exit(1)
  }

  console.log('✅ CONTENT_STATS matches the content:', JSON.stringify(actual))
}

main()
