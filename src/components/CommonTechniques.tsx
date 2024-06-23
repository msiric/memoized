import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'
import { COMMON_TECHNIQUES_PREFIX, COURSE_PREFIX } from '@/constants'
import { COMMON_TECHNIQUES_PROBLEMS } from '@/problems'
import { LessonConfig } from '@/types'
import { AccessOptions } from '@prisma/client'

export const commonTechniques: LessonConfig[] = [
  {
    id: '/sliding-window',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/sliding-window`,
    title: 'Sliding Window',
    description: 'Optimize window-based computations for arrays and strings.',
    access: AccessOptions.FREE,
    problems: COMMON_TECHNIQUES_PROBLEMS.slidingWindow,
  },
  {
    id: '/two-pointers',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/two-pointers`,
    title: 'Two Pointers',
    description: 'Solve problems using two pointers to traverse arrays.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.twoPointers,
  },
  {
    id: '/fast-and-slow-pointers',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/fast-and-slow-pointers`,
    title: 'Fast and Slow Pointers',
    description: 'Detect cycles in linked lists and solve related problems.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.fastAndSlowPointers,
  },
  {
    id: '/merge-intervals',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/merge-intervals`,
    title: 'Merge Intervals',
    description: 'Combine overlapping intervals efficiently.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.mergeIntervals,
  },
  {
    id: '/cyclic-sort',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/cyclic-sort`,
    title: 'Cyclic Sort',
    description: 'Sort an array with minimal extra space.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.cyclicSort,
  },
  {
    id: '/linked-list-reversal',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/linked-list-reversal`,
    title: 'Linked List Reversal',
    description: 'Reverse linked lists in-place.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.linkedListReversal,
  },
  {
    id: '/tree-bfs',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/tree-bfs`,
    title: 'Tree BFS',
    description: 'Traverse trees level by level using Breadth-First Search.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.treeBFS,
  },
  {
    id: '/tree-dfs',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/tree-dfs`,
    title: 'Tree DFS',
    description: 'Explore trees deeply using Depth-First Search.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.treeDFS,
  },
  {
    id: '/two-heaps',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/two-heaps`,
    title: 'Two Heaps',
    description: 'Maintain two heaps to solve interval and median problems.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.twoHeaps,
  },
  {
    id: '/subsets',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/subsets`,
    title: 'Subsets',
    description: 'Generate all subsets of a given set.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.subsets,
  },
  {
    id: '/binary-search',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/binary-search`,
    title: 'Binary Search',
    description: 'Efficiently search sorted arrays.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.binarySearch,
  },
  {
    id: '/top-k-elements',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/top-k-elements`,
    title: 'Top K Elements',
    description: 'Find the top K elements in a collection.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.topKElements,
  },
  {
    id: '/k-way-merge',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/k-way-merge`,
    title: 'K-way Merge',
    description: 'Merge multiple sorted arrays.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.kWayMerge,
  },
  {
    id: '/graph-bfs',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/graph-bfs`,
    title: 'Graph BFS',
    description: 'Traverse graphs using Breadth-First Search.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.graphBFS,
  },
  {
    id: '/graph-dfs',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/graph-dfs`,
    title: 'Graph DFS',
    description: 'Explore graphs using Depth-First Search.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.graphDFS,
  },
  {
    id: '/topological-sort',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/topological-sort`,
    title: 'Topological Sort',
    description: 'Order tasks based on dependencies using topological sort.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.topologicalSort,
  },
  {
    id: '/matrix-traversal',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/matrix-traversal`,
    title: 'Matrix Traversal',
    description: 'Navigate through matrices efficiently.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.matrixTraversal,
  },
  {
    id: '/palindromic-subsequence',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/palindromic-subsequence`,
    title: 'Palindromic Subsequence',
    description: 'Identify palindromic subsequences within strings.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.palindromicSubsequence,
  },
  {
    id: '/longest-common-substring',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/longest-common-substring`,
    title: 'Longest Common Substring',
    description: 'Find the longest substring common to two strings.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.longestCommonSubstring,
  },
  {
    id: '/recursion-and-memoization',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/recursion-and-memoization`,
    title: 'Recursion and Memoization',
    description: 'Use recursive techniques and optimize with memoization.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.recursionAndMemoization,
  },
  {
    id: '/backtracking',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/backtracking`,
    title: 'Backtracking',
    description:
      'Find solutions by exploring all possible options and backtracking.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.backtracking,
  },
  {
    id: '/greedy-algorithms',
    href: `${COURSE_PREFIX}${COMMON_TECHNIQUES_PREFIX}/greedy-algorithms`,
    title: 'Greedy Algorithms',
    description: 'Solve optimization problems using greedy strategies.',
    access: AccessOptions.PREMIUM,
    problems: COMMON_TECHNIQUES_PROBLEMS.greedyAlgorithms,
  },
]

export function CommonTechniques() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="commonTechniques">
        Common Techniques
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/5">
        {commonTechniques.map((technique) => (
          <div key={technique.href}>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              {technique.title}
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {technique.description}
            </p>
            <p className="mt-4">
              <Button href={technique.href} variant="text" arrow="right">
                Read more
              </Button>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
