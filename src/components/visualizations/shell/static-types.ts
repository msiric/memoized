import type { ComponentType } from 'react'
import type { PerVariant } from './types'

/**
 * Static diagrams (spec §3.3, §6.4): a `figure` with a title, a stage, a
 * why-caption and "Diagram as text". Rendered on the server with zero client
 * JavaScript; registered beside the step-throughs under the same
 * `<Viz id preset>` contract.
 */

/** A program the diagram draws, with the output of a real run (spec P6). */
export type VerifiedProgram = {
  id: string
  /** Exactly the code the reader sees. */
  snippet: string
  /** `node@24.x` style. */
  runtime: string
  sha256: string
  /** Committed output of a real run, line by line. */
  observed: string[]
}

/**
 * An observable fact the picture claims, checked by running the program
 * with `probe` appended in a fresh Node process: the probe must print
 * exactly `expect` after the program's own output. Presets derive `expect`
 * from the diagram data, so a wrong box value fails the test.
 */
export type Claim = {
  says: string
  program: string
  probe: string
  expect: string[]
}

export type StaticTextAlternative = {
  parts: { heading: string; lines: string[] }[]
  outputs: { label: string; text: string }[]
  /** What is modelled rather than observed, said once. */
  model?: string
}

export type StaticPreset<D> = {
  id: string
  /** Manifest and gallery name. At most 18 characters. */
  label: string
  /** Figure title. At most 40 characters (one line at 288 px). */
  title: string
  /** The why-sentence (§5.3), at most 140 characters. */
  caption: string
  programs: VerifiedProgram[]
  claims: Claim[]
  data: D
}

/** The React-free half of a static engine: safe for the server, tests and the manifest. */
export type StaticEngineCore<D> = {
  id: string
  /** Stage height per variant: fixed for every width of the variant. */
  stageHeight: (data: D) => PerVariant<number>
  /** The text alternative's parts; the figure adds each program's verified output. */
  describe: (data: D) => Omit<StaticTextAlternative, 'outputs'>
}

export type StaticStageProps<D> = { data: D; uid: string }

export type StaticEngine<D> = StaticEngineCore<D> & {
  Stage: ComponentType<StaticStageProps<D>>
}

export type StaticDescriptor<D> = {
  id: string
  form: 'static'
  /** Manifest name of the shared visual. At most 40 characters. */
  title: string
  engine: StaticEngineCore<D>
  presets: readonly StaticPreset<D>[]
  defaultPreset: string
  since: string
}

export type StaticDefinition<D> = Omit<StaticDescriptor<D>, 'engine'> & {
  engine: StaticEngine<D>
}

/** Props of a static visual's component (`interactive` is accepted and ignored: nothing is interactive). */
export type VizStaticProps = { preset?: string; interactive?: boolean }
