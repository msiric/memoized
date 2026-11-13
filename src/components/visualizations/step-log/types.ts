/**
 * The step-log contract (VIZ-01 spec §6.2).
 *
 * A step-log is data: an ordered list of states plus the words that explain
 * each change. Renderers play it; they never compute behavior. Every claim a
 * step makes about what the runtime *observably* did (console output, return
 * values) is tied to a recorded trace of a real run, and a unit test re-runs
 * the snippet and fails on any mismatch (see `truth.ts`). That is the
 * "truthful by construction" rule (P6).
 */

/** How a step knows what it shows. */
export type Claim =
  /** Backed by the recorded trace of a real run (`observes` is required). */
  | 'observed'
  /**
   * Internal machine state that a run cannot print directly (queue
   * membership, environment records). Cross-checked by instrumentation where
   * it exists, otherwise reviewed against the spec and recorded in the PR.
   */
  | 'modelled'

/** A code line (1-based) or an inclusive range. `'host'` = not a line of the reader's code. */
export type StepLine = number | readonly [number, number] | 'host'

export type Step<S> = {
  state: S
  /** What happened. At most 40 characters, shown in the step bar. */
  event: string
  /** Why it happened: the rule or cause, never a restatement of `event`. At most 140 characters. */
  why: string
  /** One sentence for the polite live region ("async1's continuation added to the microtask queue."). */
  narration: string
  line?: StepLine
  /** Ids of the elements that changed (1, or 2 when a value moves). Start has none. */
  focus: readonly string[]
  claim: Claim
  /** Indices into `observed.log` that this step depicts. Required for `observed` steps. */
  observes?: readonly number[]
}

export type Choice = {
  id: string
  label: string
  /**
   * What the runtime would have to observe for this choice to be right. The
   * answer's value is checked against the reveal step's observation.
   */
  value?: string
}

export type Checkpoint = {
  /** The reveal step. The question is asked while the learner is on `beforeStep - 1`. */
  beforeStep: number
  /**
   * When the verdict lands (R7). Default: on the reveal step, as "Right." or
   * "Not quite." with the rows marked. `'end'`: a prediction about the whole
   * run (asked at Start, "Which logs last?"); answering locks it in and the
   * run continues, and the verdict lands with the finale's recap, never
   * earlier (R5). The answer is then the last value the run observes.
   */
  verdict?: 'end'
  /**
   * The recap at the end, with `{pick}` and `{answer}` filled in (H3 R2
   * Q14). The first answered checkpoint is the headline: one short bold
   * clause, "Right: {claim}." or "Not quite: {claim}." (a wrong pick adds
   * "You said {pick}." to the body). Every other answered checkpoint adds
   * its `right` or `wrong` sentence to the body. Defaults: the claim
   * "{answer} was the answer", "You predicted {pick}. Right." and "You
   * predicted {pick}; it was {answer}."
   */
  recap?: { claim: string; right: string; wrong: string }
  /** After a prediction judged at the end locks in: what to do next (default "Now step through to check it."). */
  locked?: string
  /** At most 80 characters (two lines at 288 px). */
  prompt: string
  choices: readonly Choice[]
  answer: string
  feedback: {
    /** Shown after "Right." */
    correct: string
    /** Keyed by every wrong choice id; shown after "Not quite." (the picked row is marked ×) */
    byChoice: Record<string, string>
  }
}

export type CodeToken = { text: string; color?: string }

export type StepLog<S> = {
  /** `<engine>/<preset>`, e.g. `event-loop/basic-ordering`. */
  id: string
  schema: 1
  source: {
    /** The exact program that was run. */
    snippet: string
    /** `node@24.x`: the generator refuses to verify on another major. */
    runtime: string
    /** Which recorder produced `observed` (bump when the recorder changes). */
    generator: string
    /** sha256 of `snippet`, so an edited snippet cannot keep a stale log. */
    sha256: string
  }
  code?: {
    lang: 'js' | 'ts' | 'tsx'
    /** What the reader sees. Every line is at most 40 columns. */
    lines: readonly string[]
    /** Optional pre-computed syntax tokens, one array per line. */
    tokens?: readonly (readonly CodeToken[])[]
  }
  /** `steps[0]` is Start: no focus, no line. */
  steps: readonly Step<S>[]
  checkpoints: readonly Checkpoint[]
  /** The final output of the real run, recorded by the generator. */
  observed: { log?: readonly string[]; result?: unknown }
}

/**
 * What an engine must tell the shared validator about its state shape.
 */
export type StateIntrospection<S> = {
  /** Every element id present in a state (for the `focus` check). */
  ids: (state: S) => ReadonlySet<string>
  /** The observable log as the state shows it (for the trace check). */
  observedLog?: (state: S) => readonly string[]
  /** The region (lane) an element sits in, if the engine has regions (the shell's vacate rule, R1M-13). */
  region?: (state: S, id: string) => string | undefined
}
