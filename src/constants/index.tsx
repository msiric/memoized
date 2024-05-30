import { advancedTopics } from '@/components/AdvancedTopics'
import { builtInDataStructures } from '@/components/BuiltInDataStructures'
import { commonTechniques } from '@/components/CommonTechniques'
import { userDefinedDataStructures } from '@/components/UserDefinedDataStructures'

export const appName = 'Memoized'

export const completeCurriculum = [
  {
    id: 'dsAlgo',
    title: 'Data Structures and Algorithms',
    description: 'The complete coding interview preparation',
    sections: [
      {
        title: 'Built-In Data Structures',
        description:
          'Understanding and utilizing built-in data structures in programming.',
        lessons: [...builtInDataStructures],
      },
      {
        title: 'User-Defined Data Structures',
        description:
          'Creating and implementing custom data structures for various needs.',
        lessons: [...userDefinedDataStructures],
      },
      {
        title: 'Common Techniques',
        description:
          'Exploring widely-used algorithms and problem-solving techniques.',
        lessons: [...commonTechniques],
      },
      {
        title: 'Advanced Topics',
        description:
          'Diving into complex data structures and algorithms for in-depth understanding.',
        lessons: [...advancedTopics],
      },
    ],
  },
]
