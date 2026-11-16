import codeTokens from '../../code-tokens.json'
import type { EngineCore, Preset, StepThroughDescriptor } from '../../shell/types'
import type { StepLog } from '../../step-log/types'
import { withCodeTokens } from '../../step-log/with-tokens'
import { commentRows } from './build'
import { slidingWindowMetrics } from './layout'
import { describeWindow, swIntrospection, type SWState } from './model'
import { K_DISTINCT_DISPLAY, K_DISTINCT_IF_DISPLAY, kDistinctIfLog, kDistinctWhileLog } from './presets/k-distinct'
import { setShrinkAbbaIfLog, setShrinkAbbaLog, setShrinkAbcabcbbLog, setShrinkPwwkewLog } from './presets/set-shrink'
import type { DisplayRow } from '../../step-log/lesson-source'

/**
 * The sliding-window step-through without its renderer: pure data and
 * functions, so the registry, the manifest route and the tests use it
 * without React. One id for the shared visual (R4 shared visual 2), one
 * lesson group per lesson (`Preset.group`).
 */

export const slidingWindowEngineCore: EngineCore<SWState> = {
  id: 'sliding-window',
  describe: describeWindow,
  layout: (logs, all) => slidingWindowMetrics(logs, all).layout,
  introspect: swIntrospection,
}

/** Committed tokens, with a comment the pane breaks over rows coloured as one comment. */
function tokens(log: StepLog<SWState>, display: readonly DisplayRow[]): StepLog<SWState> {
  const withTokens = withCodeTokens(log, codeTokens)
  const t = withTokens.code?.tokens
  return t ? { ...withTokens, code: { ...withTokens.code!, tokens: commentRows(t, display) } } : withTokens
}

const presets: Preset<SWState>[] = [
  // Sliding Window Technique: the lesson's example, `while` as written and `if` instead.
  { id: 'araaci-k2', label: 'while', group: 'sliding-window', log: tokens(kDistinctWhileLog, K_DISTINCT_DISPLAY) },
  { id: 'araaci-k2-if', label: 'if instead', group: 'sliding-window', log: tokens(kDistinctIfLog, K_DISTINCT_IF_DISPLAY) },
  // JavaScript Strings, longest-substring-without-repeating-characters (a practice answer: tokens come with the page).
  { id: 'set-shrink-longest-substring', label: 'pwwkew', group: 'strings', log: setShrinkPwwkewLog },
  { id: 'set-shrink-abcabcbb', label: 'abcabcbb', group: 'strings', log: setShrinkAbcabcbbLog },
  { id: 'set-shrink-abba', label: 'abba', group: 'strings', log: setShrinkAbbaLog },
  { id: 'set-shrink-abba-if', label: 'abba, if', group: 'strings', log: setShrinkAbbaIfLog },
]

export const slidingWindowDescriptor: StepThroughDescriptor<SWState> = {
  id: 'sliding-window',
  form: 'step',
  title: 'Sliding window: shrink condition',
  engine: slidingWindowEngineCore,
  presets,
  defaultPreset: 'araaci-k2',
  since: '2026-11',
}
