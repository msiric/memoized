import type { Checkpoint } from '../step-log/types'

/**
 * Reveal feedback (spec §5.4, R4). The picked row carries ✓ or ×, so a wrong
 * answer leads with "Not quite." rather than repeating the pick in text.
 *
 * A prediction judged at the end (`verdict: 'end'`, R7) never shows a
 * verdict when answered: it is locked in ("Locked in: B.") and the learner
 * runs the code, so nothing gives the answer away (R5).
 *
 * Pure: the dock reserves room for every variant of this text.
 */
export function feedbackText(cp: Checkpoint, picked: string | null): { lead: string; body: string } {
  const answer = cp.choices.find((c) => c.id === cp.answer)
  if (cp.verdict === 'end') {
    const pick = cp.choices.find((c) => c.id === picked)
    return pick ? { lead: `Locked in: ${valueOf(pick)}.`, body: cp.locked ?? LOCKED_BODY } : { lead: '', body: '' }
  }
  if (!picked) return { lead: `Answer: ${answer?.value ?? answer?.label}.`, body: cp.feedback.correct }
  if (picked === cp.answer) return { lead: 'Right.', body: cp.feedback.correct }
  return { lead: 'Not quite.', body: cp.feedback.byChoice[picked] ?? '' }
}

/** What follows a locked-in prediction by default: the learner runs the code to check it. */
export const LOCKED_BODY = 'Now step through to check it.'

const valueOf = (c: { label: string; value?: string }) => c.value ?? c.label

/** Every feedback a checkpoint can show once answered: correct, each wrong pick, skipped. */
export function allFeedback(cp: Checkpoint): { lead: string; body: string }[] {
  const picks: (string | null)[] = [null, ...cp.choices.map((c) => c.id)]
  return picks.map((p) => feedbackText(cp, p)).filter((f) => f.lead)
}

/** The same, as plain strings (footprint estimates). */
export function allFeedbackStrings(cp: Checkpoint): string[] {
  return allFeedback(cp).map((f) => `${f.lead} ${f.body}`.trim())
}

const fill = (t: string, pick: string, answer: string) => t.replaceAll('{pick}', pick).replaceAll('{answer}', answer)

/**
 * The end-of-run recap (D21, R7): one plain line naming what the learner
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
      return c ? valueOf(c) : id
    }
    const right = p === cp.answer
    if (cp.recap) return [fill(right ? cp.recap.right : cp.recap.wrong, value(p), value(cp.answer))]
    if (right) {
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

/**
 * Every recap the end step can show (for the dock's ghost stack): each
 * single answer, none, and every checkpoint answered with its longest line
 * (the combinations that can wrap the furthest).
 */
export function allRecaps(checkpoints: readonly Checkpoint[]): string[] {
  if (!checkpoints.length) return []
  const per = checkpoints.map((cp, k) =>
    cp.choices.map((c) => {
      const picks = checkpoints.map((_, j) => (j === k ? c.id : null))
      return recapText(checkpoints, picks)!
    }),
  )
  const out = new Set<string>([RECAP_NONE])
  per.forEach((variants) => variants.forEach((v) => out.add(v)))
  out.add(per.map((v) => v.reduce((a, b) => (b.length > a.length ? b : a))).join(' '))
  return [...out]
}
