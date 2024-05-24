import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'

export const builtInDataStructures = [
  {
    href: '/strings',
    title: 'Strings',
    description: 'Explore string methods and their usage in JavaScript.',
  },
  {
    href: '/numbers',
    title: 'Numbers',
    description:
      'Understand numerical operations and the Number object in JavaScript.',
  },
  {
    href: '/arrays',
    title: 'Arrays',
    description: 'Learn about array methods and how to manipulate arrays.',
  },
  {
    href: '/objects',
    title: 'Objects',
    description:
      'Discover object properties and how to work with objects in JavaScript.',
  },
  {
    href: '/sets',
    title: 'Sets',
    description: 'Understand the Set object and its unique element storage.',
  },
  {
    href: '/maps',
    title: 'Maps',
    description: 'Learn about the Map object and key-value pair management.',
  },
  {
    href: '/remaining-primitives',
    title: 'Remaining Primitives',
    description:
      'Explore other JavaScript primitives such as boolean, null, and undefined.',
  },
]

export function BuiltInDataStructures() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="builtInDataStructures">
        Built-In Data Structures
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/5">
        {builtInDataStructures.map((dataStructure) => (
          <div key={dataStructure.href}>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              {dataStructure.title}
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {dataStructure.description}
            </p>
            <p className="mt-4">
              <Button href={dataStructure.href} variant="text" arrow="right">
                Read more
              </Button>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
