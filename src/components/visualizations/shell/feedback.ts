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
