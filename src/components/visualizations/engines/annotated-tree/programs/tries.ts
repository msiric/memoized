import type { TreeProgram } from './types'

/**
 * Tries (dsa-track/user-defined-data-structures/tries, PREMIUM), the
 * lesson's own examples as written: TrieNode from "Creating a Trie", then
 * the Trie of "Checking for Prefixes" (insert, search, startsWith) or of
 * "Deleting Words" (insert, delete). The harness inserts the register's
 * words and makes the calls; the probes read the trie (children keys and
 * isEndOfWord, in the lesson's own insertion order) and, for delete, what
 * each recursive step returned.
 */
const PAGE = 'content/dsa-track/user-defined-data-structures/tries/page.mdx'
const NODE = {
  block: { path: PAGE, heading: '### **Creating a Trie**', lang: 'javascript' },
  lessonSha256: '008498007c68ee0264fd0199f42390d37bf22cf8a4c0dd0cbce74885e1fcc534',
  lines: [1, 6],
} as const

export const TRIE_WORDS = ['app', 'apple', 'applet', 'banana'] as const

/** The trie as data: each node's end flag and its children in insertion order. */
const TRIE = (root: string) =>
  `(function node(n) { return { end: n.isEndOfWord, kids: Object.entries(n.children).map(([c, k]) => [c, node(k)]) } })(${root})`

const insertAll = `const trie = new Trie();\nfor (const word of ${JSON.stringify(TRIE_WORDS).replace(/"/g, "'").replace(/,/g, ', ')}) trie.insert(word);`

export const trieSearchProgram: TreeProgram = {
  id: 'trie-search',
  lang: 'js',
  source: [
    NODE,
    {
      block: { path: PAGE, heading: '### **Checking for Prefixes**', lang: 'javascript' },
      lessonSha256: '25710244182da90c52e05a9fa06fadf72601f4d200599170dd9e916cab65090c',
    },
    { code: `${insertAll}\nconsole.log(trie.search('ap'));\nconsole.log(trie.startsWith('ap'));` },
  ],
  // Lines 1-6 TrieNode, 7-44 the Trie, 45-46 the inserts, 47 the first call.
  probes: [{ line: 47, as: 'inserted', read: ['trie'] }],
  watch: { trie: TRIE('trie.root') },
}

export const trieDeleteProgram: TreeProgram = {
  id: 'trie-delete',
  lang: 'js',
  source: [
    NODE,
    {
      block: { path: PAGE, heading: '### **Deleting Words**', lang: 'javascript' },
      lessonSha256: '3953fb950b02ed5bd4c75a88cbe7f6d845f8a9c6164e8a8016ec29c6bbdabece',
    },
    { code: `${insertAll}\ntrie.delete('app');\ntrie.delete('applet');` },
  ],
  // Lines 1-6 TrieNode, 7-43 the Trie (delete's recursion returns on 30, 36
  // and 38; 41 starts it, 42 closes delete), 44-47 the harness.
  probes: [
    { line: 41, as: 'before', read: ['word', 'trie'] },
    { line: 30, at: 'return', as: 'end-of-word', read: ['word', 'depth'] },
    { line: 36, at: 'return', as: 'pruned-child', read: ['word', 'depth', 'char'] },
    { line: 38, at: 'return', as: 'kept-child', read: ['word', 'depth', 'char'] },
    { line: 42, as: 'after', read: ['word', 'trie'] },
  ],
  watch: { trie: TRIE('this.root'), word: 'word', depth: 'depth', char: 'char' },
}
