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

/** A recap: one short bold verdict clause, then regular-weight sentences (Q14). */
export type Recap = { lead: string; body: string }

/**
 * The end-of-run recap (D21, R7, H3 R2 Q14). The first answered checkpoint
 * is the headline, one short clause led by the verdict ("Right: B logs
 * last."); a wrong pick adds "You said D." to the body; every other answered
 * checkpoint adds its sentence. Pure, so the dock can reserve room for every
 * variant. Returns null when nothing was predicted (every checkpoint skipped
 * or jumped over): then the shell shows a neutral invitation instead.
 */
export function recapText(checkpoints: readonly Checkpoint[], picked: readonly (string | null)[]): Recap | null {
  let lead = ''
  const body: string[] = []
  checkpoints.forEach((cp, k) => {
    const p = picked[k]
    if (!p) return
    const value = (id: string) => {
      const c = cp.choices.find((x) => x.id === id)
      return c ? valueOf(c) : id
    }
    const right = p === cp.answer
    const answer = value(cp.answer)
    const pick = value(p)
    if (!lead) {
      const claim = fill(cp.recap?.claim ?? '{answer} was the answer', pick, answer)
      lead = `${right ? 'Right' : 'Not quite'}: ${claim}.`
      if (!right) body.push(`You said ${pick}.`)
      return
    }
    if (cp.recap) body.push(fill(right ? cp.recap.right : cp.recap.wrong, pick, answer))
    else body.push(right ? `You predicted ${pick}. Right.` : `You predicted ${pick}; it was ${answer}.`)
  })
  return lead ? { lead, body: body.join(' ') } : null
}

/** The recap when no checkpoint was answered in this pass: no verdict, an invitation. */
export const RECAP_NONE: Recap = { lead: '', body: 'Replay to make the prediction yourself.' }

/**
 * Every recap the end step can show (for the dock's ghost stack): each
 * single answer, none, and every checkpoint answered with its longest line
 * (the combinations that can wrap the furthest).
 */
export function allRecaps(checkpoints: readonly Checkpoint[]): Recap[] {
  if (!checkpoints.length) return []
  const out = new Map<string, Recap>([[`${RECAP_NONE.lead}|${RECAP_NONE.body}`, RECAP_NONE]])
  const add = (r: Recap | null) => r && out.set(`${r.lead}|${r.body}`, r)
  // Every combination of picks (checkpoints have at most four choices; two or three checkpoints).
  const options = checkpoints.map((cp) => [null, ...cp.choices.map((c) => c.id)])
  const walk = (k: number, picks: (string | null)[]) => {
    if (k === options.length) return add(recapText(checkpoints, picks))
    for (const o of options[k]) walk(k + 1, [...picks, o])
  }
  walk(0, [])
  return [...out.values()]
}
