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

/** A recap: one short bold verdict clause, then one regular-weight sentence (Q14). */
export type Recap = { lead: string; body: string }

/**
 * The end-of-run recap (D21, R7, H3 R2 Q14, final polish): one bold result
 * clause and at most one regular sentence, two lines at most on a 375 px
 * phone (`feedback.test.ts` measures every combination).
 *
 * - The first answered checkpoint is the headline: "Right: B logs last." or
 *   "Not quite: B logs last, not A." (`recap.right`, `recap.wrongLead`).
 * - The sentence is a later prediction's correction only when it was wrong
 *   ("C, a microtask, ran before B.", `recap.wrong`); otherwise the end
 *   step's own rule (`end`, its `why`). A later right answer adds nothing.
 * - Nothing predicted in this pass (every checkpoint skipped or jumped
 *   over): no verdict, a short invitation before the rule (`RECAP_NONE`).
 *
 * Pure, so the dock can reserve room for every variant.
 */
export function recapText(checkpoints: readonly Checkpoint[], picked: readonly (string | null)[], end = ''): Recap {
  let lead = ''
  let correction = ''
  checkpoints.forEach((cp, k) => {
    const p = picked[k]
    if (!p) return
    const value = (id: string) => {
      const c = cp.choices.find((x) => x.id === id)
      return c ? valueOf(c) : id
    }
    const right = p === cp.answer
    const pick = value(p)
    const answer = value(cp.answer)
    const r = { ...DEFAULT_RECAP, ...cp.recap }
    if (!lead) {
      lead = `${right ? 'Right' : 'Not quite'}: ${fill(right ? r.right : r.wrongLead, pick, answer)}.`
      return
    }
    if (!right && !correction) correction = fill(r.wrong, pick, answer)
  })
  if (!lead) return { lead: '', body: `${RECAP_NONE.body} ${end}`.trim() }
  return { lead, body: correction || end }
}

/** The recap's defaults (a checkpoint's `recap` overrides any of them). */
const DEFAULT_RECAP = {
  right: '{answer} was the answer',
  wrongLead: '{answer} was the answer, not {pick}',
  wrong: 'It was {answer}, not {pick}.',
}

/** The recap when no checkpoint was answered in this pass: no verdict, an invitation (then the rule). */
export const RECAP_NONE: Recap = { lead: '', body: 'Replay to predict it.' }

/**
 * Every recap the end step can show (for the dock's ghost stack): each
 * single answer, none, and every checkpoint answered with its longest line
 * (the combinations that can wrap the furthest).
 */
export function allRecaps(checkpoints: readonly Checkpoint[], end = ''): Recap[] {
  if (!checkpoints.length) return []
  const out = new Map<string, Recap>()
  const add = (r: Recap) => out.set(`${r.lead}|${r.body}`, r)
  // Every combination of picks (checkpoints have at most four choices; two or three checkpoints).
  const options = checkpoints.map((cp) => [null, ...cp.choices.map((c) => c.id)])
  const walk = (k: number, picks: (string | null)[]) => {
    if (k === options.length) return add(recapText(checkpoints, picks, end))
    for (const o of options[k]) walk(k + 1, [...picks, o])
  }
  walk(0, [])
  return [...out.values()]
}
