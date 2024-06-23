import { ProblemDifficulty } from '@prisma/client'

export const BUILT_IN_DATA_STRUCTURES_PROBLEMS = {
  strings: [
    {
      href: 'https://leetcode.com/problems/valid-word-abbreviation',
      title: 'Valid Word Abbreviation',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/longest-substring-without-repeating-characters',
      title: 'Longest Substring Without Repeating Characters',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/group-anagrams',
      title: 'Group Anagrams',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/encode-and-decode-strings',
      title: 'Encode and Decode Strings',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/generate-parentheses',
      title: 'Generate Parentheses',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  numbers: [
    {
      href: 'https://leetcode.com/problems/palindrome-number',
      title: 'Palindrome Number',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/integer-to-roman',
      title: 'Integer to Roman',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/factorial-trailing-zeroes',
      title: 'Factorial Trailing Zeroes',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/integer-break',
      title: 'Integer Break',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/super-ugly-number',
      title: 'Super Ugly Number',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  arrays: [
    {
      href: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock',
      title: 'Best Time to Buy and Sell Stock',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/product-of-array-except-self',
      title: 'Product of Array Except Self',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/sort-colors',
      title: 'Sort Colors',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/container-with-most-water',
      title: 'Container With Most Water',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/subarray-sum-equals-k',
      title: 'Subarray Sum Equals K',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  objects: [
    {
      href: 'https://leetcode.com/problems/find-common-characters',
      title: 'Find Common Characters',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/single-number',
      title: 'Single Number',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/letter-combinations-of-a-phone-number',
      title: 'Letter Combinations of a Phone Number',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/group-shifted-strings',
      title: 'Group Shifted Strings',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  sets: [
    {
      href: 'https://leetcode.com/problems/intersection-of-two-arrays',
      title: 'Intersection of Two Arrays',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/unique-email-addresses',
      title: 'Unique Email Addresses',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/valid-sudoku',
      title: 'Valid Sudoku',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  maps: [
    {
      href: 'https://leetcode.com/problems/word-pattern',
      title: 'Word Pattern',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/minimum-index-sum-of-two-lists',
      title: 'Minimum Index Sum of Two Lists',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/subdomain-visit-count',
      title: 'Subdomain Visit Count',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  remainingPrimitives: [
    {
      href: 'https://leetcode.com/problems/detect-capital',
      title: 'Detect Capital',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/length-of-last-word',
      title: 'Length of Last Word',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string',
      title: 'Find the Index of the First Occurrence in a String',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
}

export const USER_DEFINED_DATA_STRUCTURES_PROBLEMS = {
  hashTables: [
    {
      href: 'https://leetcode.com/problems/ransom-note',
      title: 'Ransom Note',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/insert-delete-getrandom-o1',
      title: 'Insert Delete GetRandom O(1)',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/dot-product-of-two-sparse-vectors',
      title: 'Dot Product of Two Sparse Vectors',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/time-based-key-value-store',
      title: 'Time Based Key-Value Store',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  trees: [
    {
      href: 'https://leetcode.com/problems/maximum-depth-of-binary-tree',
      title: 'Maximum Depth of Binary Tree',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree',
      title: 'Lowest Common Ancestor of a Binary Tree',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/binary-tree-right-side-view',
      title: 'Binary Tree Right Side View',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/binary-search-tree-iterator',
      title: 'Binary Search Tree Iterator',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/sum-root-to-leaf-numbers',
      title: 'Sum Root to Leaf Numbers',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  graphs: [
    {
      href: 'https://leetcode.com/problems/clone-graph',
      title: 'Clone Graph',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/rotting-oranges',
      title: 'Rotting Oranges',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/cheapest-flights-within-k-stops',
      title: 'Cheapest Flights Within K Stops',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/evaluate-division',
      title: 'Evaluate Division',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  heaps: [
    {
      href: 'https://leetcode.com/problems/kth-largest-element-in-an-array',
      title: 'Kth Largest Element in an Array',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/search-suggestions-system',
      title: 'Search Suggestions System',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/k-closest-points-to-origin',
      title: 'K Closest Points to Origin',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/sort-characters-by-frequency',
      title: 'Sort Characters By Frequency',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  linkedLists: [
    {
      href: 'https://leetcode.com/problems/palindrome-linked-list',
      title: 'Palindrome Linked List',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/lru-cache',
      title: 'LRU Cache',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/add-two-numbers',
      title: 'Add Two Numbers',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/copy-list-with-random-pointer',
      title: 'Copy List with Random Pointer',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  queues: [
    {
      href: 'https://leetcode.com/problems/number-of-recent-calls',
      title: 'Number of Recent Calls',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/design-hit-counter',
      title: 'Design Hit Counter',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/design-circular-queue',
      title: 'Design Circular Queue',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/perfect-squares',
      title: 'Perfect Squares',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  stacks: [
    {
      href: 'https://leetcode.com/problems/valid-parentheses',
      title: 'Valid Parentheses',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/minimum-remove-to-make-valid-parentheses',
      title: 'Minimum Remove to Make Valid Parentheses',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/buildings-with-an-ocean-view',
      title: 'Buildings With an Ocean View',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/trapping-rain-water',
      title: 'Trapping Rain Water',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  tries: [
    {
      href: 'https://leetcode.com/problems/implement-trie-prefix-tree',
      title: 'Implement Trie (Prefix Tree)',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/word-break',
      title: 'Word Break',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/design-add-and-search-words-data-structure',
      title: 'Design Add and Search Words Data Structure',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/design-in-memory-file-system',
      title: 'Design In-Memory File System',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
}

export const COMMON_TECHNIQUES_PROBLEMS = {
  slidingWindow: [
    {
      href: 'https://leetcode.com/problems/permutation-in-string',
      title: 'Permutation in String',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/minimum-size-subarray-sum',
      title: 'Minimum Size Subarray Sum',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/longest-subarray-of-1s-after-deleting-one-element',
      title: "Longest Subarray of 1's After Deleting One Element",
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/fruit-into-baskets',
      title: 'Fruit Into Baskets',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  twoPointers: [
    {
      href: 'https://leetcode.com/problems/squares-of-a-sorted-array',
      title: 'Squares of a Sorted Array',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/3sum',
      title: '3Sum',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/valid-palindrome-ii',
      title: 'Valid Palindrome II',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  fastAndSlowPointers: [
    {
      href: 'https://leetcode.com/problems/happy-number',
      title: 'Happy Number',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/linked-list-cycle-ii',
      title: 'Linked List Cycle II',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/find-the-duplicate-number',
      title: 'Find the Duplicate Number',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  mergeIntervals: [
    {
      href: 'https://leetcode.com/problems/non-overlapping-intervals',
      title: 'Non-overlapping Intervals',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/interval-list-intersections',
      title: 'Interval List Intersections',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/employee-free-time',
      title: 'Employee Free Time',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  cyclicSort: [
    {
      href: 'https://leetcode.com/problems/find-all-numbers-disappeared-in-an-array',
      title: 'Find All Numbers Disappeared in an Array',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/find-all-duplicates-in-an-array',
      title: 'Find All Duplicates in an Array',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/first-missing-positive',
      title: 'First Missing Positive',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  linkedListReversal: [
    {
      href: 'https://leetcode.com/problems/reverse-linked-list-ii',
      title: 'Reverse Linked List II',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/swap-nodes-in-pairs',
      title: 'Swap Nodes in Pairs',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/reverse-nodes-in-k-group',
      title: 'Reverse Nodes in k-Group',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  treeBFS: [
    {
      href: 'https://leetcode.com/problems/average-of-levels-in-binary-tree',
      title: 'Average of Levels in Binary Tree',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/binary-tree-level-order-traversal-ii',
      title: 'Binary Tree Level Order Traversal II',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/binary-tree-zigzag-level-order-traversal',
      title: 'Binary Tree Zigzag Level Order Traversal',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  treeDFS: [
    {
      href: 'https://leetcode.com/problems/path-sum',
      title: 'Path Sum',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/validate-binary-search-tree',
      title: 'Validate Binary Search Tree',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/binary-tree-maximum-path-sum',
      title: 'Maximum Path Sum',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  twoHeaps: [
    {
      href: 'https://leetcode.com/problems/find-right-interval',
      title: 'Find Right Interval',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/find-median-from-data-stream',
      title: 'Find Median from Data Stream',
      difficulty: ProblemDifficulty.HARD,
    },
    {
      href: 'https://leetcode.com/problems/sliding-window-median',
      title: 'Sliding Window Median',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  subsets: [
    {
      href: 'https://leetcode.com/problems/subsets-ii',
      title: 'Subsets II',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/letter-case-permutation',
      title: 'Letter Case Permutation',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/combination-sum-ii',
      title: 'Combination Sum II',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  binarySearch: [
    {
      href: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array',
      title: 'Find Minimum in Rotated Sorted Array',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/find-peak-element',
      title: 'Find Peak Element',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/split-array-largest-sum',
      title: 'Split Array Largest Sum',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  topKElements: [
    {
      href: 'https://leetcode.com/problems/kth-largest-element-in-a-stream',
      title: 'Kth Largest Element in a Stream',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/top-k-frequent-elements',
      title: 'Top K Frequent Elements',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix',
      title: 'Kth Smallest Element in a Sorted Matrix',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  kWayMerge: [
    {
      href: 'https://leetcode.com/problems/find-k-pairs-with-smallest-sums',
      title: 'Find K Pairs with Smallest Sums',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/merge-k-sorted-lists',
      title: 'Merge k Sorted Lists',
      difficulty: ProblemDifficulty.HARD,
    },
    {
      href: 'https://leetcode.com/problems/smallest-range-covering-elements-from-k-lists',
      title: 'Smallest Range Covering Elements from K Lists',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  graphBFS: [
    {
      href: 'https://leetcode.com/problems/shortest-path-in-binary-matrix',
      title: 'Shortest Path in Binary Matrix',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/minimum-knight-moves',
      title: 'Minimum Knight Moves',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/open-the-lock',
      title: 'Open the Lock',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  graphDFS: [
    {
      href: 'https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph',
      title: 'Number of Connected Components in an Undirected Graph',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/course-schedule',
      title: 'Course Schedule',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/graph-valid-tree',
      title: 'Graph Valid Tree',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  topologicalSort: [
    {
      href: 'https://leetcode.com/problems/course-schedule-ii',
      title: 'Course Schedule II',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/minimum-height-trees',
      title: 'Minimum Height Trees',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/alien-dictionary',
      title: 'Alien Dictionary',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  matrixTraversal: [
    {
      href: 'https://leetcode.com/problems/spiral-matrix',
      title: 'Spiral Matrix',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/set-matrix-zeroes',
      title: 'Set Matrix Zeroes',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/diagonal-traverse',
      title: 'Diagonal Traverse',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  palindromicSubsequence: [
    {
      href: 'https://leetcode.com/problems/longest-palindromic-subsequence',
      title: 'Longest Palindromic Subsequence',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/palindromic-substrings',
      title: 'Palindromic Substrings',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/count-different-palindromic-subsequences',
      title: 'Count Different Palindromic Subsequences',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  longestCommonSubstring: [
    {
      href: 'https://leetcode.com/problems/longest-common-prefix',
      title: 'Longest Common Prefix',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/longest-common-subsequence',
      title: 'Longest Common Subsequence',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/edit-distance',
      title: 'Edit Distance',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  recursionAndMemoization: [
    {
      href: 'https://leetcode.com/problems/climbing-stairs',
      title: 'Climbing Stairs',
      difficulty: ProblemDifficulty.EASY,
    },
    {
      href: 'https://leetcode.com/problems/house-robber',
      title: 'House Robber',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/target-sum',
      title: 'Target Sum',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  backtracking: [
    {
      href: 'https://leetcode.com/problems/combination-sum',
      title: 'Combination Sum',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/n-queens',
      title: 'N-Queens',
      difficulty: ProblemDifficulty.HARD,
    },
    {
      href: 'https://leetcode.com/problems/sudoku-solver',
      title: 'Sudoku Solver',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  greedyAlgorithms: [
    {
      href: 'https://leetcode.com/problems/jump-game',
      title: 'Jump Game',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/gas-station',
      title: 'Gas Station',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/candy',
      title: 'Candy',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
}

export const ADVANCED_TOPICS_PROBLEMS = {
  dynamicProgramming: [
    {
      href: 'https://leetcode.com/problems/minimum-path-sum',
      title: 'Minimum Path Sum',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/partition-equal-subset-sum',
      title: 'Partition Equal Subset Sum',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/burst-balloons',
      title: 'Burst Balloons',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  bloomFilters: [
    {
      href: 'https://leetcode.com/problems/single-number-ii',
      title: 'Single Number II',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  segmentTrees: [
    {
      href: 'https://leetcode.com/problems/range-sum-query-mutable',
      title: 'Range Sum Query - Mutable',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/the-skyline-problem',
      title: 'The Skyline Problem',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  unionFind: [
    {
      href: 'https://leetcode.com/problems/number-of-islands',
      title: 'Number of Islands',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/redundant-connection',
      title: 'Redundant Connection',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  minimumSpanningTrees: [
    {
      href: 'https://leetcode.com/problems/connecting-cities-with-minimum-cost',
      title: 'Connecting Cities With Minimum Cost',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/optimize-water-distribution-in-a-village',
      title: 'Optimize Water Distribution in a Village',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  shortestPathAlgorithms: [
    {
      href: 'https://leetcode.com/problems/path-with-minimum-effort',
      title: 'Path With Minimum Effort',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/network-delay-time',
      title: 'Network Delay Time',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  maximumFlow: [
    {
      href: 'https://leetcode.com/problems/maximum-bipartite-matching',
      title: 'Maximum Bipartite Matching',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  bitManipulation: [
    {
      href: 'https://leetcode.com/problems/sum-of-two-integers',
      title: 'Sum of Two Integers',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array',
      title: 'Maximum XOR of Two Numbers in an Array',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  randomizedAlgorithms: [
    {
      href: 'https://leetcode.com/problems/random-pick-with-weight',
      title: 'Random Pick with Weight',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/random-point-in-non-overlapping-rectangles',
      title: 'Random Point in Non-overlapping Rectangles',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
  suffixArraysAndSuffixTrees: [
    {
      href: 'https://leetcode.com/problems/longest-repeating-substring',
      title: 'Longest Repeating Substring',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/stream-of-characters',
      title: 'Stream of Characters',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  approximationAlgorithms: [
    {
      href: 'https://leetcode.com/problems/k-center-problem',
      title: 'K-Center Problem',
      difficulty: ProblemDifficulty.HARD,
    },
    {
      href: 'https://leetcode.com/problems/best-position-for-a-service-centre',
      title: 'Best Position for a Service Centre',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  sqrtDecomposition: [
    {
      href: 'https://leetcode.com/problems/range-addition',
      title: 'Range Addition',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/count-of-smaller-numbers-after-self',
      title: 'Count of Smaller Numbers After Self',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  networkFlowAlgorithms: [
    {
      href: 'https://leetcode.com/problems/maximum-students-taking-exam',
      title: 'Maximum Students Taking Exam',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  convexHull: [
    {
      href: 'https://leetcode.com/problems/erect-the-fence',
      title: 'Erect the Fence',
      difficulty: ProblemDifficulty.HARD,
    },
  ],
  combinatorialOptimization: [
    {
      href: 'https://leetcode.com/problems/minimum-cost-to-connect-sticks',
      title: 'Minimum Cost to Connect Sticks',
      difficulty: ProblemDifficulty.MEDIUM,
    },
    {
      href: 'https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons',
      title: 'Minimum Number of Arrows to Burst Balloons',
      difficulty: ProblemDifficulty.MEDIUM,
    },
  ],
}

export const ALL_PROBLEMS = [
  ...Object.values(BUILT_IN_DATA_STRUCTURES_PROBLEMS).flatMap((lesson) =>
    lesson.map((item) => item.href),
  ),
  ...Object.values(USER_DEFINED_DATA_STRUCTURES_PROBLEMS).flatMap((lesson) =>
    lesson.map((item) => item.href),
  ),
  ...Object.values(COMMON_TECHNIQUES_PROBLEMS).flatMap((lesson) =>
    lesson.map((item) => item.href),
  ),
  ...Object.values(ADVANCED_TOPICS_PROBLEMS).flatMap((lesson) =>
    lesson.map((item) => item.href),
  ),
]
