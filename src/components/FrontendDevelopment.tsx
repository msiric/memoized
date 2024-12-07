import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'
import { AccessOptions } from '@prisma/client'
import {
  COURSES_PREFIX,
  FRONTEND_DEVELOPMENT_PREFIX,
  JS_TRACK_PREFIX,
} from '../constants'
import { LessonConfig } from '../types'
import { FRONTEND_DEVELOPMENT } from '@/problems'

export const frontendDevelopment: LessonConfig[] = [
  {
    id: '/component-architecture-patterns',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/component-architecture-patterns`,
    title: 'Component Architecture Patterns',
    description:
      'Master MVC, MVVM, Flux patterns and component-based design principles.',
    access: AccessOptions.FREE,
    problems: FRONTEND_DEVELOPMENT.componentArchitecturePatterns,
  },
  {
    id: '/state-management-solutions',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/state-management-solutions`,
    title: 'State Management Solutions',
    description:
      'Learn Redux principles and explore alternatives like Context API and MobX.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.stateManagementSolutions,
  },
  {
    id: '/virtual-dom-and-rendering',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/virtual-dom-and-rendering`,
    title: 'Virtual DOM and Rendering',
    description:
      'Understand how Virtual DOM works and explore reconciliation algorithms.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.virtualDomAndRendering,
  },
  {
    id: '/rendering-and-reconciliation',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/rendering-and-reconciliation`,
    title: 'Rendering and Reconciliation',
    description:
      'Master efficient updates and understand React Fiber architecture.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.renderingAndReconciliation,
  },
  {
    id: '/browser-apis-and-web-standards',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/browser-apis-and-web-standards`,
    title: 'Browser APIs and Web Standards',
    description:
      'Learn DOM manipulation, Fetch API, and WebSocket implementation.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.browserApisAndWebStandards,
  },
  {
    id: '/cross-origin-communication',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/cross-origin-communication`,
    title: 'Cross-Origin Communication',
    description: 'Master CORS mechanisms and working with the postMessage API.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.crossOriginCommunication,
  },
  {
    id: '/testing-strategies',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/testing-strategies`,
    title: 'Testing Strategies',
    description:
      'Learn unit testing with Jest and integration testing with Testing Library.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.testingStrategies,
  },
  {
    id: '/build-tools-and-bundlers',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/build-tools-and-bundlers`,
    title: 'Build Tools and Bundlers',
    description:
      'Master Webpack configuration, code splitting, and tree shaking techniques.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.buildToolsAndBundlers,
  },
  {
    id: '/code-splitting-and-lazy-loading',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/code-splitting-and-lazy-loading`,
    title: 'Code Splitting and Lazy Loading',
    description:
      'Implement dynamic imports and optimize performance with lazy loading.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.codeSplittingAndLazyLoading,
  },
  {
    id: '/micro-frontend-architecture',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/micro-frontend-architecture`,
    title: 'Micro-Frontend Architecture',
    description:
      'Learn to build scalable frontends and implement integration patterns.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.microFrontendArchitecture,
  },
  {
    id: '/server-side-rendering',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/server-side-rendering`,
    title: 'Server-Side Rendering',
    description:
      'Understand SSR benefits and implement it in React/Angular applications.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.serverSideRendering,
  },
  {
    id: '/web-performance-metrics',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/web-performance-metrics`,
    title: 'Web Performance Metrics',
    description:
      'Master performance measurement with Lighthouse and optimize load times.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.webPerformanceMetrics,
  },
  {
    id: '/accessibility-implementation',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/accessibility-implementation`,
    title: 'Accessibility Implementation',
    description:
      'Learn ARIA roles and attributes and implement accessible design practices.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.accessibilityImplementation,
  },
  {
    id: '/security-best-practices',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/security-best-practices`,
    title: 'Security Best Practices',
    description:
      'Master OWASP Top Ten and implement secure authentication and authorization.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.securityBestPractices,
  },
  {
    id: '/interview-questions-and-challenges',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/interview-questions-and-challenges`,
    title: 'Common Interview Questions and Coding Challenges',
    description:
      'Practice solving algorithmic problems and learn whiteboard coding techniques.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.commonInterviewQuestionsAndCodingChallenges,
  },
  {
    id: '/building-and-deploying-applications',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/building-and-deploying-applications`,
    title: 'Building and Deploying Applications',
    description:
      'Learn project setup, development, and deployment to cloud services.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.buildingAndDeployingApplications,
  },
  {
    id: '/version-control-and-collaboration',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/version-control-and-collaboration`,
    title: 'Version Control and Collaboration',
    description:
      'Master Git workflows, code reviews, and pull request processes.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.versionControlAndCollaboration,
  },
  {
    id: '/continuous-integration-and-deployment',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/continuous-integration-and-deployment`,
    title: 'Continuous Integration and Deployment',
    description:
      'Set up CI pipelines and implement automated testing and deployment.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.continuousIntegrationAndDeployment,
  },
]

export function FrontendDevelopment() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="frontendDevelopment">
        Frontend Development
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/5">
        {frontendDevelopment.map((item) => (
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
