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
    curriculum: [
      ...builtInDataStructures,
      ...userDefinedDataStructures,
      ...commonTechniques,
      ...advancedTopics,
    ],
  },
]
