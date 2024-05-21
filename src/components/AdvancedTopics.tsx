import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'

export const advancedTopics = [
  {
    href: '/dynamic-programming',
    title: 'Dynamic Programming',
    description:
      'Solve complex problems by breaking them into simpler subproblems.',
  },
  {
    href: '/bloom-filters',
    title: 'Bloom Filters',
    description:
      'Probabilistic data structures for efficient set membership testing.',
  },
  {
    href: '/segment-trees',
    title: 'Segment Trees',
    description: 'Efficiently perform range queries on arrays.',
  },
  {
    href: '/union-find',
    title: 'Union Find',
    description: 'Detect cycles and manage dynamic connectivity in graphs.',
  },
  {
    href: '/minimum-spanning-trees',
    title: 'Minimum Spanning Trees',
    description:
      'Find the subset of edges that connects all vertices with the minimal total weight.',
  },
  {
    href: '/shortest-path-algorithms',
    title: 'Shortest Path Algorithms',
    description: 'Determine the shortest paths between nodes in a graph.',
  },
  {
    href: '/maximum-flow',
    title: 'Maximum Flow',
    description: 'Calculate the maximum possible flow in a flow network.',
  },
  {
    href: '/bit-manipulation',
    title: 'Bit Manipulation',
    description:
      'Perform operations directly on binary representations of numbers.',
  },
  {
    href: '/randomized-algorithms',
    title: 'Randomized Algorithms',
    description: 'Utilize randomness to solve problems efficiently.',
  },
  {
    href: '/suffix-arrays-and-suffix-trees',
    title: 'Suffix Arrays and Suffix Trees',
    description: 'Advanced data structures for efficient string processing.',
  },
  {
    href: '/approximation-algorithms',
    title: 'Approximation Algorithms',
    description: 'Find near-optimal solutions for hard optimization problems.',
  },
  {
    href: '/sqrt-decomposition',
    title: 'Sqrt Decomposition',
    description: 'Divide problems into blocks for efficient query processing.',
  },
  {
    href: '/network-flow-algorithms',
    title: 'Network Flow Algorithms',
    description:
      'Solve flow problems in networks, such as maximum flow and minimum cut.',
  },
  {
    href: '/convex-hull',
    title: 'Convex Hull',
    description:
      'Compute the smallest convex polygon enclosing a set of points.',
  },
  {
    href: '/combinatorial-optimization',
    title: 'Combinatorial Optimization',
    description:
      'Optimize an objective function within a finite set of possible solutions.',
  },
]

export function AdvancedTopics() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="advancedTopics">
        Advanced Topics
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/5">
        {advancedTopics.map((technique) => (
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
