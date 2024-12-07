import { advancedTopics } from '@/components/AdvancedTopics'
import { builtInDataStructures } from '@/components/BuiltInDataStructures'
import { commonTechniques } from '@/components/CommonTechniques'
import { frontendDevelopment } from '@/components/FrontendDevelopment'
import { typescriptIntroduction } from '@/components/TypeScriptIntroduction'
import { userDefinedDataStructures } from '@/components/UserDefinedDataStructures'
import {
  ADVANCED_CONCEPTS_PREFIX,
  ADVANCED_TOPICS_PREFIX,
  BUILT_IN_DATA_STRUCTURES_PREFIX,
  COMMON_TECHNIQUES_PREFIX,
  CORE_FUNDAMENTALS_PREFIX,
  COURSES_PREFIX,
  DSA_TRACK_PREFIX,
  FRONTEND_DEVELOPMENT_PREFIX,
  FRONTEND_TRACK_PREFIX,
  JS_TRACK_PREFIX,
  TYPESCRIPT_INTRODUCTION_PREFIX,
  USER_DEFINED_DATA_STRUCTURES_PREFIX,
} from '.'
import { advancedConcepts } from '../components/AdvancedConcepts'
import { coreFundamentals } from '../components/CoreFundamentals'
import { AngleBracketsIcon } from '../components/icons/AngleBracketsIcon'
import { CodingIcon } from '../components/icons/CodingIcon'

export const curriculumUI = {
  [DSA_TRACK_PREFIX]: {
    icon: CodingIcon,
    pattern: {
      y: 16,
      squares: [
        [0, 1],
        [1, 3],
      ],
    },
  },
  [FRONTEND_TRACK_PREFIX]: {
    icon: AngleBracketsIcon,
    pattern: {
      y: -6,
      squares: [
        [-1, 2],
        [1, 3],
      ],
    },
  },
  [JS_TRACK_PREFIX]: {
    icon: AngleBracketsIcon,
    pattern: {
      y: -6,
      squares: [
        [-1, 2],
        [1, 3],
      ],
    },
  },
}

