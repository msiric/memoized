import { describe, expect, it } from 'vitest'
import { groupPracticeProblems } from './problem-presentation'

describe('lesson practice grouping', () => {
  it('groups by type while preserving each item and its order within the group', () => {
    const problems = [
      { id: 'coding-hard', type: 'CODING', difficulty: 'HARD' },
      { id: 'theory-easy', type: 'THEORY', difficulty: 'EASY' },
      { id: 'coding-easy', type: 'CODING', difficulty: 'EASY' },
      { id: 'theory-hard', type: 'THEORY', difficulty: 'HARD' },
    ]
    const before = [...problems]
    const groups = groupPracticeProblems(problems)
    expect(groups.map(group => group.title)).toEqual(['Theory questions', 'Coding practice'])
    expect(groups.map(group => group.problems.map(problem => problem.id))).toEqual([
      ['theory-easy', 'theory-hard'], ['coding-hard', 'coding-easy'],
    ])
    expect(groups[0].problems[0]).toBe(problems[1])
    expect(groups[1].problems[0]).toBe(problems[0])
    expect(problems).toEqual(before)
  })

  it.each(['THEORY', 'CODING'])('keeps a %s-only lesson without an empty second group', type => {
    const problems = [{ id: 'only', type }]
    const groups = groupPracticeProblems(problems)
    expect(groups).toHaveLength(1)
    expect(groups[0].type).toBe(type)
    expect(groups[0].problems).toEqual(problems)
  })

  it('does not manufacture groups for a lesson without attached practice', () => {
    expect(groupPracticeProblems([])).toEqual([])
  })

  it('rejects unsupported types instead of silently dropping questions', () => {
    expect(() => groupPracticeProblems([
      { id: 'visible', type: 'THEORY' }, { id: 'invalid', type: 'IMPLEMENT' },
    ])).toThrow('Unsupported practice problem type')
  })
})
