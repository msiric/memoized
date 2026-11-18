import type { TreeProgram } from './types'

/**
 * Wave 4A, the DSA static figures (R4 rows segment-trees, union-find, heaps,
 * recursion-and-memoization, palindromic-subsequence; all five lessons
 * PREMIUM). Each program is a lesson example run as written (read from the
 * local content checkout by locator and sha256, never committed), then the
 * register's calls as a harness where the example has none. Probes are
 * breakpoints on lines of the program as run; the figures are built from
 * the values the paused frames hold (`../presets/dsa.ts`).
 */

// ---------------------------------------------------------------------------
// Segment Trees (dsa-track/advanced-topics/segment-trees)
// ---------------------------------------------------------------------------

const SEGMENT = {
  block: { path: 'content/dsa-track/advanced-topics/segment-trees/page.mdx', heading: '### **Creating a Segment Tree**', lang: 'javascript' },
  lessonSha256: '6cd67b29e25a340bf7e1fcbf9cb1ed9daad2435cb42219f1dc55399c110485d6',
} as const

/**
 * The lesson's SegmentTree example as written: query(1, 3), update(1, 10),
 * query(1, 3). Probes: every update call's entry (line 20), every query
 * call's entry (line 34) and the three ways a query call ends: disjoint
 * (line 35), fully inside (line 38) or split in two (line 40); tree[] before
 * each of the three statements and after the last call returns (the root's
 * return, line 43).
 */
export const segmentProgram: TreeProgram = {
  id: 'segment-tree',
  lang: 'js',
  source: [SEGMENT],
  probes: [
    { line: 20, as: 'update', read: ['node', 'start', 'end', 'sum'] },
    { line: 34, as: 'visit', read: ['node', 'start', 'end', 'L', 'R', 'sum'] },
    { line: 35, as: 'disjoint', read: ['node'] },
    { line: 38, as: 'full', read: ['node', 'sum'] },
    { line: 40, as: 'partial', read: ['node'] },
    { line: 51, as: 'tree', read: ['tree'] },
    { line: 52, as: 'tree', read: ['tree'] },
    { line: 53, as: 'tree', read: ['tree'] },
  ],
  watch: {
    node: 'node',
    start: 'start',
    end: 'end',
    L: 'L',
    R: 'R',
    sum: 'this.tree[node]',
    tree: 'segTree.tree.slice()',
  },
}

const LAZY = {
  block: { path: 'content/dsa-track/advanced-topics/segment-trees/page.mdx', heading: '### **Lazy Propagation**', lang: 'javascript' },
  lessonSha256: '7b183391e598fd81a871d8761cd98d63107df2bd2e699c8413c62a5b4a6c0df0',
} as const

/**
 * The lesson's LazySegmentTree example as written: queryRange(1, 3),
 * updateRange(0, 2, 10), queryRange(1, 3). Probes: every updateRange call
 * past its pending-tag step (line 29) and how it ends (lines 30, 33, 40);
 * every queryRange call's entry, before its pending tag is applied (line 47),
 * and how it ends (lines 56, 59, 61); tree[] and lazy[] before each of the
 * three statements, and at every split call's return (line 64), the last of
 * which is the root's, after the run.
 */
export const lazyProgram: TreeProgram = {
  id: 'lazy-segment-tree',
  lang: 'js',
  source: [LAZY],
  probes: [
    { line: 29, as: 'u-visit', read: ['node', 'start', 'end'] },
    { line: 30, as: 'u-disjoint', read: ['node'] },
    { line: 33, as: 'u-full', read: ['node', 'sum'] },
    { line: 40, as: 'u-partial', read: ['node'] },
    { line: 47, as: 'q-visit', read: ['node', 'start', 'end', 'sum', 'tag'] },
    { line: 56, as: 'q-disjoint', read: ['node', 'sum'] },
    { line: 59, as: 'q-full', read: ['node', 'sum'] },
    { line: 61, as: 'q-partial', read: ['node', 'sum'] },
    { line: 64, as: 'q-return', read: ['node', 'own', 'lazy'] },
    { line: 72, as: 'state', read: ['tree', 'lazy'] },
    { line: 73, as: 'state', read: ['tree', 'lazy'] },
    { line: 74, as: 'state', read: ['tree', 'lazy'] },
  ],
  watch: {
    node: 'node',
    start: 'start',
    end: 'end',
    sum: 'this.tree[node]',
    tag: 'this.lazy[node]',
    own: 'this.tree.slice()',
    tree: 'lazySegTree.tree.slice()',
    lazy: 'lazySegTree.lazy.slice()',
  },
}

