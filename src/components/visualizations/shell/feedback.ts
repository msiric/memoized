import type { Checkpoint } from '../step-log/types'

/**
 * Reveal feedback (spec §5.4). The picked row carries ✓ or ×, so a wrong
 * answer leads with "Not quite." rather than repeating the pick in text.
 * Pure: the footprint reserves room for every variant of this text.
 */
export function feedbackText(cp: Checkpoint, picked: string | null): { lead: string; body: string } {
  const answer = cp.choices.find((c) => c.id === cp.answer)
  if (!picked) return { lead: `Answer: ${answer?.value ?? answer?.label}.`, body: cp.feedback.correct }
  if (picked === cp.answer) return { lead: 'Right.', body: cp.feedback.correct }
  return { lead: 'Not quite.', body: cp.feedback.byChoice[picked] ?? '' }
}

/** Every feedback string a checkpoint can show: correct, each wrong pick, skipped. */
export function allFeedback(cp: Checkpoint): string[] {
  const picks: (string | null)[] = [null, ...cp.choices.map((c) => c.id)]
  return picks.map((p) => {
    const f = feedbackText(cp, p)
    return `${f.lead} ${f.body}`
  })
}

/**
 * The end-of-run recap (D21): one plain line naming what the learner
 * predicted at each checkpoint in this pass and how it went. Pure, so the
 * dock can reserve room for every variant. Returns null when nothing was
 * predicted (every checkpoint skipped or jumped over): then the shell shows
 * a neutral invitation instead.
 */
export function recapText(
  checkpoints: readonly Checkpoint[],
  picked: readonly (string | null)[],
): string | null {
  const lines = checkpoints.flatMap((cp, k) => {
    const p = picked[k]
    if (!p) return []
    const value = (id: string) => {
      const c = cp.choices.find((x) => x.id === id)
      return c?.value ?? c?.label ?? id
    }
    if (p === cp.answer) {
      const others = cp.choices.filter((c) => c.id !== cp.answer)
      return others.length === 1
        ? [`You predicted ${value(p)} before ${value(others[0].id)}. Right.`]
        : [`You predicted ${value(p)}. Right.`]
    }
    return [`You predicted ${value(p)}; it was ${value(cp.answer)}.`]
  })
  return lines.length ? lines.join(' ') : null
}

/** The recap when no checkpoint was answered in this pass. */
export const RECAP_NONE = 'Replay to make the prediction yourself.'

/** Every recap the end step can show (for the dock's ghost stack): the longest answer per checkpoint, and none. */
export function allRecaps(checkpoints: readonly Checkpoint[]): string[] {
  if (!checkpoints.length) return []
  const per = checkpoints.map((cp) => cp.choices.map((c) => recapText([cp], [c.id])!))
  const out = new Set<string>([RECAP_NONE])
  per.forEach((variants) => variants.forEach((v) => out.add(v)))
  // Every checkpoint answered, each with its longest line.
  out.add(per.map((v) => v.reduce((a, b) => (b.length > a.length ? b : a))).join(' '))
  return [...out]
}
