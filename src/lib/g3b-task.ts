export const G3B_LESSON_UID = 'dsa-track/common-techniques/longest-common-substring'
export const G3B_LESSON_CONTENT_ID = `/${G3B_LESSON_UID}`
export const G3B_LESSON_HREF = `/courses/${G3B_LESSON_UID}`
export const G3B_TASK_ID = 'find-a-longest-common-substring'
export const G3B_TASK = {
  id: G3B_TASK_ID,
  contentId: `${G3B_LESSON_CONTENT_ID}/${G3B_TASK_ID}`,
  title: 'Find a Longest Common Substring',
  slug: G3B_TASK_ID,
  type: 'CODING',
  difficulty: 'MEDIUM',
  href: '',
  link: `${G3B_LESSON_HREF}#${G3B_TASK_ID}`,
  question: [
    'Write `findLongestCommonSubstring(s1, s2)` to return one longest contiguous substring shared by both strings. Explain what your table state means and the time and space your solution uses.',
    'Each input has 0 to 500 characters, inclusive. Inputs contain only printable ASCII characters from U+0020 to U+007E, including spaces. Matching is case-sensitive.',
    'Return `""` if either input is empty or the strings share no character. If several longest substrings tie, return any one of them. Inputs outside these constraints do not need special handling.',
  ].join('\n\n'),
} as const

export const G3B_CARD_ORDER = [
  `${G3B_LESSON_CONTENT_ID}/longest-common-prefix`,
  `${G3B_LESSON_CONTENT_ID}/longest-common-subsequence`,
  `${G3B_LESSON_CONTENT_ID}/edit-distance`,
  G3B_TASK.contentId,
] as const

export function orderG3bPractice<T extends { contentId: string | null }>(
  lessonContentId: string | null,
  problems: T[],
): T[] {
  if (lessonContentId !== G3B_LESSON_CONTENT_ID || problems.length !== G3B_CARD_ORDER.length) return problems
  const byId = new Map(problems.map(problem => [problem.contentId, problem]))
  if (byId.size !== G3B_CARD_ORDER.length || !G3B_CARD_ORDER.every(id => byId.has(id))) return problems
  return G3B_CARD_ORDER.map(id => byId.get(id)!)
}