// ---------------------------------------------------------------------------
// Union-Find (dsa-track/advanced-topics/union-find)
// ---------------------------------------------------------------------------

const UNION_FIND = {
  block: { path: 'content/dsa-track/advanced-topics/union-find/page.mdx', heading: '### **Creating a Union-Find Data Structure**', lang: 'javascript' },
  lessonSha256: '44664e06c4bffb06cbc6a85b198b827a1a0f9e186ec81e9601ede66c0db19a25',
} as const

const BY_SIZE = {
  block: { path: 'content/dsa-track/advanced-topics/union-find/page.mdx', heading: '### **Union by Rank/Size**', lang: 'javascript' },
  lessonSha256: 'd8d4067654d9a6b60dbf570ff9717c47aa9031c16a1888f2227e63df459f8a58',
} as const

/** The lesson's UnionFind example as written (union by rank, path compression); parent[] and rank[] before the second union (line 34) and before the finds (line 35). */
export const unionRankProgram: TreeProgram = {
  id: 'union-find-rank',
  lang: 'js',
  source: [UNION_FIND],
  probes: [
    { line: 34, as: 'state', read: ['parent', 'rank'] },
    { line: 35, as: 'state', read: ['parent', 'rank'] },
  ],
  watch: { parent: 'uf.parent.slice()', rank: 'uf.rank.slice()' },
}

/** The lesson's UnionFindBySize example as written; parent[] and size[] before the finds (line 34). */
export const unionSizeProgram: TreeProgram = {
  id: 'union-find-size',
  lang: 'js',
  source: [BY_SIZE],
  probes: [{ line: 34, as: 'state', read: ['parent', 'size'] }],
  watch: { parent: 'uf.parent.slice()', size: 'uf.size.slice()' },
}

/**
 * The lesson's UnionFind class (lines 1-29) with the register's chain: the
 * harness writes parent[] by hand (4 -> 5 -> 6 -> 7, a shape union by rank
 * never builds) and calls find(4). Probes: the state before find (line 32)
 * and every find call's return (line 11), the last of which is find(4)'s,
 * after path compression.
 */
export const unionChainProgram: TreeProgram = {
  id: 'union-find-chain',
  lang: 'js',
  source: [
    { ...UNION_FIND, lines: [1, 29] },
    { code: 'const uf = new UnionFind(10);\nuf.parent[4] = 5; uf.parent[5] = 6; uf.parent[6] = 7;\nconsole.log(uf.find(4));' },
  ],
  probes: [
    { line: 32, as: 'state', read: ['parent', 'rank'] },
    { line: 11, at: 'return', as: 'find', read: ['x', 'parent'] },
  ],
  watch: { parent: 'uf.parent.slice()', rank: 'uf.rank.slice()', x: 'x' },
}

// ---------------------------------------------------------------------------
// Heaps (dsa-track/user-defined-data-structures/heaps)
// ---------------------------------------------------------------------------

const HEAP = {
  block: { path: 'content/dsa-track/user-defined-data-structures/heaps/page.mdx', heading: '### **Extracting the Minimum/Maximum Element**', lang: 'javascript' },
  lessonSha256: 'd447d6ee0a4abcb83614c65e3dfd6cf45c57a1869c2eb3c9b537b4713daa11cb',
} as const

/**
 * The lesson's MinHeap (the extract example's class, as written) with the
 * register's calls: insert 4, 10, 3, 5, 1, then extractMin. Probes: the heap
 * after the five inserts (line 61), the heap once extractMin
 * has moved the last element to the root (line 31), every sift-down
 * comparison's outcome (line 52) and the heap extractMin returns with
 * (line 32).
 */
export const heapProgram: TreeProgram = {
  id: 'min-heap-extract',
  lang: 'js',
  source: [
    HEAP,
    { code: 'const h = new MinHeap();\nfor (const v of [4, 10, 3, 5, 1]) h.insert(v);\nconsole.log(JSON.stringify(h.heap));\nconsole.log(h.extractMin(), JSON.stringify(h.heap));' },
  ],
  probes: [
    { line: 61, as: 'inserted', read: ['built'] },
    { line: 31, as: 'moved', read: ['heap', 'min'] },
    { line: 52, as: 'compare', read: ['index', 'smallest', 'left', 'right', 'length', 'heap'] },
    { line: 32, as: 'extracted', read: ['heap', 'min'] },
  ],
  watch: {
    heap: 'this.heap.slice()',
    built: 'h.heap.slice()',
    min: 'min',
    index: 'index',
    smallest: 'smallest',
    left: 'leftChildIndex',
    right: 'rightChildIndex',
    length: 'length',
  },
}

