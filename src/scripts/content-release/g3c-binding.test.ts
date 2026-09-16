import { describe, expect, it } from 'vitest'
import { assertG3cQuestion, G3C_OLD_CONTRACTS, G3C_QUESTION_SHA256 } from '@/lib/g3c-publication'
import { G3C_TASK } from '@/lib/g3c-task'
import { assertG3cSourceTask } from './catalog'

describe('real G3C publication acceptance gate (no synthetic override)', () => {
  it('binds the complete reviewed payload and rejects blank, opening-only or arbitrary question/setup text', () => {
    expect(G3C_QUESTION_SHA256).toMatch(/^[a-f0-9]{64}$/)
    for (const question of ['', 'Build a React autocomplete for a preloaded list.', 'Any unreviewed question/setup']) {
      expect(() => assertG3cQuestion(question)).toThrow(/exact complete reviewed question\/setup/)
      expect(() => assertG3cSourceTask({
        id: G3C_TASK.id, title: G3C_TASK.title, type: G3C_TASK.type, difficulty: G3C_TASK.difficulty,
        href: '', question, answer: 'Some feedback is not proof of complete question review.',
      }, '/js-track/frontend-development/frontend-interviews')).toThrow(/exact complete reviewed question\/setup/)
    }
  })

  it('records distinct exact legacy question and answer source hashes for all five old records', () => {
    expect(G3C_OLD_CONTRACTS).toHaveLength(5)
    const hashes = G3C_OLD_CONTRACTS.flatMap(contract => [contract.questionSha256, contract.answerSha256])
    expect(hashes.every(hash => /^[a-f0-9]{64}$/.test(hash))).toBe(true)
    expect(new Set(hashes).size).toBe(10)
  })
})
