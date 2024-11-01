import { advancedTopics } from '@/components/AdvancedTopics'
import { builtInDataStructures } from '@/components/BuiltInDataStructures'
import { commonTechniques } from '@/components/CommonTechniques'
import { userDefinedDataStructures } from '@/components/UserDefinedDataStructures'
import {
  ADVANCED_TOPICS_PREFIX,
  BUILT_IN_DATA_STRUCTURES_PREFIX,
  COMMON_TECHNIQUES_PREFIX,
  COURSES_PREFIX,
  DATA_STRUCTURES_AND_ALGORITHMS_PREFIX,
  USER_DEFINED_DATA_STRUCTURES_PREFIX,
} from '.'

export const completeCurriculum = [
  {
    id: DATA_STRUCTURES_AND_ALGORITHMS_PREFIX,
    title: 'DSA Track',
    description: 'The complete coding interview preparation',
    href: `${COURSES_PREFIX}${DATA_STRUCTURES_AND_ALGORITHMS_PREFIX}`,
    sections: [
      {
        id: BUILT_IN_DATA_STRUCTURES_PREFIX,
        href: `${COURSES_PREFIX}${DATA_STRUCTURES_AND_ALGORITHMS_PREFIX}${BUILT_IN_DATA_STRUCTURES_PREFIX}`,
        title: 'Built-In Data Structures',
        description:
          'Understanding and utilizing built-in data structures in programming.',
        about:
          'Understand and utilize the fundamental data structures built into JavaScript. Learn their concepts, use cases, time and space complexities, and practical tips and tricks. Avoid common pitfalls and master advanced string algorithms, numerical operations, arrays, objects, sets, maps, and more.',
        icon: 'builtInDataStructuresIcon',
        lessons: [...builtInDataStructures],
      },
      {
        id: USER_DEFINED_DATA_STRUCTURES_PREFIX,
        href: `${COURSES_PREFIX}${DATA_STRUCTURES_AND_ALGORITHMS_PREFIX}${USER_DEFINED_DATA_STRUCTURES_PREFIX}`,
        title: 'User-Defined Data Structures',
        description:
          'Creating and implementing custom data structures for various needs.',
        about:
          'Go beyond the basics with custom data structures tailored for specific needs. Implement and optimize linked lists, stacks, queues, heaps, trees, graphs, tries, and more. Develop the skills to create efficient and effective data structures for any problem.',
        icon: 'userDefinedDataStructuresIcon',
        lessons: [...userDefinedDataStructures],
      },
      {
        id: COMMON_TECHNIQUES_PREFIX,
        href: `${COURSES_PREFIX}${DATA_STRUCTURES_AND_ALGORITHMS_PREFIX}${COURSES_PREFIX}`,
        title: 'Common Techniques',
        description:
          'Exploring widely-used algorithms and problem-solving techniques.',
        about:
          'Explore widely-used algorithms and problem-solving techniques essential for coding interviews. Master sliding windows, two pointers, cyclic sort, tree and graph traversals, binary search, and many more. Apply these techniques to solve complex problems with confidence.',
        icon: 'commonTechniquesIcon',
        lessons: [...commonTechniques],
      },
      {
        id: ADVANCED_TOPICS_PREFIX,
        href: `${COURSES_PREFIX}${DATA_STRUCTURES_AND_ALGORITHMS_PREFIX}${ADVANCED_TOPICS_PREFIX}`,
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