// ---------------------------------------------------------------------------
// Recursion and Memoization (dsa-track/common-techniques/recursion-and-memoization)
// ---------------------------------------------------------------------------

const FIB = {
  block: { path: 'content/dsa-track/common-techniques/recursion-and-memoization/page.mdx', heading: '### **Recursive Fibonacci Sequence**', lang: 'javascript' },
  lessonSha256: '02bbe02357bdfde2b58492dc2f8321b9b3a2ef5722e6257b0daa3590090df53a',
} as const

const FIB_MEMO = {
  block: { path: 'content/dsa-track/common-techniques/recursion-and-memoization/page.mdx', heading: '### **Memoized Fibonacci Sequence**', lang: 'javascript' },
  lessonSha256: 'f43c2b7ea11706ffb08b26bfe24b2744fb78352e18db95e3b7fb6e69cf25715d',
} as const

/** The lesson's fib (lines 1-4, without its fib(10) example) called as fib(5); every call's entry (line 2). */
export const fibProgram: TreeProgram = {
  id: 'fib-5',
  lang: 'js',
  source: [{ ...FIB, lines: [1, 4] }, { code: 'console.log(fib(5));' }],
  probes: [{ line: 2, as: 'call', read: ['n'] }],
  watch: { n: 'n' },
}

/**
 * The lesson's fibMemo (lines 1-6, its `n in memo` check) called as
 * fibMemo(5). Probes: every call's entry (line 2) with whether its memo
 * check will hit (`n > 1 && n in memo`, read before either check runs) and
 * the memo's keys; every memo write, just after it (line 5).
 */
export const fibMemoProgram: TreeProgram = {
  id: 'fib-memo-5',
  lang: 'js',
  source: [{ ...FIB_MEMO, lines: [1, 6] }, { code: 'console.log(fibMemo(5));' }],
  probes: [
    { line: 2, as: 'call', read: ['n', 'hit', 'memo'] },
    { line: 5, as: 'write', read: ['n', 'value'] },
  ],
  watch: { n: 'n', hit: 'n > 1 && n in memo', memo: 'Object.keys(memo).map(Number)', value: 'memo[n]' },
}

// ---------------------------------------------------------------------------
// Palindromic Subsequence (dsa-track/common-techniques/palindromic-subsequence)
// ---------------------------------------------------------------------------

const LPS = {
  block: { path: 'content/dsa-track/common-techniques/palindromic-subsequence/page.mdx', heading: '## **Longest Palindromic Subsequence**', lang: 'javascript' },
  lessonSha256: '8a08371fef993d4e698fadcfd7934e0bcadf249a320f25e146aa4f513d34b6fe',
} as const

/**
 * The lesson's longestPalindromicSubsequence example as written, on
 * "bbbab". Probes: every base cell (line 8), every interval cell in the
 * order the loops reach it (line 15) and the table on return (line 25).
 */
export const lpsProgram: TreeProgram = {
  id: 'lps-bbbab',
  lang: 'js',
  source: [LPS],
  probes: [
    { line: 8, as: 'base', read: ['i'] },
    { line: 15, as: 'cell', read: ['i', 'j'] },
    { line: 25, as: 'table', read: ['dp', 's'] },
  ],
  watch: { i: 'i', j: 'j', dp: 'dp.map((r) => r.slice())', s: 's' },
}

/**
 * The practice answer "Longest Palindromic Subsequence" (TypeScript, as
 * written) on "bbbab": only the order its loops reach the interval cells
 * (line 10) and its table on return (line 17). The figure shows those order
 * numbers and nothing of the answer's text (the premium-code policy).
 */
const LPS_ANSWER = {
  block: { path: 'content/dsa-track/common-techniques/_lessons.json', lesson: '/palindromic-subsequence', problem: 'longest-palindromic-subsequence', lang: 'typescript' },
  lessonSha256: '0836e07c14b4baa791554ebfcbd1f0410522640bce0ac536ac33331ff9012550',
} as const

export const lpsAnswerProgram: TreeProgram = {
  id: 'lps-answer-bbbab',
  lang: 'ts',
  source: [LPS_ANSWER, { code: 'console.log(longestPalindromeSubseq("bbbab"));' }],
  probes: [
    { line: 10, as: 'cell', read: ['i', 'j'] },
    { line: 17, as: 'table', read: ['f'] },
  ],
  watch: { i: 'i', j: 'j', f: 'f.map((r) => r.slice())' },
}
