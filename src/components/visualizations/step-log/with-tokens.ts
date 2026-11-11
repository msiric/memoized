import type { CodeToken, StepLog } from './types'

/** Attaches pre-computed tokens (from `code-tokens.json`) to a log's code. */
export function withCodeTokens<S>(log: StepLog<S>, table: Record<string, CodeToken[][] | undefined>): StepLog<S> {
  const tokens = table[log.id]
  if (!log.code || !tokens) return log
  return { ...log, code: { ...log.code, tokens } }
}
