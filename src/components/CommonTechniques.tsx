import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'

export const commonTechniques = [
  {
    href: '/sliding-window',
    title: 'Sliding Window',
    description: 'Optimize window-based computations for arrays and strings.',
  },
  {
    href: '/two-pointers',
    title: 'Two Pointers',
    description: 'Solve problems using two pointers to traverse arrays.',
  },
  {
    href: '/fast-and-slow-pointers',
    title: 'Fast and Slow Pointers',
    description: 'Detect cycles in linked lists and solve related problems.',
  },
  {
    href: '/merge-intervals',
    title: 'Merge Intervals',
    description: 'Combine overlapping intervals efficiently.',
  },
  {
    href: '/cyclic-sort',
    title: 'Cyclic Sort',
    description: 'Sort an array with minimal extra space.',
  },
  {
    href: '/linked-list-reversal',
    title: 'Linked List Reversal',
    description: 'Reverse linked lists in-place.',
  },
  {
    href: '/tree-bfs',
    title: 'Tree BFS',
    description: 'Traverse trees level by level using Breadth-First Search.',
  },
  {
    href: '/tree-dfs',
    title: 'Tree DFS',
    description: 'Explore trees deeply using Depth-First Search.',
  },
  {
    href: '/two-heaps',
    title: 'Two Heaps',
    description: 'Maintain two heaps to solve interval and median problems.',
  },
  {
    href: '/subsets',
    title: 'Subsets',
    description: 'Generate all subsets of a given set.',
  },
  {
    href: '/binary-search',
    title: 'Binary Search',
    description: 'Efficiently search sorted arrays.',
  },
  {
    href: '/top-k-elements',
    title: 'Top K Elements',
    description: 'Find the top K elements in a collection.',
  },
  {
    href: '/k-way-merge',
    title: 'K-way Merge',
    description: 'Merge multiple sorted arrays.',
  },
  {
    href: '/graph-bfs',
    title: 'Graph BFS',
    description: 'Traverse graphs using Breadth-First Search.',
  },
  {
    href: '/graph-dfs',
    title: 'Graph DFS',
    description: 'Explore graphs using Depth-First Search.',
  },
  {
    href: '/topological-sort',
    title: 'Topological Sort',
    description: 'Order tasks based on dependencies using topological sort.',
  },
  {
    href: '/matrix-traversal',
    title: 'Matrix Traversal',
    description: 'Navigate through matrices efficiently.',
  },
  {
    href: '/palindromic-subsequence',
    title: 'Palindromic Subsequence',
    description: 'Identify palindromic subsequences within strings.',
  },
  {
    href: '/longest-common-substring',
    title: 'Longest Common Substring',
    description: 'Find the longest substring common to two strings.',
  },
  {
    href: '/recursion-and-memoization',
    title: 'Recursion and Memoization',
    description: 'Use recursive techniques and optimize with memoization.',
  },
  {
    href: '/backtracking',
    title: 'Backtracking',
    description:
      'Find solutions by exploring all possible options and backtracking.',
  },
  {
    href: '/greedy-algorithms',
    title: 'Greedy Algorithms',
    description: 'Solve optimization problems using greedy strategies.',
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