export const completeCurriculum = [
  {
    id: DSA_TRACK_PREFIX,
    title: 'DSA Track',
    description:
      'Master algorithmic problem solving through practical examples and real interview questions',
    href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}`,
    icon: CodingIcon,
    sections: [
      {
        id: BUILT_IN_DATA_STRUCTURES_PREFIX,
        href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}${BUILT_IN_DATA_STRUCTURES_PREFIX}`,
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
        href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}${USER_DEFINED_DATA_STRUCTURES_PREFIX}`,
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
        href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}${COMMON_TECHNIQUES_PREFIX}`,
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
        href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}${ADVANCED_TOPICS_PREFIX}`,
        title: 'Advanced Topics',
        description: 'Diving into complex topics for in-depth understanding.',
        about:
          'Dive into complex topics for an in-depth understanding of sophisticated algorithms. Study network flow algorithms, dynamic programming, segment trees, union find, minimum spanning trees, shortest path algorithms, and more. Gain a competitive edge with knowledge of advanced concepts and their practical applications.',
        icon: 'advancedTopicsIcon',
        lessons: [...advancedTopics],
      },
    ],
  },
  // {
  //   id: FRONTEND_TRACK_PREFIX,
  //   title: 'Frontend Track',
  //   description:
  //     'Master algorithmic problem solving through practical examples and real interview questions',
  //   href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}`,
  //   icon: AngleBracketsIcon,
  //   sections: [
  //     {
  //       id: BROWSER_AND_WEB_APIS_PREFIX,
  //       href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${BROWSER_AND_WEB_APIS_PREFIX}`,
  //       title: 'Browser and Web APIs',
  //       description:
  //         'Understanding and utilizing built-in data structures in programming.',
  //       about:
  //         'Understand and utilize the fundamental data structures built into JavaScript. Learn their concepts, use cases, time and space complexities, and practical tips and tricks. Avoid common pitfalls and master advanced string algorithms, numerical operations, arrays, objects, sets, maps, and more.',
  //       icon: 'browserAndWebAPIsIcon',
  //       lessons: [...browserAndWebApis],
  //     },
  //     {
  //       id: JAVASCRIPT_MECHANICS_PREFIX,
  //       href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${JAVASCRIPT_MECHANICS_PREFIX}`,
  //       title: 'JavaScript Mechanics',
  //       description:
  //         'Creating and implementing custom data structures for various needs.',
  //       about:
  //         'Go beyond the basics with custom data structures tailored for specific needs. Implement and optimize linked lists, stacks, queues, heaps, trees, graphs, tries, and more. Develop the skills to create efficient and effective data structures for any problem.',
  //       icon: 'javascriptMechanicsIcon',
  //       lessons: [...javascriptMechanics],
  //     },
  //     {
  //       id: TYPESCRIPT_ADVANCED_CONCEPTS_PREFIX,
  //       href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${TYPESCRIPT_ADVANCED_CONCEPTS_PREFIX}`,
  //       title: 'TypeScript Advanced Concepts',
  //       description:
  //         'Exploring widely-used algorithms and problem-solving techniques.',
  //       about:
  //         'Explore widely-used algorithms and problem-solving techniques essential for coding interviews. Master sliding windows, two pointers, cyclic sort, tree and graph traversals, binary search, and many more. Apply these techniques to solve complex problems with confidence.',
  //       icon: 'typescriptAdvancedIcon',
  //       lessons: [...typescriptAdvancedConcepts],
  //     },
  //     {
  //       id: MODERN_FRONTEND_DEVELOPMENT_PREFIX,
  //       href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${MODERN_FRONTEND_DEVELOPMENT_PREFIX}`,
  //       title: 'Modern Frontend Development',
  //       description: 'Diving into complex topics for in-depth understanding.',
  //       about:
  //         'Dive into complex topics for an in-depth understanding of sophisticated algorithms. Study network flow algorithms, dynamic programming, segment trees, union find, minimum spanning trees, shortest path algorithms, and more. Gain a competitive edge with knowledge of advanced concepts and their practical applications.',
  //       icon: 'modernFrontendIcon',
  //       lessons: [...modernFrontendDevelopment],
  //     },
  //   ],
  // },
  {
    id: JS_TRACK_PREFIX,
    title: 'JS Track',
    description:
      'Master algorithmic problem solving through practical examples and real interview questions',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}`,
    icon: AngleBracketsIcon,
    sections: [
      {
        id: CORE_FUNDAMENTALS_PREFIX,
        href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}`,
        title: 'Core Fundamentals',
        description:
          'Understanding and utilizing built-in data structures in programming.',
        about:
          'Understand and utilize the fundamental data structures built into JavaScript. Learn their concepts, use cases, time and space complexities, and practical tips and tricks. Avoid common pitfalls and master advanced string algorithms, numerical operations, arrays, objects, sets, maps, and more.',
        icon: 'browserAndWebAPIsIcon',
        lessons: [...coreFundamentals],
      },
      {
        id: ADVANCED_CONCEPTS_PREFIX,
        href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}`,
        title: 'Advanced Concepts',
        description:
          'Creating and implementing custom data structures for various needs.',
        about:
          'Go beyond the basics with custom data structures tailored for specific needs. Implement and optimize linked lists, stacks, queues, heaps, trees, graphs, tries, and more. Develop the skills to create efficient and effective data structures for any problem.',
        icon: 'javascriptMechanicsIcon',
        lessons: [...advancedConcepts],
      },
      {
        id: TYPESCRIPT_INTRODUCTION_PREFIX,
        href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}`,
        title: 'TypeScript Introduction',
        description:
          'Exploring widely-used algorithms and problem-solving techniques.',
        about:
          'Explore widely-used algorithms and problem-solving techniques essential for coding interviews. Master sliding windows, two pointers, cyclic sort, tree and graph traversals, binary search, and many more. Apply these techniques to solve complex problems with confidence.',
        icon: 'typescriptAdvancedIcon',
        lessons: [...typescriptIntroduction],
      },
      {
        id: FRONTEND_DEVELOPMENT_PREFIX,
        href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}`,
        title: 'Frontend Development',
        description: 'Diving into complex topics for in-depth understanding.',
        about:
          'Dive into complex topics for an in-depth understanding of sophisticated algorithms. Study network flow algorithms, dynamic programming, segment trees, union find, minimum spanning trees, shortest path algorithms, and more. Gain a competitive edge with knowledge of advanced concepts and their practical applications.',
        icon: 'modernFrontendIcon',
        lessons: [...frontendDevelopment],
      },
    ],
  },
]
