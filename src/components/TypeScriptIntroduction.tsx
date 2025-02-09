import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'
import { TYPESCRIPT_INTRODUCTION } from '@/problems'
import { AccessOptions } from '@prisma/client'
import {
  COURSES_PREFIX,
  JS_TRACK_PREFIX,
  TYPESCRIPT_INTRODUCTION_PREFIX,
} from '../constants'
import { LessonConfig } from '../types'

export const typescriptIntroduction: LessonConfig[] = [
  {
    id: '/ts-basics',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/ts-basics`,
    title: 'TS Basics',
    description: 'Learn TypeScript fundamentals and setup.',
    access: AccessOptions.FREE,
    problems: TYPESCRIPT_INTRODUCTION.tsBasics,
  },
  {
    id: '/basic-types',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/basic-types`,
    title: 'Basic Types',
    description: 'Master fundamental TypeScript types and type inference.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.basicTypes,
  },
  {
    id: '/interfaces',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/interfaces`,
    title: 'Interfaces',
    description: 'Learn interface definitions and extensions.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.interfaces,
  },
  {
    id: '/enums',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/enums`,
    title: 'Enums',
    description: 'Explore numeric and string enums.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.enums,
  },
  {
    id: '/generics',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/generics`,
    title: 'Generics',
    description: 'Master generic types and constraints.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.generics,
  },
  {
    id: '/advanced-types',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/advanced-types`,
    title: 'Advanced Types',
    description: 'Learn union types, intersections, and type guards.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.advancedTypes,
  },
  {
    id: '/conditional-types',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/conditional-types`,
    title: 'Conditional Types',
    description: 'Master mapped and conditional type expressions.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.conditionalTypes,
  },
  {
    id: '/utility-types',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/utility-types`,
    title: 'Utility Types',
    description: 'Explore built-in utility types and their uses.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.utilityTypes,
  },
  {
    id: '/type-guards',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/type-guards`,
    title: 'Type Guards',
    description: 'Implement custom type guards and narrowing.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.typeGuards,
  },
  {
    id: '/declarations',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/declarations`,
    title: 'Declarations',
    description: 'Work with declaration files and ambient modules.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.declarations,
  },
  {
    id: '/decorators',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/decorators`,
    title: 'Decorators',
    description: 'Master class and method decorators.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.decorators,
  },
  {
    id: '/type-level-programming',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/type-level-programming`,
    title: 'Type-level Programming',
    description: 'Learn advanced type-level programming.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.typeLevelProgramming,
  },
  {
    id: '/compiler',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/compiler`,
    title: 'Compiler',
    description: 'Use the TypeScript Compiler API.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.compiler,
  },
  {
    id: '/project-configuration',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/project-configuration`,
    title: 'Project Configuration',
    description: 'Master TypeScript configuration and tooling.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.projectConfiguration,
  },
  {
    id: '/migration-strategies',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/migration-strategies`,
    title: 'Migration strategies',
    description: 'Learn JavaScript to TypeScript migration strategies.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.migrationStrategies,
  },
  {
    id: '/type-inference',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/type-inference`,
    title: 'Type Inference',
    description: 'Understand TypeScript type inference and compatibility.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.typeInference,
  },
  {
    id: '/namespaces-and-modules',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/namespaces-and-modules`,
    title: 'Namespaces and Modules',
    description: 'Master TypeScript modules and namespaces.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.namespacesAndModules,
  },
]

export function TypeScriptIntroduction() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="typescriptIntroduction">
        TypeScript Introduction
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/5">
        {typescriptIntroduction.map((item) => (
          <div key={item.href}>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              {item.title}
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {item.description}
            </p>
            <p className="mt-4">
              <Button href={item.href} variant="text" arrow="right">
                Read more
              </Button>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
