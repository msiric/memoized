import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'
import { AccessOptions } from '@prisma/client'
import {
  COURSES_PREFIX,
  JS_TRACK_PREFIX,
  TYPESCRIPT_INTRODUCTION_PREFIX,
} from '../constants'
import { LessonConfig } from '../types'
import { TYPESCRIPT_INTRODUCTION } from '@/problems'

export const typescriptIntroduction: LessonConfig[] = [
  {
    id: '/typescript-fundamentals',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/typescript-fundamentals`,
    title: 'TypeScript Fundamentals',
    description:
      'Learn how to set up TypeScript and understand its key benefits over JavaScript.',
    access: AccessOptions.FREE,
    problems: TYPESCRIPT_INTRODUCTION.typescriptFundamentals,
  },
  {
    id: '/basic-types-and-type-annotations',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/basic-types-and-type-annotations`,
    title: 'Basic Types and Type Annotations',
    description:
      'Master fundamental TypeScript types including number, string, boolean, array, tuple, and type inference.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.basicTypesAndTypeAnnotations,
  },
  {
    id: '/interfaces-and-type-aliases',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/interfaces-and-type-aliases`,
    title: 'Interfaces and Type Aliases',
    description:
      'Learn how to define object shapes and extend interfaces in TypeScript.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.interfacesAndTypeAliases,
  },
  {
    id: '/enums-and-literal-types',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/enums-and-literal-types`,
    title: 'Enums and Literal Types',
    description:
      'Explore numeric and string enums, and understand literal type constraints.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.enumsAndLiteralTypes,
  },
  {
    id: '/generics-and-constraints',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/generics-and-constraints`,
    title: 'Generics and Constraints',
    description:
      'Master generic functions and classes, and learn how to use constraints with extends keyword.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.genericsAndConstraints,
  },
  {
    id: '/advanced-types',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/advanced-types`,
    title: 'Advanced Types',
    description:
      'Understand union and intersection types, type guards, and type narrowing techniques.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.advancedTypes,
  },
  {
    id: '/mapped-and-conditional-types',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/mapped-and-conditional-types`,
    title: 'Mapped and Conditional Types',
    description:
      'Master keyof and typeof operators, and learn to work with conditional type expressions.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.mappedAndConditionalTypes,
  },
  {
    id: '/utility-types-deep-dive',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/utility-types-deep-dive`,
    title: 'Utility Types Deep Dive',
    description:
      'Explore built-in utility types like Partial, Readonly, Pick, Omit, Record, Exclude, and Extract.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.utilityTypesDeepDive,
  },
  {
    id: '/type-guards-and-type-narrowing',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/type-guards-and-type-narrowing`,
    title: 'Type Guards and Type Narrowing',
    description:
      'Learn about user-defined type guards and working with discriminated unions.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.typeGuardsAndTypeNarrowing,
  },
  {
    id: '/declaration-files-and-ambient-declarations',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/declaration-files-and-ambient-declarations`,
    title: 'Declaration Files and Ambient Declarations',
    description:
      'Master creating .d.ts files and consuming JavaScript libraries in TypeScript.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.declarationFilesAndAmbientDeclarations,
  },
  {
    id: '/decorators-and-metadata',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/decorators-and-metadata`,
    title: 'Decorators and Metadata',
    description:
      'Explore class, method, and property decorators, and the metadata reflection API.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.decoratorsAndMetadata,
  },
  {
    id: '/type-level-programming',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/type-level-programming`,
    title: 'Type-Level Programming',
    description:
      'Master recursive types and advanced type manipulations in TypeScript.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.typeLevelProgramming,
  },
  {
    id: '/compiler-api',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/compiler-api`,
    title: 'Compiler API',
    description:
      'Learn about programmatic AST manipulation and creating custom transformers.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.compilerApi,
  },
  {
    id: '/project-configuration-and-build-tools',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/project-configuration-and-build-tools`,
    title: 'Project Configuration and Build Tools',
    description:
      'Master tsconfig.json options and integration with Webpack and Babel.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.projectConfigurationAndBuildTools,
  },
  {
    id: '/migration-strategies',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/migration-strategies`,
    title: 'Migration Strategies',
    description:
      'Learn strategies for migrating from JavaScript to TypeScript and implementing incremental adoption.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.migrationStrategies,
  },
  {
    id: '/type-inference-and-compatibility',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/type-inference-and-compatibility`,
    title: 'Type Inference and Compatibility',
    description:
      'Understand structural typing and compatibility between different types in TypeScript.',
    access: AccessOptions.PREMIUM,
    problems: TYPESCRIPT_INTRODUCTION.typeInferenceAndCompatibility,
  },
  {
    id: '/namespaces-and-modules',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${TYPESCRIPT_INTRODUCTION_PREFIX}/namespaces-and-modules`,
    title: 'Namespaces and Modules',
    description:
      'Learn about organizing code with namespaces and implementing module resolution strategies.',
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
