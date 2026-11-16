import type { TreeProgram } from './types'

/**
 * Suffix Arrays and Suffix Trees (dsa-track/advanced-topics, PREMIUM), the
 * lesson's examples as written. The suffix tree: "Suffix Tree
 * Construction" (Ukkonen's, on "banana", which appends `$`) without its
 * last line (`console.log(st)`, an object dump); the harness prints the
 * string and its length, and the probe reads every node (edge [start, end],
 * suffix index, children in the lesson's Map order). The suffix array and
 * LCP: buildSuffixArray, buildLCPArray (from "Longest Common Substring") and
 * longestRepeatedSubstring, called on "banana$" and "banana".
 */
const PAGE = 'content/dsa-track/advanced-topics/suffix-arrays-and-suffix-trees/page.mdx'

export const suffixTreeProgram: TreeProgram = {
  id: 'suffix-tree',
  lang: 'js',
  source: [
    {
      block: { path: PAGE, heading: '### **Suffix Tree Construction**', lang: 'javascript' },
      lessonSha256: 'b7d278511b40a12deba680483f64e38eb8cfd4f6f4db133bbc369b4a9ec8151b',
      lines: [1, 145],
    },
    { code: 'console.log(st.s, st.n);' },
  ],
  probes: [{ line: 146, as: 'built', read: ['text', 'tree'] }],
  watch: {
    text: 'st.s',
    tree: '(function node(n) { return { start: n.start, end: n.end, index: n.suffixIndex, kids: [...n.children].map(([c, k]) => [c, node(k)]) } })(st.root)',
  },
}

export const suffixArrayProgram: TreeProgram = {
  id: 'suffix-array-lcp',
  lang: 'js',
  source: [
    {
      block: { path: PAGE, heading: '### **Suffix Array Construction**', lang: 'javascript' },
      lessonSha256: '5e6c12af2508b17a634e12588b3cf2d90c62316de2151cbb2109d1005fc20e55',
      lines: [1, 15],
    },
    {
      block: { path: PAGE, heading: '### **Longest Common Substring**', lang: 'javascript' },
      lessonSha256: '6bbdfcd22ba3aeb5d43472a158e28eaea91246fbb7c018b36cdc14d5c1d515b7',
      lines: [25, 47],
    },
    {
      block: { path: PAGE, heading: '### **Longest Repeated Substring**', lang: 'javascript' },
      lessonSha256: '0f90533a58b5643f010809c5bcb6f01de8ba9a17307bd088b2cbbe2f214d18a4',
      lines: [1, 15],
    },
    {
      code: 'const text = "banana$";\nconst sa = buildSuffixArray(text);\nconsole.log(JSON.stringify(sa));\nconsole.log(JSON.stringify(buildLCPArray(text, sa)));\nconsole.log(longestRepeatedSubstring("banana"));',
    },
  ],
  // Lines 1-15, 16-38 and 39-53 the three functions; 56 prints the array.
  probes: [{ line: 56, as: 'sorted', read: ['sa', 'suffixes'] }],
  watch: { sa: 'sa', suffixes: 'sa.map((i) => text.slice(i))' },
}
