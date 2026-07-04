import {
  ADVANCED_CONCEPTS_PREFIX,
  ADVANCED_TOPICS_PREFIX,
  BUILT_IN_DATA_STRUCTURES_PREFIX,
  COMMON_TECHNIQUES_PREFIX,
  CORE_FUNDAMENTALS_PREFIX,
  COURSES_PREFIX,
  DSA_TRACK_PREFIX,
  FRONTEND_DEVELOPMENT_PREFIX,
  JS_TRACK_PREFIX,
  TYPESCRIPT_INTRODUCTION_PREFIX,
  USER_DEFINED_DATA_STRUCTURES_PREFIX,
} from './index'
import { AngleBracketsIcon } from '../components/icons/AngleBracketsIcon'
import { CodingIcon } from '../components/icons/CodingIcon'
import { AccessOptions } from '@prisma/client'
import { LessonConfig } from '@/types'
import { SVGProps } from 'react'

type CurriculumSection = {
  id: string
  href: string
  title: string
  description: string
  about: string
  icon: string
  order: number
  access: AccessOptions
  lessons: LessonConfig[]
}

type CurriculumCourse = {
  id: string
  title: string
  description: string
  href: string
  order: number
  icon: (props: Omit<SVGProps<SVGSVGElement>, 'ref'>) => JSX.Element
  seo: {
    title: string
    description: string
    keywords: string[]
    canonical: string
  }
  sections: CurriculumSection[]
}

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

export const completeCurriculum: CurriculumCourse[] = [
  {
    id: JS_TRACK_PREFIX,
    title: 'JS Track',
    description:
      'Master JavaScript concepts and principles through theoretical foundations and interview questions',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}`,
    order: 1,
    icon: AngleBracketsIcon,
    seo: {
      title: 'JavaScript/TypeScript Track - Advanced Concepts & Patterns',
      description:
        'Deep dive into advanced JavaScript and TypeScript concepts. Learn closures, async patterns, performance optimization, and language-specific gotchas for technical interviews.',
      keywords: [
        'advanced javascript',
        'typescript course',
        'javascript closures',
        'async javascript',
        'javascript interview questions',
        'js performance optimization',
        'typescript interview prep',
      ],
      canonical: `${COURSES_PREFIX}${JS_TRACK_PREFIX}`,
    },
    sections: [
      {
        id: CORE_FUNDAMENTALS_PREFIX,
        href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}`,
        title: 'Core Fundamentals',
        description:
          'Master the core JavaScript language and execution model every interview probes.',
        about:
          'Build unshakeable foundations in the concepts interviewers probe first: closures, scope and hoisting, the scope chain, this-binding, prototypes, and the object model. Understand the engine and runtime, the call stack, the event loop, and asynchronous JavaScript, plus data types, coercion, error handling, modules, and memory management.',
        icon: 'browserAndWebAPIsIcon',
        order: 1,
        access: AccessOptions.FREE,
        lessons: [],
      },
      {
        id: TYPESCRIPT_INTRODUCTION_PREFIX,
        href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}`,
        title: 'TypeScript Introduction',
        description:
          'Go from TypeScript basics to generics, type-level programming, and the compiler.',
        about:
          'Learn TypeScript the way interviews expect: from basic types, interfaces, enums, and generics to advanced types, conditional types, utility types, and full type-level programming. Master narrowing with type guards and inference, then round it out with declarations, decorators, namespaces and modules, compiler internals, project configuration, and migration strategies.',
        icon: 'typescriptAdvancedIcon',
        order: 2,
        access: AccessOptions.PREMIUM,
        lessons: [],
      },
      {
        id: FRONTEND_DEVELOPMENT_PREFIX,
        href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}`,
        title: 'Frontend Development',
        description:
          'Master modern frontend engineering, from rendering internals to system design.',
        about:
          'Prepare for frontend interviews with the topics that actually come up: component architecture, state management, the virtual DOM, and reconciliation. Go deep on the web platform (Web APIs, CORS, accessibility, security), performance, testing, build tools, code splitting, server-side rendering, and micro-frontends, then tie it together with a dedicated frontend-interview guide, deployment, Git, and CI/CD.',
        icon: 'modernFrontendIcon',
        order: 3,
        access: AccessOptions.PREMIUM,
        lessons: [],
      },
      {
        id: ADVANCED_CONCEPTS_PREFIX,
        href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}`,
        title: 'Advanced Concepts',
        description:
          'Level up with advanced JavaScript: async patterns, meta-programming, and workers.',
        about:
          'Move beyond the fundamentals into the advanced JavaScript that distinguishes senior engineers: functional programming, higher-order functions, promise patterns, async/await, and generators. Explore meta-programming, symbols, and reflection, then tackle memory leaks, web and service workers, browser storage, event handling, performance optimization, security, and design patterns.',
        icon: 'javascriptMechanicsIcon',
        order: 4,
        access: AccessOptions.PREMIUM,
        lessons: [],
      },
    ],
  },
  {
    id: DSA_TRACK_PREFIX,
    title: 'DSA Track',
    description:
      'Master algorithmic problem solving through practical examples and real interview challenges',
    href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}`,
    order: 2,
    icon: CodingIcon,
    seo: {
      title: 'Data Structures & Algorithms Track - Master Coding Interviews',
      description:
        'Master data structures and algorithms with JavaScript implementations. 165 problems covering arrays, trees, graphs, dynamic programming, and more. Perfect for technical interviews.',
      keywords: [
        'data structures javascript',
        'algorithms javascript',
        'coding interview prep',
        'leetcode javascript',
        'dynamic programming js',
        'javascript algorithms course',
        'dsa interview questions',
      ],
      canonical: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}`,
    },
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
        order: 1,
        access: AccessOptions.FREE,
        lessons: [],
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
        order: 2,
        access: AccessOptions.PREMIUM,
        lessons: [],
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
        order: 3,
        access: AccessOptions.PREMIUM,
        lessons: [],
      },
      {
        id: ADVANCED_TOPICS_PREFIX,
        href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}${ADVANCED_TOPICS_PREFIX}`,
        title: 'Advanced Topics',
        description: 'Diving into complex topics for in-depth understanding.',
        about:
          'Dive into complex topics for an in-depth understanding of sophisticated algorithms. Study network flow algorithms, dynamic programming, segment trees, union find, minimum spanning trees, shortest path algorithms, and more. Gain a competitive edge with knowledge of advanced concepts and their practical applications.',
        icon: 'advancedTopicsIcon',
        order: 4,
        access: AccessOptions.PREMIUM,
        lessons: [],
      },
    ],
  },
]
