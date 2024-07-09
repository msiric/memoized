import { advancedTopics } from '@/components/AdvancedTopics'
import { builtInDataStructures } from '@/components/BuiltInDataStructures'
import { commonTechniques } from '@/components/CommonTechniques'
import { userDefinedDataStructures } from '@/components/UserDefinedDataStructures'
import { COURSE_PREFIX } from '.'

export const completeCurriculum = [
  {
    id: 'dsAlgo',
    title: 'Data Structures and Algorithms',
    description: 'The complete coding interview preparation',
    sections: [
      {
        id: '/',
        href: `${COURSE_PREFIX}`,
        title: 'Introduction',
        description: 'Getting started with Data Structures and Algorithms',
        about:
          'Get started with the fundamentals of Data Structures and Algorithms. Understand the importance and applications of these concepts in programming and problem-solving. Learn about common data structures like arrays, linked lists, stacks, queues, trees, graphs, and more. Master essential algorithms for searching, sorting, and optimization. Prepare yourself for coding interviews and real-world challenges.',
        icon: '',
        lessons: [],
      },
      {
        id: '/built-in-data-structures',
        href: `${COURSE_PREFIX}/built-in-data-structures`,
        title: 'Built-In Data Structures',
        description:
          'Understanding and utilizing built-in data structures in programming.',
        about:
          'Understand and utilize the fundamental data structures built into JavaScript. Learn their concepts, use cases, time and space complexities, and practical tips and tricks. Avoid common pitfalls and master advanced string algorithms, numerical operations, arrays, objects, sets, maps, and more.',
        icon: 'builtInDataStructuresIcon',
        lessons: [...builtInDataStructures],
      },
      {
        id: '/user-defined-data-structures',
        href: `${COURSE_PREFIX}/user-defined-data-structures`,
        title: 'User-Defined Data Structures',
        description:
          'Creating and implementing custom data structures for various needs.',
        about:
          'Go beyond the basics with custom data structures tailored for specific needs. Implement and optimize linked lists, stacks, queues, heaps, trees, graphs, tries, and more. Develop the skills to create efficient and effective data structures for any problem.',
        icon: 'userDefinedDataStructuresIcon',
        lessons: [...userDefinedDataStructures],
      },
      {
        id: '/common-techniques',
        href: `${COURSE_PREFIX}/common-techniques`,
        title: 'Common Techniques',
        description:
          'Exploring widely-used algorithms and problem-solving techniques.',
        about:
          'Explore widely-used algorithms and problem-solving techniques essential for coding interviews. Master sliding windows, two pointers, cyclic sort, tree and graph traversals, binary search, and many more. Apply these techniques to solve complex problems with confidence.',
        icon: 'commonTechniquesIcon',
        lessons: [...commonTechniques],
      },
      {
        id: '/advanced-topics',
        href: `${COURSE_PREFIX}/advanced-topics`,
        title: 'Advanced Topics',
        description: 'Diving into complex topics for in-depth understanding.',
        about:
          'Dive into complex topics for an in-depth understanding of sophisticated algorithms. Study network flow algorithms, dynamic programming, segment trees, union find, minimum spanning trees, shortest path algorithms, and more. Gain a competitive edge with knowledge of advanced concepts and their practical applications.',
        icon: 'advancedTopicsIcon',
        lessons: [...advancedTopics],
      },
    ],
  },
]
