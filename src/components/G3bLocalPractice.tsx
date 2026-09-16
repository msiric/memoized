'use client'

import { G3B_TASK } from '@/lib/g3b-task'
import { G3B_LOCAL_STARTERS } from '@/lib/g3b-local-practice'
import { isNativeCodingProblem } from '@/lib/problem-presentation'
import { CodeGroup } from './Code'

function PlainCodePanel({ code }: { language: string; code: string }) {
  return <code className="block whitespace-pre" tabIndex={0}>{code}</code>
}

export function G3bLocalPractice({ problem }: {
  problem: { contentId?: string | null; type: string; href?: string | null }
}) {
  if (problem.contentId !== G3B_TASK.contentId || !isNativeCodingProblem(problem)) return null

  return (
    <details className="my-4 rounded-lg border border-zinc-200 p-3 text-sm leading-6 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300 sm:p-4">
      <summary className="cursor-pointer font-medium text-zinc-900 dark:text-zinc-100">
        Starter and local commands
      </summary>
      <div className="mt-3 space-y-3">
        <p>
          Use Node 24. The TypeScript option also needs TypeScript 5.9.2 available
          as <code>tsc</code>. You don&apos;t need that compiler for the JavaScript starter.
          This task has no in-site editor, Run button or automatic judge.
        </p>
        <p>
          Choose one starter and save it as <code>substring.js</code> or{' '}
          <code>substring.ts</code>. It deliberately throws{' '}
          <code>Not implemented: write your solution here.</code> Replace that
          throw with your implementation before expecting a result.
        </p>
        <section aria-label="Starter code">
          <CodeGroup title="">
            {G3B_LOCAL_STARTERS.map(starter => (
              <PlainCodePanel key={starter.language} language={starter.language} code={starter.code} />
            ))}
          </CodeGroup>
        </section>
        <p>Run these commands from the folder containing your file:</p>
        <section aria-label="Local commands">
          <CodeGroup title="">
            {G3B_LOCAL_STARTERS.map(starter => (
              <PlainCodePanel key={starter.language} language={starter.language} code={starter.commands} />
            ))}
          </CodeGroup>
        </section>
        <p>
          For TypeScript, check that <code>tsc --version</code> reports 5.9.2.
          Compilation can succeed while the placeholder still throws. Compile
          again after editing before running the emitted JavaScript.
        </p>
        <p>
          The sample should return <code>abcd</code>. Also try <code>abc</code>{' '}
          with <code>ac</code>, where either <code>a</code> or <code>c</code> is
          valid, and an empty input, which should return <code>&quot;&quot;</code>.
          Explain your table state before comparing it with the answer.
        </p>
      </div>
    </details>
  )
}
