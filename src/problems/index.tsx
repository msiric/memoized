import { ProblemDifficulty, ProblemType } from '@prisma/client'

export const BUILT_IN_DATA_STRUCTURES_PROBLEMS = {
  strings: [
    {
      href: 'https://leetcode.com/problems/valid-word-abbreviation',
      title: 'Valid Word Abbreviation',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Given an input string and a valid word, determine if the input string is a correct abbreviation for the word by mapping characters to their corresponding full-word equivalents.',
      answer:
        "```typescript\nfunction validWordAbbreviation(word: string, abbr: string): boolean {\n    const [m, n] = [word.length, abbr.length];\n    let [i, j, x] = [0, 0, 0];\n    for (; i < m && j < n; ++j) {\n        if (abbr[j] >= '0' && abbr[j] <= '9') {\n            if (abbr[j] === '0' && x === 0) {\n                return false;\n            }\n            x = x * 10 + Number(abbr[j]);\n        } else {\n            i += x;\n            x = 0;\n            if (i >= m || word[i++] !== abbr[j]) {\n                return false;\n            }\n        }\n    }\n    return i + x === m && j === n;\n}\n```",
    },
    {
      href: 'https://leetcode.com/problems/longest-substring-without-repeating-characters',
      title: 'Longest Substring Without Repeating Characters',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Write an algorithm to find the longest substring within a given string that contains no repeating characters.',
      answer:
        '```typescript\nfunction lengthOfLongestSubstring(s: string): number {\n    let ans = 0;\n    const ss: Set<string> = new Set();\n    for (let i = 0, j = 0; j < s.length; ++j) {\n        while (ss.has(s[j])) {\n            ss.delete(s[i++]);\n        }\n        ss.add(s[j]);\n        ans = Math.max(ans, j - i + 1);\n    }\n    return ans;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/group-anagrams',
      title: 'Group Anagrams',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given an array of strings, group the anagrams together by rearranging the characters in each string to form a unique identifier for grouping purposes.',
      answer:
        "```typescript\nfunction groupAnagrams(strs: string[]): string[][] {\n    const map = new Map<string, string[]>();\n    for (const str of strs) {\n        const k = str.split('').sort().join('');\n        map.set(k, (map.get(k) ?? []).concat([str]));\n    }\n    return [...map.values()];\n}\n```",
    },
    {
      href: 'https://leetcode.com/problems/encode-and-decode-strings',
      title: 'Encode and Decode Strings',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Write a program that can both encode and decode a string format using a specific encoding scheme, where the encoded string contains "a" to indicate start of a sequence, followed by the actual string and "e" to end the sequence, while decoding requires reversing this process.',
      answer:
        "```typescript\nfunction encode(strs: string[]): string {\n    return strs.map((str) => `${str.length}#${str}`).join('');\n}\n\nfunction decode(str: string): string[] {\n    const decodedWords: string[] = [];\n    let i = 0;\n\n    while (i < str.length) {\n        let j: number = i;\n        while (str[j] !== '#') {\n            j++;\n        }\n        const len: number = parseInt(str.slice(i, j), 10);\n        decodedWords.push(str.slice(j + 1, j + 1 + len));\n        i = j + 1 + len;\n    }\n    return decodedWords;\n}\n```",
    },
    {
      href: 'https://leetcode.com/problems/generate-parentheses',
      title: 'Generate Parentheses',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'The goal is to write a program that generates all possible combinations of well-formed parentheses, given a specified number of pairs.',
      answer:
        "```typescript\nfunction generateParenthesis(n: number): string[] {\n    if (n === 1) return ['()'];\n\n    return [\n        ...new Set(\n            generateParenthesis(n - 1).flatMap(s =>\n                Array.from(s, (_, i) => s.slice(0, i) + '()' + s.slice(i)),\n            ),\n        ),\n    ];\n}\n```",
    },
  ],
  numbers: [
    {
      href: 'https://leetcode.com/problems/palindrome-number',
      title: 'Palindrome Number',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Determine whether an integer is equal to its reverse, also known as a palindrome number.',
      answer:
        '```typescript\nfunction isPalindrome(x: number): boolean {\n    if (x < 0 || (x > 0 && x % 10 === 0)) {\n        return false;\n    }\n    let y = 0;\n    for (; y < x; x = ~~(x / 10)) {\n        y = y * 10 + (x % 10);\n    }\n    return x === y || x === ~~(y / 10);\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/integer-to-roman',
      title: 'Integer to Roman',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Convert an integer into its corresponding Roman numeral representation using a mapping of numbers to their respective Roman symbols and handling cases where the number is less than 1 or greater than 3999.',
      answer:
        "```typescript\nfunction intToRoman(num: number): string {\n    const cs: string[] = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];\n    const vs: number[] = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];\n    const ans: string[] = [];\n    for (let i = 0; i < vs.length; ++i) {\n        while (num >= vs[i]) {\n            num -= vs[i];\n            ans.push(cs[i]);\n        }\n    }\n    return ans.join('');\n}\n```",
    },
    {
      href: 'https://leetcode.com/problems/factorial-trailing-zeroes',
      title: 'Factorial Trailing Zeroes',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Find the number of trailing zeroes in the factorial of a given integer, which is determined by the count of factors of 5 in the numbers from 1 to that integer.',
      answer:
        '```typescript\nfunction trailingZeroes(n: number): number {\n    let ans = 0;\n    while (n > 0) {\n        n = Math.floor(n / 5);\n        ans += n;\n    }\n    return ans;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/integer-break',
      title: 'Integer Break',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given an integer, find the maximum number of ways to break down the integer into a product of two positive integers.',
      answer:
        '```typescript\nfunction integerBreak(n: number): number {\n    if (n < 4) {\n        return n - 1;\n    }\n    const m = Math.floor(n / 3);\n    if (n % 3 == 0) {\n        return 3 ** m;\n    }\n    if (n % 3 == 1) {\n        return 3 ** (m - 1) * 4;\n    }\n    return 3 ** m * 2;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/super-ugly-number',
      title: 'Super Ugly Number',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given a set of ugly numbers, find the smallest number that is not divisible by any of the given numbers.',
      answer:
        '```typescript\nfunction nthSuperUglyNumber(n: number, primes: number[]): number {\n    const uglyNumbers: number[] = [1];\n\n    const indices = new Array(primes.length).fill(0);\n\n    const nextMultiples = [...primes];\n\n    for (let count = 1; count < n; count++) {\n        const nextUglyNumber = Math.min(...nextMultiples);\n\n        uglyNumbers.push(nextUglyNumber);\n\n        for (let j = 0; j < primes.length; j++) {\n            if (nextMultiples[j] === nextUglyNumber) {\n                indices[j]++;\n                nextMultiples[j] = uglyNumbers[indices[j]] * primes[j];\n            }\n        }\n    }\n\n    return uglyNumbers[n - 1];\n}\n```',
    },
  ],
  arrays: [
    {
      href: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock',
      title: 'Best Time to Buy and Sell Stock',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Given the prices of a single stock over time, find the optimal day to buy and sell the stock to maximize profit while avoiding losses.',
      answer:
        '```typescript\nfunction maxProfit(prices: number[]): number {\n    let ans = 0;\n    let mi = prices[0];\n    for (const v of prices) {\n        ans = Math.max(ans, v - mi);\n        mi = Math.min(mi, v);\n    }\n    return ans;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/product-of-array-except-self',
      title: 'Product of Array Except Self',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Write an algorithm to calculate the product of all numbers in an array, excluding the number at each index, for a given input array of integers.',
      answer:
        '```typescript\nfunction productExceptSelf(nums: number[]): number[] {\n    return nums.map((_, i) => nums.reduce((pre, val, j) => pre * (i === j ? 1 : val), 1));\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/sort-colors',
      title: 'Sort Colors',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'The task is to efficiently sort an array of colored integers, where each integer represents the color with values ranging from 0 (black) to 2 (white), in ascending order of their corresponding colors.',
      answer:
        '```typescript\n/**\n Do not return anything, modify nums in-place instead.\n */\nfunction sortColors(nums: number[]): void {\n    let i = -1;\n    let j = nums.length;\n    let k = 0;\n    while (k < j) {\n        if (nums[k] === 0) {\n            ++i;\n            [nums[i], nums[k]] = [nums[k], nums[i]];\n            ++k;\n        } else if (nums[k] === 2) {\n            --j;\n            [nums[j], nums[k]] = [nums[k], nums[j]];\n        } else {\n            ++k;\n        }\n    }\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/container-with-most-water',
      title: 'Container With Most Water',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given two pointers representing the start and end of a container, find the maximum area that can be trapped between the two "walls" represented by the pointer positions.',
      answer:
        '```typescript\nfunction maxArea(height: number[]): number {\n    let i = 0;\n    let j = height.length - 1;\n    let ans = 0;\n    while (i < j) {\n        const t = Math.min(height[i], height[j]) * (j - i);\n        ans = Math.max(ans, t);\n        if (height[i] < height[j]) {\n            ++i;\n        } else {\n            --j;\n        }\n    }\n    return ans;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/subarray-sum-equals-k',
      title: 'Subarray Sum Equals K',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given an array and an integer target sum, find all unique subarrays within the array that sum up to the target value.',
      answer:
        '```typescript\nfunction subarraySum(nums: number[], k: number): number {\n    const cnt: Map<number, number> = new Map();\n    cnt.set(0, 1);\n    let [ans, s] = [0, 0];\n    for (const x of nums) {\n        s += x;\n        ans += cnt.get(s - k) || 0;\n        cnt.set(s, (cnt.get(s) || 0) + 1);\n    }\n    return ans;\n}\n```',
    },
  ],
  objects: [
    {
      href: 'https://leetcode.com/problems/find-common-characters',
      title: 'Find Common Characters',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Write a program that takes two strings as input and returns all characters that appear in both strings, regardless of frequency or order.',
      answer:
        "```typescript\nfunction commonChars(words: string[]): string[] {\n    const cnt = Array(26).fill(20000);\n    const aCode = 'a'.charCodeAt(0);\n    for (const w of words) {\n        const t = Array(26).fill(0);\n        for (const c of w) {\n            t[c.charCodeAt(0) - aCode]++;\n        }\n        for (let i = 0; i < 26; i++) {\n            cnt[i] = Math.min(cnt[i], t[i]);\n        }\n    }\n    const ans: string[] = [];\n    for (let i = 0; i < 26; i++) {\n        cnt[i] && ans.push(...String.fromCharCode(i + aCode).repeat(cnt[i]));\n    }\n    return ans;\n}\n```",
    },
    {
      href: 'https://leetcode.com/problems/single-number',
      title: 'Single Number',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Given an array of integers, find the single number that appears only once and is not present in any other position in the array.',
      answer:
        '```typescript\nfunction singleNumber(nums: number[]): number {\n    return nums.reduce((r, v) => r ^ v);\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/letter-combinations-of-a-phone-number',
      title: 'Letter Combinations of a Phone Number',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Generate all possible letter combinations that can be formed using the digits of a given phone number, such as "2" mapping to "abc", "3" to "def", etc.',
      answer:
        "```typescript\nfunction letterCombinations(digits: string): string[] {\n    if (digits.length === 0) {\n        return [];\n    }\n    const ans: string[] = [];\n    const t: string[] = [];\n    const d = ['abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz'];\n    const dfs = (i: number) => {\n        if (i >= digits.length) {\n            ans.push(t.join(''));\n            return;\n        }\n        const s = d[+digits[i] - 2];\n        for (const c of s) {\n            t.push(c);\n            dfs(i + 1);\n            t.pop();\n        }\n    };\n    dfs(0);\n    return ans;\n}\n```",
    },
    {
      href: 'https://leetcode.com/problems/group-shifted-strings',
      title: 'Group Shifted Strings',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        "Given an array of strings, shift each string's characters to the right by a specified number of positions and return the resulting array of shifted strings.",
      answer:
        "```typescript\nconst strings: string[] = [];\n\nfunction calculateOffset(char: string): number {\n    return char.charCodeAt(0) - 'a'.charCodeAt(0);\n}\n\nfunction normalizeString(str: string): string {\n    const offset = calculateOffset(str[0]);\n    return str.split('').map(char => {\n        let normalizedCharCode = char.charCodeAt(0) - offset;\n        if (normalizedCharCode < 'a'.charCodeAt(0)) {\n            normalizedCharCode += 26;\n        }\n        return String.fromCharCode(normalizedCharCode);\n    }).join('');\n}\n\nfunction groupStrings(strings: string[]): string[][] {\n    const groupedStringsMap: { [key: string]: string[] } = {};\n\n    strings.forEach(str => {\n        const normalizedStr = normalizeString(str);\n\n        console.log(normalizedStr);\n\n        groupedStringsMap[normalizedStr] = groupedStringsMap[normalizedStr] || [];\n        \n        groupedStringsMap[normalizedStr].push(str);\n    });\n\n    const result = Object.values(groupedStringsMap);\n\n    return result;\n}\n```",
    },
  ],
  sets: [
    {
      href: 'https://leetcode.com/problems/intersection-of-two-arrays',
      title: 'Intersection of Two Arrays',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Given two arrays, find the elements that are common to both arrays and return them in a single array.',
      answer:
        '```typescript\nfunction intersection(nums1: number[], nums2: number[]): number[] {\n    const s = new Set(nums1);\n    return [...new Set(nums2.filter(x => s.has(x)))];\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/unique-email-addresses',
      title: 'Unique Email Addresses',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'The goal is to write an algorithm that filters out duplicate and malformed email addresses from a list, returning the unique ones in the correct format.',
      answer:
        "```typescript\nfunction numUniqueEmails(emails: string[]): number {\n    return new Set(\n        emails\n            .map(email => email.split('@'))\n            .map(([start, end]) => start.replace(/\\+.*|\\./g, '') + '@' + end),\n    ).size;\n}\n```",
    },
    {
      href: 'https://leetcode.com/problems/valid-sudoku',
      title: 'Valid Sudoku',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Determine whether a given Sudoku puzzle is valid, following the standard rules where each row, column, and 3x3 sub-grid must contain the numbers 1-9 without repetition.',
      answer:
        "```typescript\nfunction isValidSudoku(board: string[][]): boolean {\n    const row: boolean[][] = Array.from({ length: 9 }, () =>\n        Array.from({ length: 9 }, () => false),\n    );\n    const col: boolean[][] = Array.from({ length: 9 }, () =>\n        Array.from({ length: 9 }, () => false),\n    );\n    const sub: boolean[][] = Array.from({ length: 9 }, () =>\n        Array.from({ length: 9 }, () => false),\n    );\n    for (let i = 0; i < 9; ++i) {\n        for (let j = 0; j < 9; ++j) {\n            const num = board[i][j].charCodeAt(0) - '1'.charCodeAt(0);\n            if (num < 0 || num > 8) {\n                continue;\n            }\n            const k = Math.floor(i / 3) * 3 + Math.floor(j / 3);\n            if (row[i][num] || col[j][num] || sub[k][num]) {\n                return false;\n            }\n            row[i][num] = true;\n            col[j][num] = true;\n            sub[k][num] = true;\n        }\n    }\n    return true;\n}\n```",
    },
  ],
  maps: [
    {
      href: 'https://leetcode.com/problems/word-pattern',
      title: 'Word Pattern',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Given two patterns and their corresponding strings, determine if the strings follow the same pattern by comparing each string with all possible patterns.',
      answer:
        '```typescript\nfunction wordPattern(pattern: string, s: string): boolean {\n    const hash: Record<string, string> = Object.create(null);\n    const arr = s.split(/\\s+/);\n\n    if (pattern.length !== arr.length || new Set(pattern).size !== new Set(arr).size) {\n        return false;\n    }\n\n    for (let i = 0; i < pattern.length; i++) {\n        hash[pattern[i]] ??= arr[i];\n        if (hash[pattern[i]] !== arr[i]) {\n            return false;\n        }\n    }\n\n    return true;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/minimum-index-sum-of-two-lists',
      title: 'Minimum Index Sum of Two Lists',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Given two lists of integers, find the pair of numbers with the smallest sum of their indices in the lists when sorted separately.',
      answer:
        '```typescript\nfunction findRestaurant(list1: string[], list2: string[]): string[] {\n    let minI = Infinity;\n    const res = [];\n    const map = new Map<string, number>(list1.map((s, i) => [s, i]));\n    list2.forEach((s, i) => {\n        if (map.has(s)) {\n            const sumI = i + map.get(s);\n            if (sumI <= minI) {\n                if (sumI < minI) {\n                    minI = sumI;\n                    res.length = 0;\n                }\n                res.push(s);\n            }\n        }\n    });\n    return res;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/subdomain-visit-count',
      title: 'Subdomain Visit Count',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Count the number of visits for each subdomain given an array of domain names and their corresponding visit counts.',
      answer:
        "```typescript\nfunction subdomainVisits(cpdomains: string[]): string[] {\n    const domainVisitCounts: Record<string, number> = {};\n\n    cpdomains.forEach(cpdomain => {\n        const spaceIndex = cpdomain.indexOf(' ');\n\n        const visitCount = parseInt(cpdomain.substring(0, spaceIndex), 10);\n\n        let domain = cpdomain.substring(spaceIndex + 1);\n\n        while (domain) {\n            domainVisitCounts[domain] = (domainVisitCounts[domain] || 0) + visitCount;\n\n            const dotIndex = domain.indexOf('.');\n\n            if (dotIndex < 0) break;\n\n            domain = domain.substring(dotIndex + 1);\n        }\n    });\n\n    const results: string[] = [];\n\n    for (const domain in domainVisitCounts) {\n        const count = domainVisitCounts[domain];\n        results.push(`${count} ${domain}`);\n    }\n\n    return results;\n}\n```",
    },
  ],
  remainingPrimitives: [
    {
      href: 'https://leetcode.com/problems/detect-capital',
      title: 'Detect Capital',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Write a function to determine if all characters in a given string are capital or not, and return true if they are entirely uppercase or false otherwise.',
      answer:
        "```typescript\nfunction detectCapitalUse(word: string): boolean {\n    const cnt = word.split('').reduce((acc, c) => acc + (c === c.toUpperCase() ? 1 : 0), 0);\n    return cnt === 0 || cnt === word.length || (cnt === 1 && word[0] === word[0].toUpperCase());\n}\n```",
    },
    {
      href: 'https://leetcode.com/problems/length-of-last-word',
      title: 'Length of Last Word',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Find the length of the last word in a given string, ignoring any trailing whitespace and handling cases where the string ends with whitespace or has only whitespace characters.',
      answer:
        "```typescript\nfunction lengthOfLastWord(s: string): number {\n    let i = s.length - 1;\n    while (i >= 0 && s[i] === ' ') {\n        --i;\n    }\n    let j = i;\n    while (j >= 0 && s[j] !== ' ') {\n        --j;\n    }\n    return i - j;\n}\n```",
    },
    {
      href: 'https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string',
      title: 'Find the Index of the First Occurrence in a String',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given a target string and an input string, find the starting index of the first occurrence of the target string within the input string.',
      answer:
        '```typescript\nfunction strStr(haystack: string, needle: string): number {\n    const m = haystack.length;\n    const n = needle.length;\n    const next = new Array(n).fill(0);\n    let j = 0;\n    for (let i = 1; i < n; i++) {\n        while (j > 0 && needle[i] !== needle[j]) {\n            j = next[j - 1];\n        }\n        if (needle[i] === needle[j]) {\n            j++;\n        }\n        next[i] = j;\n    }\n    j = 0;\n    for (let i = 0; i < m; i++) {\n        while (j > 0 && haystack[i] !== needle[j]) {\n            j = next[j - 1];\n        }\n        if (haystack[i] === needle[j]) {\n            j++;\n        }\n        if (j === n) {\n            return i - n + 1;\n        }\n    }\n    return -1;\n}\n```',
    },
  ],
}

export const USER_DEFINED_DATA_STRUCTURES_PROBLEMS = {
  hashTables: [
    {
      href: 'https://leetcode.com/problems/ransom-note',
      title: 'Ransom Note',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Determine if a ransom note can be formed using a given set of codes and their corresponding letters, where each code corresponds to exactly one letter.',
      answer:
        '```typescript\nfunction canConstruct(ransomNote: string, magazine: string): boolean {\n    const cnt: number[] = Array(26).fill(0);\n    for (const c of magazine) {\n        ++cnt[c.charCodeAt(0) - 97];\n    }\n    for (const c of ransomNote) {\n        if (--cnt[c.charCodeAt(0) - 97] < 0) {\n            return false;\n        }\n    }\n    return true;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/insert-delete-getrandom-o1',
      title: 'Insert Delete GetRandom O(1)',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Design an O(1) data structure to efficiently insert, delete, and retrieve random elements from a set of unique integers, maintaining constant-time performance for all operations.',
      answer:
        '```typescript\nconst valueToIndexMap: Map<number, number> = new Map();\n\nconst valuesArray: number[] = [];\n\nfunction insert(value: number): boolean {\n    if (valueToIndexMap.has(value)) {\n        return false;\n    }\n    \n    valueToIndexMap.set(value, valuesArray.length);\n    valuesArray.push(value);\n    return true;\n}\n\nfunction remove(value: number): boolean {\n    if (!valueToIndexMap.has(value)) {\n        return false;\n    }\n    \n    const index = valueToIndexMap.get(value)!;\n    \n    valueToIndexMap.set(valuesArray[valuesArray.length - 1], index);\n    \n    valuesArray[index] = valuesArray[valuesArray.length - 1];\n    \n    valuesArray.pop();\n    \n    valueToIndexMap.delete(value);\n    return true;\n}\n\nfunction getRandom(): number {\n    return valuesArray[Math.floor(Math.random() * valuesArray.length)];\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/dot-product-of-two-sparse-vectors',
      title: 'Dot Product of Two Sparse Vectors',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Calculate the dot product of two sparse vectors, which are vectors where most elements are zero, by efficiently identifying and multiplying non-zero elements.',
      answer:
        '```typescript\nclass SparseVector {\n    d: Map<number, number>;\n\n    constructor(nums: number[]) {\n        this.d = new Map();\n        for (let i = 0; i < nums.length; ++i) {\n            if (nums[i] != 0) {\n                this.d.set(i, nums[i]);\n            }\n        }\n    }\n\n    dotProduct(vec: SparseVector): number {\n        let a = this.d;\n        let b = vec.d;\n        if (a.size > b.size) {\n            [a, b] = [b, a];\n        }\n        let ans = 0;\n        for (const [i, x] of a) {\n            if (b.has(i)) {\n                ans += x * b.get(i)!;\n            }\n        }\n        return ans;\n    }\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/time-based-key-value-store',
      title: 'Time Based Key-Value Store',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        "Implement a time-based key-value store that allows storing, retrieving, and deleting key-value pairs with a timestamp for the value's expiration date.",
      answer:
        "```typescript\ntype KeyValuePair = { timestamp: number; value: string };\nconst keyTimeValueMap: Record<string, KeyValuePair[]> = {};\n\nfunction set(key: string, value: string, timestamp: number): void {\n    if (!keyTimeValueMap[key]) {\n        keyTimeValueMap[key] = [];\n    }\n    \n    keyTimeValueMap[key].push({ timestamp, value });\n}\n\nfunction get(key: string, timestamp: number): string {\n    const pairs = keyTimeValueMap[key];\n    if (!pairs) {\n        return '';\n    }\n    \n    let low = 0, high = pairs.length;\n    while (low < high) {\n        const mid = Math.floor((low + high) / 2);\n        if (pairs[mid].timestamp <= timestamp) {\n            low = mid + 1;\n        } else {\n            high = mid;\n        }\n    }\n    \n    if (low === 0) {\n        return '';\n    }\n    \n    return pairs[low - 1].value;\n}\n```",
    },
  ],
  trees: [
    {
      href: 'https://leetcode.com/problems/maximum-depth-of-binary-tree',
      title: 'Maximum Depth of Binary Tree',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Given the roots of a binary tree, find the maximum depth of the tree by traversing its nodes in a way that explores as far as possible along each branch before backtracking.',
      answer:
        '```typescript\n/**\n * Definition for a binary tree node.\n * class TreeNode {\n *     val: number\n *     left: TreeNode | null\n *     right: TreeNode | null\n *     constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n *         this.val = (val===undefined ? 0 : val)\n *         this.left = (left===undefined ? null : left)\n *         this.right = (right===undefined ? null : right)\n *     }\n * }\n */\n\nfunction maxDepth(root: TreeNode | null): number {\n    if (root === null) {\n        return 0;\n    }\n    return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree',
      title: 'Lowest Common Ancestor of a Binary Tree',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Find the node in a binary tree that is common to all paths from its root to any leaf node, representing the lowest common ancestor.',
      answer:
        '```typescript\n/**\n * Definition for a binary tree node.\n * class TreeNode {\n *     val: number\n *     left: TreeNode | null\n *     right: TreeNode | null\n *     constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n *         this.val = (val===undefined ? 0 : val)\n *         this.left = (left===undefined ? null : left)\n *         this.right = (right===undefined ? null : right)\n *     }\n * }\n */\n\nfunction lowestCommonAncestor(\n    root: TreeNode | null,\n    p: TreeNode | null,\n    q: TreeNode | null,\n): TreeNode | null {\n    if (!root || root === p || root === q) {\n        return root;\n    }\n    const left = lowestCommonAncestor(root.left, p, q);\n    const right = lowestCommonAncestor(root.right, p, q);\n    return left && right ? root : left || right;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/binary-tree-right-side-view',
      title: 'Binary Tree Right Side View',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given a binary tree, write a solution to return the rightmost node at each level of the tree, representing the right side view of the tree.',
      answer:
        '```typescript\n/**\n * Definition for a binary tree node.\n * class TreeNode {\n *     val: number\n *     left: TreeNode | null\n *     right: TreeNode | null\n *     constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n *         this.val = (val===undefined ? 0 : val)\n *         this.left = (left===undefined ? null : left)\n *         this.right = (right===undefined ? null : right)\n *     }\n * }\n */\n\nfunction rightSideView(root: TreeNode | null): number[] {\n    const ans = [];\n    const dfs = (node: TreeNode | null, depth: number) => {\n        if (!node) {\n            return;\n        }\n        if (depth == ans.length) {\n            ans.push(node.val);\n        }\n        dfs(node.right, depth + 1);\n        dfs(node.left, depth + 1);\n    };\n    dfs(root, 0);\n    return ans;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/binary-search-tree-iterator',
      title: 'Binary Search Tree Iterator',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Design an iterator to efficiently traverse a binary search tree, allowing for recursive and iterative traversal methods.',
      answer:
        '```typescript\nclass TreeNode {\n    val: number\n    left: TreeNode | null\n    right: TreeNode | null\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val)\n        this.left = (left===undefined ? null : left)\n        this.right = (right===undefined ? null : right)\n    }\n}\n\nclass BSTIterator {\n    stack: TreeNode[]\n    constructor(root: TreeNode | null) {\n        this.stack = [];\n        let cur = root;\n        while(cur) {\n            this.stack.push(cur);\n            cur = cur.left\n        }\n    }\n\n    next(): number {\n        let res = this.stack.pop();\n        if(res.right) {\n            let cur = res.right;\n            while(cur) {\n                this.stack.push(cur);\n                cur = cur.left\n            }\n        }        \n        return res.val;\n    }\n\n    hasNext(): boolean {\n        return this.stack.length !== 0;\n    }\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/sum-root-to-leaf-numbers',
      title: 'Sum Root to Leaf Numbers',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given the root of a binary tree, calculate the sum of all node values that represent a valid number when traversing from root to leaf.',
      answer:
        '```typescript\n/**\n * Definition for a binary tree node.\n * class TreeNode {\n *     val: number\n *     left: TreeNode | null\n *     right: TreeNode | null\n *     constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n *         this.val = (val===undefined ? 0 : val)\n *         this.left = (left===undefined ? null : left)\n *         this.right = (right===undefined ? null : right)\n *     }\n * }\n */\n\nfunction sumNumbers(root: TreeNode | null): number {\n    function dfs(root: TreeNode | null, s: number): number {\n        if (!root) return 0;\n        s = s * 10 + root.val;\n        if (!root.left && !root.right) return s;\n        return dfs(root.left, s) + dfs(root.right, s);\n    }\n    return dfs(root, 0);\n}\n```',
    },
  ],
  graphs: [
    {
      href: 'https://leetcode.com/problems/clone-graph',
      title: 'Clone Graph',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Implement an algorithm to create a deep copy of a graph, including all nodes and edges, while preserving the original structure.',
      answer:
        '```typescript\n/**\n * Definition for Node.\n * class Node {\n *     val: number\n *     neighbors: Node[]\n *     constructor(val?: number, neighbors?: Node[]) {\n *         this.val = (val===undefined ? 0 : val)\n *         this.neighbors = (neighbors===undefined ? [] : neighbors)\n *     }\n * }\n */\n\nfunction cloneGraph(node: Node | null): Node | null {\n    if (node == null) return null;\n\n    const visited = new Map();\n    visited.set(node, new Node(node.val));\n    const queue = [node];\n    while (queue.length) {\n        const cur = queue.shift();\n        for (let neighbor of cur.neighbors || []) {\n            if (!visited.has(neighbor)) {\n                queue.push(neighbor);\n                const newNeighbor = new Node(neighbor.val, []);\n                visited.set(neighbor, newNeighbor);\n            }\n            const newNode = visited.get(cur);\n            newNode.neighbors.push(visited.get(neighbor));\n        }\n    }\n    return visited.get(node);\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/rotting-oranges',
      title: 'Rotting Oranges',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'In the "Rotting Oranges" challenge, you\'re tasked with determining which oranges will eventually rot in a grid based on their interactions and the boundaries of the grid, using a flood fill algorithm to track the spread of rottenness.',
      answer:
        '```typescript\nfunction orangesRotting(grid: number[][]): number {\n    const m: number = grid.length;\n    const n: number = grid[0].length;\n    const q: number[][] = [];\n    let cnt: number = 0;\n    for (let i: number = 0; i < m; ++i) {\n        for (let j: number = 0; j < n; ++j) {\n            if (grid[i][j] === 1) {\n                cnt++;\n            } else if (grid[i][j] === 2) {\n                q.push([i, j]);\n            }\n        }\n    }\n    let ans: number = 0;\n    const dirs: number[] = [-1, 0, 1, 0, -1];\n    for (; q.length && cnt; ++ans) {\n        const t: number[][] = [];\n        for (const [i, j] of q) {\n            for (let d = 0; d < 4; ++d) {\n                const [x, y] = [i + dirs[d], j + dirs[d + 1]];\n                if (x >= 0 && x < m && y >= 0 && y < n && grid[x][y] === 1) {\n                    grid[x][y] = 2;\n                    t.push([x, y]);\n                    cnt--;\n                }\n            }\n        }\n        q.splice(0, q.length, ...t);\n    }\n    return cnt > 0 ? -1 : ans;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/cheapest-flights-within-k-stops',
      title: 'Cheapest Flights Within K Stops',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given a graph of cities and their direct flights, find the cheapest flights from a starting city to all other cities with at most k stops in between.',
      answer:
        '```typescript\nfunction findCheapestPrice(n: number, flights: number[][], src: number, dst: number, K: number): number {\n    const INF = Number.POSITIVE_INFINITY;\n    const distances: number[] = new Array(n).fill(INF);\n    let previousIterationDistances: number[];\n    distances[src] = 0;\n\n    for (let i = 0; i <= K; ++i) {\n        previousIterationDistances = distances.slice();\n\n        for (const flight of flights) {\n            const [from, to, price] = flight;\n\n            if (previousIterationDistances[from] < INF) {\n                distances[to] = Math.min(distances[to], previousIterationDistances[from] + price);\n            }\n        }\n    }\n\n    return distances[dst] === INF ? -1 : distances[dst];\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/evaluate-division',
      title: 'Evaluate Division',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'This programming challenge requires implementing a function to divide two numbers and handle potential division by zero errors or edge cases.',
      answer:
        '```typescript\nfunction calcEquation(equations: string[][], values: number[], queries: string[][]): number[] {\n    const g: Record<string, [string, number][]> = {};\n    const ans = Array.from({ length: queries.length }, () => -1);\n\n    for (let i = 0; i < equations.length; i++) {\n        const [a, b] = equations[i];\n        (g[a] ??= []).push([b, values[i]]);\n        (g[b] ??= []).push([a, 1 / values[i]]);\n    }\n\n    for (let i = 0; i < queries.length; i++) {\n        const [c, d] = queries[i];\n        const vis = new Set<string>();\n        const q: [string, number][] = [[c, 1]];\n\n        if (!g[c] || !g[d]) continue;\n        if (c === d) {\n            ans[i] = 1;\n            continue;\n        }\n\n        for (const [current, v] of q) {\n            if (vis.has(current)) continue;\n            vis.add(current);\n\n            for (const [intermediate, multiplier] of g[current]) {\n                if (vis.has(intermediate)) continue;\n\n                if (intermediate === d) {\n                    ans[i] = v * multiplier;\n                    break;\n                }\n\n                q.push([intermediate, v * multiplier]);\n            }\n\n            if (ans[i] !== -1) break;\n        }\n    }\n\n    return ans;\n}\n```',
    },
  ],
  heaps: [
    {
      href: 'https://leetcode.com/problems/kth-largest-element-in-an-array',
      title: 'Kth Largest Element in an Array',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        "Find the Kth largest element in an array, where every other element's value is compared to determine its rank.",
      answer:
        '```typescript\nfunction findKthLargest(nums: number[], k: number): number {\n    const cnt: Record<number, number> = {};\n    for (const x of nums) {\n        cnt[x] = (cnt[x] || 0) + 1;\n    }\n    const m = Math.max(...nums);\n    for (let i = m; ; --i) {\n        k -= cnt[i] || 0;\n        if (k <= 0) {\n            return i;\n        }\n    }\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/search-suggestions-system',
      title: 'Search Suggestions System',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        "Implement a system that generates suggestions for a user's search query based on their past searches, with the goal of finding the most relevant and accurate results.",
      answer:
        "```typescript\ninterface TrieNode {\n    children: Array<TrieNode | null>;\n    indices: number[];\n}\n\nconst createTrieNode = (): TrieNode => ({\n    children: new Array(26).fill(null),\n    indices: [],\n});\n\nconst trieRoot: TrieNode = createTrieNode();\n\nfunction insert(word: string, wordIndex: number): void {\n    let node: TrieNode = trieRoot;\n\n    for (const ch of word) {\n        const index = ch.charCodeAt(0) - 'a'.charCodeAt(0);\n\n        if (!node.children[index]) {\n            node.children[index] = createTrieNode();\n        }\n\n        node = node.children[index] as TrieNode;\n\n        if (node.indices.length < 3) {\n            node.indices.push(wordIndex);\n        }\n    }\n}\n\nfunction search(prefix: string): Array<number[]> {\n    let node: TrieNode = trieRoot;\n    const results: Array<number[]> = [];\n\n    for (let i = 0; i < prefix.length; ++i) {\n        const index = prefix[i].charCodeAt(0) - 'a'.charCodeAt(0);\n        if (!node.children[index]) {\n            break;\n        }\n\n        node = node.children[index] as TrieNode;\n        results.push([...node.indices]);\n    }\n\n    return results;\n}\n\nfunction suggestedProducts(products: string[], searchWord: string): string[][] {\n    products.sort();\n\n    products.forEach((product, index) => {\n        insert(product, index);\n    });\n\n    const suggestions: string[][] = [];\n    const indicesList = search(searchWord);\n\n    for (const indices of indicesList) {\n        const temp: string[] = [];\n        for (const idx of indices) {\n            temp.push(products[idx]);\n        }\n        suggestions.push(temp);\n    }\n\n    return suggestions;\n}\n```",
    },
    {
      href: 'https://leetcode.com/problems/k-closest-points-to-origin',
      title: 'K Closest Points to Origin',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Find the k points with the shortest distances from the origin in a given set of 2D coordinates.',
      answer:
        '```typescript\nfunction kClosest(points: number[][], k: number): number[][] {\n    const dist = points.map(([x, y]) => x * x + y * y);\n    let [l, r] = [0, Math.max(...dist)];\n    while (l < r) {\n        const mid = (l + r) >> 1;\n        let cnt = 0;\n        for (const d of dist) {\n            if (d <= mid) {\n                ++cnt;\n            }\n        }\n        if (cnt >= k) {\n            r = mid;\n        } else {\n            l = mid + 1;\n        }\n    }\n    return points.filter((_, i) => dist[i] <= l);\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/sort-characters-by-frequency',
      title: 'Sort Characters By Frequency',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'This programming challenge requires writing an algorithm that takes a string as input and returns the characters sorted in ascending order based on their frequency, from most frequent to least frequent.',
      answer:
        "```typescript\nfunction frequencySort(s: string): string {\n    const cnt: Map<string, number> = new Map();\n    for (const c of s) {\n        cnt.set(c, (cnt.get(c) || 0) + 1);\n    }\n    const cs = Array.from(cnt.keys()).sort((a, b) => cnt.get(b)! - cnt.get(a)!);\n    const ans: string[] = [];\n    for (const c of cs) {\n        ans.push(c.repeat(cnt.get(c)!));\n    }\n    return ans.join('');\n}\n```",
    },
  ],
  linkedLists: [
    {
      href: 'https://leetcode.com/problems/palindrome-linked-list',
      title: 'Palindrome Linked List',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'You are given the task to determine whether a singly linked list is a palindrome, meaning that its contents read the same backward as forward.',
      answer:
        '```typescript\n/**\n * Definition for singly-linked list.\n * class ListNode {\n *     val: number\n *     next: ListNode | null\n *     constructor(val?: number, next?: ListNode | null) {\n *         this.val = (val===undefined ? 0 : val)\n *         this.next = (next===undefined ? null : next)\n *     }\n * }\n */\n\nfunction isPalindrome(head: ListNode | null): boolean {\n    let slow: ListNode = head,\n        fast: ListNode = head.next;\n    while (fast != null && fast.next != null) {\n        slow = slow.next;\n        fast = fast.next.next;\n    }\n    let cur: ListNode = slow.next;\n    slow.next = null;\n    let prev: ListNode = null;\n    while (cur != null) {\n        let t: ListNode = cur.next;\n        cur.next = prev;\n        prev = cur;\n        cur = t;\n    }\n    while (prev != null) {\n        if (prev.val != head.val) return false;\n        prev = prev.next;\n        head = head.next;\n    }\n    return true;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/lru-cache',
      title: 'LRU Cache',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Design an efficient data structure to store and retrieve frequently accessed items while discarding the least recently used ones.',
      answer:
        '```typescript\nclass LRUCache {\n    capacity: number;\n    map: Map<number, number>;\n    constructor(capacity: number) {\n        this.capacity = capacity;\n        this.map = new Map();\n    }\n\n    get(key: number): number {\n        if (this.map.has(key)) {\n            const val = this.map.get(key)!;\n            this.map.delete(key);\n            this.map.set(key, val);\n            return val;\n        }\n        return -1;\n    }\n\n    put(key: number, value: number): void {\n        this.map.delete(key);\n        this.map.set(key, value);\n        if (this.map.size > this.capacity) {\n            this.map.delete(this.map.keys().next().value);\n        }\n    }\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/add-two-numbers',
      title: 'Add Two Numbers',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'You are given two numbers represented as linked lists, and you must add these numbers together while preserving the original order of digits.',
      answer:
        '```typescript\n/**\n * Definition for singly-linked list.\n * class ListNode {\n *     val: number\n *     next: ListNode | null\n *     constructor(val?: number, next?: ListNode | null) {\n *         this.val = (val===undefined ? 0 : val)\n *         this.next = (next===undefined ? null : next)\n *     }\n * }\n */\n\nfunction addTwoNumbers(l1: ListNode | null, l2: ListNode | null): ListNode | null {\n    const dummy = new ListNode();\n    let cur = dummy;\n    let sum = 0;\n    while (l1 != null || l2 != null || sum !== 0) {\n        if (l1 != null) {\n            sum += l1.val;\n            l1 = l1.next;\n        }\n        if (l2 != null) {\n            sum += l2.val;\n            l2 = l2.next;\n        }\n        cur.next = new ListNode(sum % 10);\n        cur = cur.next;\n        sum = Math.floor(sum / 10);\n    }\n    return dummy.next;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/copy-list-with-random-pointer',
      title: 'Copy List with Random Pointer',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        "You're tasked with creating a function that can copy a linked list, including the random pointers, while preserving their original values and connections.",
      answer:
        '```typescript\n/**\n * Definition for Node.\n * class Node {\n *     val: number\n *     next: Node | null\n *     random: Node | null\n *     constructor(val?: number, next?: Node, random?: Node) {\n *         this.val = (val===undefined ? 0 : val)\n *         this.next = (next===undefined ? null : next)\n *         this.random = (random===undefined ? null : random)\n *     }\n * }\n */\n\nfunction copyRandomList(head: Node | null): Node | null {\n    const map = new Map<Node, Node>();\n    let cur = head;\n    while (cur != null) {\n        map.set(cur, new Node(cur.val));\n        cur = cur.next;\n    }\n    cur = head;\n    while (cur != null) {\n        map.get(cur).next = map.get(cur.next) ?? null;\n        map.get(cur).random = map.get(cur.random) ?? null;\n        cur = cur.next;\n    }\n    return map.get(head);\n}\n```',
    },
  ],
  queues: [
    {
      href: 'https://leetcode.com/problems/number-of-recent-calls',
      title: 'Number of Recent Calls',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Design an algorithm to efficiently track and retrieve the number of recent calls made to a system, handling cases where multiple calls occur within a certain time frame.',
      answer:
        '```typescript\nlet recentPings: number[] = [];\n\nfunction ping(t: number): number {\n    recentPings.push(t);\n\n    while (recentPings.length > 0 && recentPings[0] < t - 3000) {\n        recentPings.shift();\n    }\n\n    return recentPings.length;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/design-hit-counter',
      title: 'Design Hit Counter',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'The task involves developing an efficient data structure to track the number of times each minute has been accessed within a given time period, allowing for fast lookups and updates.',
      answer:
        '```typescript\nclass HitCounter {\n    private ts: number[] = [];\n\n    constructor() {}\n\n    hit(timestamp: number): void {\n        this.ts.push(timestamp);\n    }\n\n    getHits(timestamp: number): number {\n        const search = (x: number) => {\n            let [l, r] = [0, this.ts.length];\n            while (l < r) {\n                const mid = (l + r) >> 1;\n                if (this.ts[mid] >= x) {\n                    r = mid;\n                } else {\n                    l = mid + 1;\n                }\n            }\n            return l;\n        };\n        return this.ts.length - search(timestamp - 300 + 1);\n    }\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/design-circular-queue',
      title: 'Design Circular Queue',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Implement a data structure that supports adding and removing elements in a circular manner, with the ability to track the front and rear indices of the queue.',
      answer:
        '```typescript\nclass MyCircularQueue {\n    private queue: Array<number>;\n    private length: number;\n    private size: number;\n    private head: number;\n    private tail: number;\n    constructor(k: number) {\n        this.queue = new Array(k);\n        this.length = k;\n        this.size = 0;\n        this.head = this.tail = 0;\n    }\n\n    enQueue(value: number): boolean {\n        if (this.isFull()) return false;\n        this.size++;\n        this.queue[this.tail] = value;\n        this.tail = (this.tail + 1) % this.length;\n        return true;\n    }\n\n    deQueue(): boolean {\n        if (this.isEmpty()) return false;\n        this.size--;\n        this.head = (this.head + 1) % this.length;\n        return true;\n    }\n\n    Front(): number {\n        if (this.isEmpty()) return -1;\n        return this.queue[this.head];\n    }\n\n    Rear(): number {\n        if (this.isEmpty()) return -1;\n        const index = (this.tail + this.length - 1) % this.length;\n        return this.queue[index];\n    }\n\n    isEmpty(): boolean {\n        return this.size === 0;\n    }\n\n    isFull(): boolean {\n        return this.size === this.length;\n    }\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/perfect-squares',
      title: 'Perfect Squares',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given an array of non-negative integers, find the number of perfect square numbers within the array that can be formed by taking the square root of each element and then rounding down to the nearest integer.',
      answer:
        '```typescript\nfunction numSquares(n: number): number {\n    const m = Math.floor(Math.sqrt(n));\n    const f: number[] = Array(n + 1).fill(1 << 30);\n    f[0] = 0;\n    for (let i = 1; i <= m; ++i) {\n        for (let j = i * i; j <= n; ++j) {\n            f[j] = Math.min(f[j], f[j - i * i] + 1);\n        }\n    }\n    return f[n];\n}\n```',
    },
  ],
  stacks: [
    {
      href: 'https://leetcode.com/problems/valid-parentheses',
      title: 'Valid Parentheses',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'The goal is to determine whether a given string of parentheses is balanced and correctly nested, following standard rules for opening and closing brackets.',
      answer:
        "```typescript\nconst map = new Map([\n    ['(', ')'],\n    ['[', ']'],\n    ['{', '}'],\n]);\n\nfunction isValid(s: string): boolean {\n    const stack = [];\n    for (const c of s) {\n        if (map.has(c)) {\n            stack.push(map.get(c));\n        } else if (stack.pop() !== c) {\n            return false;\n        }\n    }\n    return stack.length === 0;\n}\n```",
    },
    {
      href: 'https://leetcode.com/problems/minimum-remove-to-make-valid-parentheses',
      title: 'Minimum Remove to Make Valid Parentheses',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given a string of parentheses, find the minimum number of characters that need to be removed to make all parentheses properly nested and balanced.',
      answer:
        "```typescript\nfunction minRemoveToMakeValid(s: string): string {\n    let left = 0;\n    let right = 0;\n    for (const c of s) {\n        if (c === '(') {\n            left++;\n        } else if (c === ')') {\n            if (right < left) {\n                right++;\n            }\n        }\n    }\n\n    let hasLeft = 0;\n    let res = '';\n    for (const c of s) {\n        if (c === '(') {\n            if (hasLeft < right) {\n                hasLeft++;\n                res += c;\n            }\n        } else if (c === ')') {\n            if (hasLeft != 0 && right !== 0) {\n                right--;\n                hasLeft--;\n                res += c;\n            }\n        } else {\n            res += c;\n        }\n    }\n    return res;\n}\n```",
    },
    {
      href: 'https://leetcode.com/problems/buildings-with-an-ocean-view',
      title: 'Buildings With an Ocean View',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Develop an algorithm to determine which buildings have an ocean view, based on the positions of their bases relative to the coastline.',
      answer:
        '```typescript\nfunction findBuildings(heights: number[]): number[] {\n    const ans: number[] = [];\n    let mx = 0;\n    for (let i = heights.length - 1; ~i; --i) {\n        if (heights[i] > mx) {\n            ans.push(i);\n            mx = heights[i];\n        }\n    }\n    return ans.reverse();\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/trapping-rain-water',
      title: 'Trapping Rain Water',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'The task involves calculating the amount of water that can be trapped in a given array of integers, which represents the height of bars in a vertical garden, to determine the maximum area that can be trapped between them.',
      answer:
        '```typescript\nfunction trap(height: number[]): number {\n    const n = height.length;\n    const left: number[] = new Array(n).fill(height[0]);\n    const right: number[] = new Array(n).fill(height[n - 1]);\n    for (let i = 1; i < n; ++i) {\n        left[i] = Math.max(left[i - 1], height[i]);\n        right[n - i - 1] = Math.max(right[n - i], height[n - i - 1]);\n    }\n    let ans = 0;\n    for (let i = 0; i < n; ++i) {\n        ans += Math.min(left[i], right[i]) - height[i];\n    }\n    return ans;\n}\n```',
    },
  ],
  tries: [
    {
      href: 'https://leetcode.com/problems/implement-trie-prefix-tree',
      title: 'Implement Trie (Prefix Tree)',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Design and implement a data structure that efficiently stores and retrieves words based on their prefixes, allowing for fast lookup and insertion operations.',
      answer:
        '```typescript\nclass TrieNode {\n    children;\n    isEnd;\n    constructor() {\n        this.children = new Array(26);\n        this.isEnd = false;\n    }\n}\n\nclass Trie {\n    root;\n    constructor() {\n        this.root = new TrieNode();\n    }\n\n    insert(word: string): void {\n        let head = this.root;\n        for (let char of word) {\n            let index = char.charCodeAt(0) - 97;\n            if (!head.children[index]) {\n                head.children[index] = new TrieNode();\n            }\n            head = head.children[index];\n        }\n        head.isEnd = true;\n    }\n\n    search(word: string): boolean {\n        let head = this.searchPrefix(word);\n        return head != null && head.isEnd;\n    }\n\n    startsWith(prefix: string): boolean {\n        return this.searchPrefix(prefix) != null;\n    }\n\n    private searchPrefix(prefix: string) {\n        let head = this.root;\n        for (let char of prefix) {\n            let index = char.charCodeAt(0) - 97;\n            if (!head.children[index]) return null;\n            head = head.children[index];\n        }\n        return head;\n    }\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/word-break',
      title: 'Word Break',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Determine whether a given string can be segmented into valid words from a predefined list, following the constraints that each word in the list must exactly match a contiguous subsequence within the input string.',
      answer:
        '```typescript\nfunction wordBreak(s: string, wordDict: string[]): boolean {\n    const trie = new Trie();\n    for (const w of wordDict) {\n        trie.insert(w);\n    }\n    const n = s.length;\n    const f: boolean[] = new Array(n + 1).fill(false);\n    f[n] = true;\n    for (let i = n - 1; i >= 0; --i) {\n        let node: Trie = trie;\n        for (let j = i; j < n; ++j) {\n            const k = s.charCodeAt(j) - 97;\n            if (!node.children[k]) {\n                break;\n            }\n            node = node.children[k];\n            if (node.isEnd && f[j + 1]) {\n                f[i] = true;\n                break;\n            }\n        }\n    }\n    return f[0];\n}\n\nclass Trie {\n    children: Trie[];\n    isEnd: boolean;\n\n    constructor() {\n        this.children = new Array(26);\n        this.isEnd = false;\n    }\n\n    insert(w: string): void {\n        let node: Trie = this;\n        for (const c of w) {\n            const i = c.charCodeAt(0) - 97;\n            if (!node.children[i]) {\n                node.children[i] = new Trie();\n            }\n            node = node.children[i];\n        }\n        node.isEnd = true;\n    }\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/design-add-and-search-words-data-structure',
      title: 'Design Add and Search Words Data Structure',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Design a data structure that allows for efficient insertion, searching, and retrieval of words while minimizing storage space.',
      answer:
        "```typescript\ntype TrieNode = {\n    children: (TrieNode | null)[];\n    isWordEnd: boolean;\n};\n\nfunction createTrieNode(): TrieNode {\n    return {\n        children: new Array(26).fill(null),\n        isWordEnd: false\n    };\n}\n\nconst root: TrieNode = createTrieNode();\n\nfunction insert(word: string): void {\n    let current = root;\n    for (const ch of word) {\n        const index = ch.charCodeAt(0) - 'a'.charCodeAt(0);\n        if (current.children[index] === null) {\n            current.children[index] = createTrieNode();\n        }\n        current = current.children[index] as TrieNode;\n    }\n    current.isWordEnd = true;\n}\n\nfunction addWord(word: string): void {\n    insert(word);\n}\n\nfunction dfsSearch(word: string, index: number, node: TrieNode): boolean {\n    if (index === word.length) {\n        return node.isWordEnd;\n    }\n\n    const ch = word[index];\n    if (ch !== '.') {\n        const child = node.children[ch.charCodeAt(0) - 'a'.charCodeAt(0)];\n        if (child && dfsSearch(word, index + 1, child)) {\n            return true;\n        }\n    } else {\n        for (const child of node.children) {\n            if (child && dfsSearch(word, index + 1, child)) {\n                return true;\n            }\n        }\n    }\n    return false;\n}\n\nfunction search(word: string): boolean {\n    return dfsSearch(word, 0, root);\n}\n```",
    },
    {
      href: 'https://leetcode.com/problems/design-in-memory-file-system',
      title: 'Design In-Memory File System',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Design an in-memory file system that stores and manages files, handling operations such as creation, deletion, reading, and writing while minimizing memory usage.',
      answer:
        "```typescript\ninterface TreeNode {\n    name?: string;\n    isFile: boolean;\n    content: string[];\n    children: Map<string, TreeNode>;\n}\n\nconst root: TreeNode = {\n    name: '',\n    isFile: false,\n    content: [],\n    children: new Map<string, TreeNode>()\n};\n\nfunction insertNode(path: string, isFile: boolean): TreeNode {\n    let node = root;\n    const parts = path.split('/');\n\n    for (let i = 1; i < parts.length; i++) {\n        const part = parts[i];\n        if (!node.children.has(part)) {\n            node.children.set(part, { isFile: false, content: [], children: new Map() });\n        }\n        node = node.children.get(part) as TreeNode;\n    }\n\n    node.isFile = isFile;\n    if (isFile) {\n        node.name = parts[parts.length - 1];\n    }\n\n    return node;\n}\n\nfunction searchNode(path: string): TreeNode | null {\n    let node = root;\n    const parts = path.split('/');\n\n    for (let i = 1; i < parts.length; i++) {\n        const part = parts[i];\n        if (!node.children.has(part)) {\n            return null;\n        }\n        node = node.children.get(part) as TreeNode;\n    }\n\n    return node;\n}\n\nfunction ls(path: string): string[] {\n    const result: string[] = [];\n    const node = searchNode(path);\n\n    if (node === null) {\n        return result;\n    }\n\n    if (node.isFile) {\n        result.push(node.name as string);\n    } else {\n        for (const childName of node.children.keys()) {\n            result.push(childName);\n        }\n    }\n\n    result.sort();\n    return result;\n}\n\nfunction makeDirectory(path: string): void {\n    insertNode(path, false);\n}\n\nfunction addContentToFile(filePath: string, content: string): void {\n    const node = insertNode(filePath, true);\n    node.content.push(content);\n}\n\nfunction readContentFromFile(filePath: string): string {\n    const node = searchNode(filePath);\n\n    if (node !== null && node.isFile) {\n        return node.content.join('');\n    }\n\n    return '';\n}\n```",
    },
  ],
}

export const COMMON_TECHNIQUES_PROBLEMS = {
  slidingWindow: [
    {
      href: 'https://leetcode.com/problems/permutation-in-string',
      title: 'Permutation in String',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given a string and an integer k, find all unique permutations of the first k characters that appear in the original string.',
      answer:
        '```typescript\nfunction checkInclusion(s1: string, s2: string): boolean {\n    // 滑动窗口方案\n    if (s1.length > s2.length) {\n        return false;\n    }\n\n    const n = s1.length;\n    const m = s2.length;\n\n    const toCode = (s: string) => s.charCodeAt(0) - 97;\n    const isMatch = () => {\n        for (let i = 0; i < 26; i++) {\n            if (arr1[i] !== arr2[i]) {\n                return false;\n            }\n        }\n        return true;\n    };\n\n    const arr1 = new Array(26).fill(0);\n    for (const s of s1) {\n        const index = toCode(s);\n        arr1[index]++;\n    }\n\n    const arr2 = new Array(26).fill(0);\n    for (let i = 0; i < n; i++) {\n        const index = toCode(s2[i]);\n        arr2[index]++;\n    }\n\n    for (let l = 0, r = n; r < m; l++, r++) {\n        if (isMatch()) {\n            return true;\n        }\n\n        const i = toCode(s2[l]);\n        const j = toCode(s2[r]);\n        arr2[i]--;\n        arr2[j]++;\n    }\n    return isMatch();\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/minimum-size-subarray-sum',
      title: 'Minimum Size Subarray Sum',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'The goal is to find the minimum length subarray that sums up to a given target value, while potentially allowing for negative numbers and zero.',
      answer:
        '```typescript\nfunction minSubArrayLen(target: number, nums: number[]): number {\n    const n = nums.length;\n    let [s, ans] = [0, n + 1];\n    for (let l = 0, r = 0; r < n; ++r) {\n        s += nums[r];\n        while (s >= target) {\n            ans = Math.min(ans, r - l + 1);\n            s -= nums[l++];\n        }\n    }\n    return ans > n ? 0 : ans;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/longest-subarray-of-1s-after-deleting-one-element',
      title: "Longest Subarray of 1's After Deleting One Element",
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'The task is to find the length of the longest subarray that contains consecutive 1s, after deleting exactly one element from this subarray.',
      answer:
        '```typescript\nfunction longestSubarray(nums: number[]): number {\n    let [cnt, l] = [0, 0];\n    for (const x of nums) {\n        cnt += x ^ 1;\n        if (cnt > 1) {\n            cnt -= nums[l++] ^ 1;\n        }\n    }\n    return nums.length - l - 1;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/fruit-into-baskets',
      title: 'Fruit Into Baskets',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'This problem requires writing an efficient algorithm to calculate the number of ways to pick fruits from a given basket, considering constraints on fruit counts and basket sizes.',
      answer:
        '```typescript\nfunction totalFruit(fruits: number[]): number {\n    const n = fruits.length;\n    const cnt: Map<number, number> = new Map();\n    let j = 0;\n    for (const x of fruits) {\n        cnt.set(x, (cnt.get(x) || 0) + 1);\n        if (cnt.size > 2) {\n            cnt.set(fruits[j], cnt.get(fruits[j])! - 1);\n            if (!cnt.get(fruits[j])) {\n                cnt.delete(fruits[j]);\n            }\n            ++j;\n        }\n    }\n    return n - j;\n}\n```',
    },
  ],
  twoPointers: [
    {
      href: 'https://leetcode.com/problems/squares-of-a-sorted-array',
      title: 'Squares of a Sorted Array',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Given a sorted array of integers, find the minimum number of operations required to transform it into an array where each element is the square of its index in the original array.',
      answer:
        '```typescript\nconst sortedSquares = (nums: number[]): number[] => {\n    const n: number = nums.length;\n\n    const res: number[] = new Array(n);\n\n    for (let i: number = 0, j: number = n - 1, k: number = n - 1; i <= j; ) {\n        if (nums[i] * nums[i] > nums[j] * nums[j]) {\n            res[k--] = nums[i] * nums[i];\n            ++i;\n        } else {\n            res[k--] = nums[j] * nums[j];\n            --j;\n        }\n    }\n\n    return res;\n};\n```',
    },
    {
      href: 'https://leetcode.com/problems/3sum',
      title: '3Sum',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given an array of integers, find all unique triplets that sum to zero.',
      answer:
        '```typescript\nfunction threeSum(nums: number[]): number[][] {\n    nums.sort((a, b) => a - b);\n    const ans: number[][] = [];\n    const n = nums.length;\n    for (let i = 0; i < n - 2 && nums[i] <= 0; i++) {\n        if (i > 0 && nums[i] === nums[i - 1]) {\n            continue;\n        }\n        let j = i + 1;\n        let k = n - 1;\n        while (j < k) {\n            const x = nums[i] + nums[j] + nums[k];\n            if (x < 0) {\n                ++j;\n            } else if (x > 0) {\n                --k;\n            } else {\n                ans.push([nums[i], nums[j++], nums[k--]]);\n                while (j < k && nums[j] === nums[j - 1]) {\n                    ++j;\n                }\n                while (j < k && nums[k] === nums[k + 1]) {\n                    --k;\n                }\n            }\n        }\n    }\n    return ans;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/valid-palindrome-ii',
      title: 'Valid Palindrome II',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given a string, determine if it can be rearranged into a palindrome by removing at most one character.',
      answer:
        '```typescript\nfunction validPalindrome(s: string): boolean {\n    for (let i: number = 0, j = s.length - 1; i < j; ++i, --j) {\n        if (s.charAt(i) != s.charAt(j)) {\n            return isPalinddrome(s.slice(i, j)) || isPalinddrome(s.slice(i + 1, j + 1));\n        }\n    }\n    return true;\n}\n\nfunction isPalinddrome(s: string): boolean {\n    for (let i: number = 0, j = s.length - 1; i < j; ++i, --j) {\n        if (s.charAt(i) != s.charAt(j)) {\n            return false;\n        }\n    }\n    return true;\n}\n```',
    },
  ],
  fastAndSlowPointers: [
    {
      href: 'https://leetcode.com/problems/happy-number',
      title: 'Happy Number',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Determine if a given number is a "happy number," defined as a number where the sum of the squares of its digits eventually reaches 1, or remains at 1 in a loop, without descending to a negative value.',
      answer:
        '```typescript\nfunction isHappy(n: number): boolean {\n    const getNext = (n: number) => {\n        let res = 0;\n        while (n !== 0) {\n            res += (n % 10) ** 2;\n            n = Math.floor(n / 10);\n        }\n        return res;\n    };\n\n    let slow = n;\n    let fast = getNext(n);\n    while (slow !== fast) {\n        slow = getNext(slow);\n        fast = getNext(getNext(fast));\n    }\n    return fast === 1;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/linked-list-cycle-ii',
      title: 'Linked List Cycle II',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'In the Linked List Cycle II challenge, you need to detect and solve a cycle in a linked list that has multiple entry points and returns to its start point, finding the start node of the cycle and the tail node of the cycle if possible.',
      answer:
        '```typescript\n/**\n * Definition for singly-linked list.\n * class ListNode {\n *     val: number\n *     next: ListNode | null\n *     constructor(val?: number, next?: ListNode | null) {\n *         this.val = (val===undefined ? 0 : val)\n *         this.next = (next===undefined ? null : next)\n *     }\n * }\n */\n\nfunction detectCycle(head: ListNode | null): ListNode | null {\n    let [slow, fast] = [head, head];\n    while (fast && fast.next) {\n        slow = slow.next;\n        fast = fast.next.next;\n        if (slow === fast) {\n            let ans = head;\n            while (ans !== slow) {\n                ans = ans.next;\n                slow = slow.next;\n            }\n            return ans;\n        }\n    }\n    return null;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/find-the-duplicate-number',
      title: 'Find the Duplicate Number',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'The goal is to identify and return a duplicate number that exists within a list of integers, where each integer appears twice in the list.',
      answer:
        '```typescript\nfunction findDuplicate(nums: number[]): number {\n    let l = 0;\n    let r = nums.length - 1;\n    while (l < r) {\n        const mid = (l + r) >> 1;\n        let cnt = 0;\n        for (const v of nums) {\n            if (v <= mid) {\n                ++cnt;\n            }\n        }\n        if (cnt > mid) {\n            r = mid;\n        } else {\n            l = mid + 1;\n        }\n    }\n    return l;\n}\n```',
    },
  ],
  mergeIntervals: [
    {
      href: 'https://leetcode.com/problems/non-overlapping-intervals',
      title: 'Non-overlapping Intervals',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given two sets of intervals, determine if all intervals can be arranged in such a way that no two overlapping intervals are adjacent to each other.',
      answer:
        '```typescript\nfunction eraseOverlapIntervals(intervals: number[][]): number {\n    intervals.sort((a, b) => a[1] - b[1]);\n    let end = intervals[0][1],\n        ans = 0;\n    for (let i = 1; i < intervals.length; ++i) {\n        let cur = intervals[i];\n        if (end > cur[0]) {\n            ans++;\n        } else {\n            end = cur[1];\n        }\n    }\n    return ans;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/interval-list-intersections',
      title: 'Interval List Intersections',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given two or more intervals, find all overlapping intervals in the list and return them as a sorted list of start-end pairs.',
      answer:
        '```typescript\nfunction intervalIntersection(firstList: number[][], secondList: number[][]): number[][] {\n    const n = firstList.length;\n    const m = secondList.length;\n    const res = [];\n    let i = 0;\n    let j = 0;\n    while (i < n && j < m) {\n        const start = Math.max(firstList[i][0], secondList[j][0]);\n        const end = Math.min(firstList[i][1], secondList[j][1]);\n        if (start <= end) {\n            res.push([start, end]);\n        }\n        if (firstList[i][1] < secondList[j][1]) {\n            i++;\n        } else {\n            j++;\n        }\n    }\n    return res;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/employee-free-time',
      title: 'Employee Free Time',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        "Given an employee's schedule and work hours, determine the time blocks in which they are free from work.",
      answer:
        '```typescript\nclass Interval {\n    start: number;\n    end: number;\n\n    constructor(start: number, end: number) {\n        this.start = start;\n        this.end = end;\n    }\n}\n\nfunction employeeFreeTime(schedule: Interval[][]): Interval[] {\n    const allIntervals: Interval[] = [];\n\n    for (const employee of schedule) {\n        for (const interval of employee) {\n            allIntervals.push(interval);\n        }\n    }\n\n    allIntervals.sort((a, b) => a.start - b.start);\n\n    const merged: Interval[] = [];\n    let current = allIntervals[0];\n\n    for (let i = 1; i < allIntervals.length; i++) {\n        const next = allIntervals[i];\n        if (current.end >= next.start) {\n            current.end = Math.max(current.end, next.end);\n        } else {\n            merged.push(current);\n            current = next;\n        }\n    }\n    \n    merged.push(current);\n\n    const freeTimes: Interval[] = [];\n    for (let i = 1; i < merged.length; i++) {\n        const prev = merged[i - 1];\n        const curr = merged[i];\n        if (prev.end < curr.start) {\n            freeTimes.push(new Interval(prev.end, curr.start));\n        }\n    }\n\n    return freeTimes;\n}\n```',
    },
  ],
  cyclicSort: [
    {
      href: 'https://leetcode.com/problems/find-all-numbers-disappeared-in-an-array',
      title: 'Find All Numbers Disappeared in an Array',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Write a program to identify and return all numbers that are missing from a given sorted array of integers, assuming the range of integers is not specified.',
      answer:
        '```typescript\nfunction findDisappearedNumbers(nums: number[]): number[] {\n    const n = nums.length;\n    for (const x of nums) {\n        const i = Math.abs(x) - 1;\n        if (nums[i] > 0) {\n            nums[i] *= -1;\n        }\n    }\n    const ans: number[] = [];\n    for (let i = 0; i < n; ++i) {\n        if (nums[i] > 0) {\n            ans.push(i + 1);\n        }\n    }\n    return ans;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/find-all-duplicates-in-an-array',
      title: 'Find All Duplicates in an Array',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given an array, find and return all duplicate elements, distinguishing between exact matches and occurrences with different indices.',
      answer:
        '```typescript\nfunction findDuplicates(nums: number[]): number[] {\n    const ans: number[] = [];\n\n    for (let i = 0; i < nums.length; i++) {\n        const idx = Math.abs(nums[i]) - 1;\n        if (nums[idx] < 0) {\n            ans.push(idx + 1);\n        }\n        nums[idx] = -nums[idx];\n    }\n    return ans;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/first-missing-positive',
      title: 'First Missing Positive',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Given an unsorted array of positive integers, find the smallest missing positive integer from 1 to the length of the array.',
      answer:
        '```typescript\nfunction firstMissingPositive(nums: number[]): number {\n    const n = nums.length;\n    let i = 0;\n    while (i < n) {\n        const j = nums[i] - 1;\n        if (j === i || j < 0 || j >= n || nums[i] === nums[j]) {\n            i++;\n        } else {\n            [nums[i], nums[j]] = [nums[j], nums[i]];\n        }\n    }\n\n    const res = nums.findIndex((v, i) => v !== i + 1);\n    return (res === -1 ? n : res) + 1;\n}\n```',
    },
  ],
  linkedListReversal: [
    {
      href: 'https://leetcode.com/problems/reverse-linked-list-ii',
      title: 'Reverse Linked List II',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        "Reverse the order of a linked list, where each node has two pointers: one pointing to its previous node and one to its next node, and the goal is to reverse the direction of these pointers while maintaining the list's structure.",
      answer:
        '```typescript\n/**\n * Definition for singly-linked list.\n * class ListNode {\n *     val: number\n *     next: ListNode | null\n *     constructor(val?: number, next?: ListNode | null) {\n *         this.val = (val===undefined ? 0 : val)\n *         this.next = (next===undefined ? null : next)\n *     }\n * }\n */\n\nfunction reverseBetween(head: ListNode | null, left: number, right: number): ListNode | null {\n    const n = right - left;\n    if (n === 0) {\n        return head;\n    }\n\n    const dummy = new ListNode(0, head);\n    let pre = null;\n    let cur = dummy;\n    for (let i = 0; i < left; i++) {\n        pre = cur;\n        cur = cur.next;\n    }\n    const h = pre;\n    pre = null;\n    for (let i = 0; i <= n; i++) {\n        const next = cur.next;\n        cur.next = pre;\n        pre = cur;\n        cur = next;\n    }\n    h.next.next = cur;\n    h.next = pre;\n    return dummy.next;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/swap-nodes-in-pairs',
      title: 'Swap Nodes in Pairs',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given a linked list, swap the values of adjacent nodes while maintaining the original order.',
      answer:
        '```typescript\n/**\n * Definition for singly-linked list.\n * class ListNode {\n *     val: number\n *     next: ListNode | null\n *     constructor(val?: number, next?: ListNode | null) {\n *         this.val = (val===undefined ? 0 : val)\n *         this.next = (next===undefined ? null : next)\n *     }\n * }\n */\n\nfunction swapPairs(head: ListNode | null): ListNode | null {\n    const dummy = new ListNode(0, head);\n    let [pre, cur] = [dummy, head];\n    while (cur && cur.next) {\n        const t = cur.next;\n        cur.next = t.next;\n        t.next = cur;\n        pre.next = t;\n        [pre, cur] = [cur, cur.next];\n    }\n    return dummy.next;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/reverse-nodes-in-k-group',
      title: 'Reverse Nodes in k-Group',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        "Reverses the nodes in a linked list in groups of 'k', where each group's nodes are reversed individually.",
      answer:
        '```typescript\n/**\n * Definition for singly-linked list.\n * class ListNode {\n *     val: number\n *     next: ListNode | null\n *     constructor(val?: number, next?: ListNode | null) {\n *         this.val = (val===undefined ? 0 : val)\n *         this.next = (next===undefined ? null : next)\n *     }\n * }\n */\n\nfunction reverseKGroup(head: ListNode | null, k: number): ListNode | null {\n    if (k === 1) {\n        return head;\n    }\n\n    const dummy = new ListNode(0, head);\n    let root = dummy;\n    while (root != null) {\n        let pre = root;\n        let cur = root;\n\n        let count = 0;\n        while (count !== k) {\n            count++;\n            cur = cur.next;\n            if (cur == null) {\n                return dummy.next;\n            }\n        }\n\n        const nextRoot = pre.next;\n        pre.next = cur;\n\n        let node = nextRoot;\n        let next = node.next;\n        node.next = cur.next;\n        while (node != cur) {\n            [next.next, node, next] = [node, next, next.next];\n        }\n        root = nextRoot;\n    }\n\n    return dummy.next;\n}\n```',
    },
  ],
  treeBFS: [
    {
      href: 'https://leetcode.com/problems/average-of-levels-in-binary-tree',
      title: 'Average of Levels in Binary Tree',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Find the average value of each level in a binary tree, where each node at a given level can have multiple child nodes.',
      answer:
        '```typescript\nclass TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n\n    constructor(val: number = 0, left: TreeNode | null = null, right: TreeNode | null = null) {\n        this.val = val;\n        this.left = left;\n        this.right = right;\n    }\n}\n\nfunction averageOfLevels(root: TreeNode | null): number[] {\n    const queue: Array<TreeNode | null> = [root];\n    const averages: number[] = [];\n\n    while (queue.length > 0) {\n        const levelSize: number = queue.length;\n        let sum: number = 0;\n\n        for (let i = 0; i < levelSize; i++) {\n            const currentNode = queue.shift();\n            if (currentNode) {\n                sum += currentNode.val;\n\n                if (currentNode.left) {\n                    queue.push(currentNode.left);\n                }\n\n                if (currentNode.right) {\n                    queue.push(currentNode.right);\n                }\n            }\n        }\n\n        averages.push(sum / levelSize);\n    }\n\n    return averages;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/binary-tree-level-order-traversal-ii',
      title: 'Binary Tree Level Order Traversal II',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Perform a level-order traversal on a binary tree, returning the nodes at each level in a list, from left to right and top to bottom.',
      answer:
        '```typescript\n/**\n * Definition for a binary tree node.\n * class TreeNode {\n *     val: number\n *     left: TreeNode | null\n *     right: TreeNode | null\n *     constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n *         this.val = (val===undefined ? 0 : val)\n *         this.left = (left===undefined ? null : left)\n *         this.right = (right===undefined ? null : right)\n *     }\n * }\n */\n\nfunction levelOrderBottom(root: TreeNode | null): number[][] {\n    const ans: number[][] = [];\n    if (!root) {\n        return ans;\n    }\n    const q: TreeNode[] = [root];\n    while (q.length) {\n        const t: number[] = [];\n        const qq: TreeNode[] = [];\n        for (const { val, left, right } of q) {\n            t.push(val);\n            left && qq.push(left);\n            right && qq.push(right);\n        }\n        ans.push(t);\n        q.splice(0, q.length, ...qq);\n    }\n    return ans.reverse();\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/binary-tree-zigzag-level-order-traversal',
      title: 'Binary Tree Zigzag Level Order Traversal',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given a binary tree, traverse its nodes in a zigzag level order traversal pattern, alternating the order of traversal between left-to-right and right-to-left within each level of the tree.',
      answer:
        '```typescript\n/**\n * Definition for a binary tree node.\n * class TreeNode {\n *     val: number\n *     left: TreeNode | null\n *     right: TreeNode | null\n *     constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n *         this.val = (val===undefined ? 0 : val)\n *         this.left = (left===undefined ? null : left)\n *         this.right = (right===undefined ? null : right)\n *     }\n * }\n */\n\nfunction zigzagLevelOrder(root: TreeNode | null): number[][] {\n    const ans: number[][] = [];\n    if (!root) {\n        return ans;\n    }\n    const q: TreeNode[] = [root];\n    let left: number = 1;\n    while (q.length) {\n        const t: number[] = [];\n        const qq: TreeNode[] = [];\n        for (const { val, left, right } of q) {\n            t.push(val);\n            left && qq.push(left);\n            right && qq.push(right);\n        }\n        ans.push(left ? t : t.reverse());\n        q.splice(0, q.length, ...qq);\n        left ^= 1;\n    }\n    return ans;\n}\n```',
    },
  ],
  treeDFS: [
    {
      href: 'https://leetcode.com/problems/path-sum',
      title: 'Path Sum',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'The goal is to write a program that determines whether a path from the root of a binary tree adds up to a target sum, using recursion and/or dynamic programming.',
      answer:
        '```typescript\n/**\n * Definition for a binary tree node.\n * class TreeNode {\n *     val: number\n *     left: TreeNode | null\n *     right: TreeNode | null\n *     constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n *         this.val = (val===undefined ? 0 : val)\n *         this.left = (left===undefined ? null : left)\n *         this.right = (right===undefined ? null : right)\n *     }\n * }\n */\n\nfunction hasPathSum(root: TreeNode | null, targetSum: number): boolean {\n    if (root === null) {\n        return false;\n    }\n    const { val, left, right } = root;\n    if (left === null && right === null) {\n        return targetSum - val === 0;\n    }\n    return hasPathSum(left, targetSum - val) || hasPathSum(right, targetSum - val);\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/validate-binary-search-tree',
      title: 'Validate Binary Search Tree',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Determine whether a given binary search tree is valid, ensuring that all node values are within the correct range relative to its left and right subtrees.',
      answer:
        '```typescript\n/**\n * Definition for a binary tree node.\n * class TreeNode {\n *     val: number\n *     left: TreeNode | null\n *     right: TreeNode | null\n *     constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n *         this.val = (val===undefined ? 0 : val)\n *         this.left = (left===undefined ? null : left)\n *         this.right = (right===undefined ? null : right)\n *     }\n * }\n */\n\nfunction isValidBST(root: TreeNode | null): boolean {\n    let prev: TreeNode | null = null;\n    const dfs = (root: TreeNode | null): boolean => {\n        if (!root) {\n            return true;\n        }\n        if (!dfs(root.left)) {\n            return false;\n        }\n        if (prev && prev.val >= root.val) {\n            return false;\n        }\n        prev = root;\n        return dfs(root.right);\n    };\n    return dfs(root);\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/binary-tree-maximum-path-sum',
      title: 'Maximum Path Sum',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Find the maximum sum that can be obtained by taking a path through an array of integers, where each step is either up or down, without going below zero.',
      answer:
        '```typescript\n/**\n * Definition for a binary tree node.\n * class TreeNode {\n *     val: number\n *     left: TreeNode | null\n *     right: TreeNode | null\n *     constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n *         this.val = (val===undefined ? 0 : val)\n *         this.left = (left===undefined ? null : left)\n *         this.right = (right===undefined ? null : right)\n *     }\n * }\n */\n\nfunction maxPathSum(root: TreeNode | null): number {\n    let ans = -1001;\n    const dfs = (root: TreeNode | null): number => {\n        if (!root) {\n            return 0;\n        }\n        const left = Math.max(0, dfs(root.left));\n        const right = Math.max(0, dfs(root.right));\n        ans = Math.max(ans, left + right + root.val);\n        return Math.max(left, right) + root.val;\n    };\n    dfs(root);\n    return ans;\n}\n```',
    },
  ],
  twoHeaps: [
    {
      href: 'https://leetcode.com/problems/find-right-interval',
      title: 'Find Right Interval',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'The task is to develop an algorithm that determines the range of values within a sorted array that corresponds to a specific target value, identifying all intervals where the target falls between two existing numbers in the array.',
      answer:
        '```typescript\nfunction findRightInterval(intervals: number[][]): number[] {\n    const n = intervals.length;\n    const arr: number[][] = Array.from({ length: n }, (_, i) => [intervals[i][0], i]);\n    arr.sort((a, b) => a[0] - b[0]);\n    return intervals.map(([_, ed]) => {\n        let [l, r] = [0, n];\n        while (l < r) {\n            const mid = (l + r) >> 1;\n            if (arr[mid][0] >= ed) {\n                r = mid;\n            } else {\n                l = mid + 1;\n            }\n        }\n        return l < n ? arr[l][1] : -1;\n    });\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/find-median-from-data-stream',
      title: 'Find Median from Data Stream',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Write an algorithm to efficiently calculate the median of a continuously streaming sequence of numbers, allowing for insertions and deletions while maintaining an accurate median value.',
      answer:
        '```typescript\nclass MedianFinder {\n    private small: number[];\n    private large: number[];\n\n    constructor() {\n        this.small = [];\n        this.large = [];\n    }\n\n    addNum(num: number): void {\n        this.heappush(this.small, -num);\n        \n        this.heappush(this.large, -this.heappop(this.small));\n\n        if (this.large.length > this.small.length) {\n            this.heappush(this.small, -this.heappop(this.large));\n        }\n    }\n\n    findMedian(): number {\n        if (this.small.length > this.large.length) {\n            return -this.small[0];\n        } else if (this.small.length === this.large.length) {\n            return (-this.small[0] + this.large[0]) / 2;\n        } else {\n            return this.large[0];\n        }\n    }\n\n    private heappush(heap: number[], val: number): void {\n        heap.push(val);\n        heap.sort((a, b) => a - b);\n    }\n\n    private heappop(heap: number[]): number {\n        return heap.shift()!;\n    }\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/sliding-window-median',
      title: 'Sliding Window Median',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'The goal is to find the median of all elements in an array that are within a certain sliding window, given a set of integers and a target window size.',
      answer:
        '```typescript\nfunction medianSlidingWindow(nums: number[], k: number): number[] {\n    const medians: number[] = [];\n    \n    let window: number[] = [];\n    \n    for (let i: number = 0; i + k <= nums.length; i++) {\n        if (i === 0) {\n            window = nums.slice(0, k);\n            window.sort((a: number, b: number) => a - b);\n            medians.push(getMedianFromWin(window, k));\n        }\n        else {\n            window.splice(window.indexOf(nums[i - 1]), 1);\n            const toAdd: number = nums[i + k - 1];\n            let j: number = 0;\n            for (; j < window.length; j++) {\n                if (window[j] >= toAdd) {\n                    break;\n                }\n            }\n            window.splice(j, 0, toAdd);\n            medians.push(getMedianFromWin(window, k));\n        }\n    }\n    \n    return medians;\n};\n\nfunction getMedianFromWin(win: number[], k: number): number {\n    if (k & 1) {\n        return win[k >> 1];\n    }\n    else {\n        return (win[(k >> 1) - 1] + win[k >> 1]) / 2;\n    }\n}\n```',
    },
  ],
  subsets: [
    {
      href: 'https://leetcode.com/problems/subsets-ii',
      title: 'Subsets II',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Find all unique subsets of a given set of integers, where each subset must be in lexicographical order and not contain duplicate elements.',
      answer:
        '```typescript\nfunction subsetsWithDup(nums: number[]): number[][] {\n    nums.sort((a, b) => a - b);\n    const n = nums.length;\n    const ans: number[][] = [];\n    for (let mask = 0; mask < 1 << n; ++mask) {\n        const t: number[] = [];\n        let ok: boolean = true;\n        for (let i = 0; i < n; ++i) {\n            if (((mask >> i) & 1) === 1) {\n                if (i && ((mask >> (i - 1)) & 1) === 0 && nums[i] === nums[i - 1]) {\n                    ok = false;\n                    break;\n                }\n                t.push(nums[i]);\n            }\n        }\n        if (ok) {\n            ans.push(t);\n        }\n    }\n    return ans;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/letter-case-permutation',
      title: 'Letter Case Permutation',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Write a program that generates all possible letter case permutations for a given string, where each character can be either uppercase or lowercase.',
      answer:
        "```typescript\nfunction letterCasePermutation(s: string): string[] {\n    const n = s.length;\n    const cs = [...s];\n    const res = [];\n    const dfs = (i: number) => {\n        if (i === n) {\n            res.push(cs.join(''));\n            return;\n        }\n        dfs(i + 1);\n        if (cs[i] >= 'A') {\n            cs[i] = String.fromCharCode(cs[i].charCodeAt(0) ^ 32);\n            dfs(i + 1);\n        }\n    };\n    dfs(0);\n    return res;\n}\n```",
    },
    {
      href: 'https://leetcode.com/problems/combination-sum-ii',
      title: 'Combination Sum II',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given an array of integers and a target sum, find all unique combinations of the integers that add up to the target sum, with each integer only used once in each combination.',
      answer:
        '```typescript\nfunction combinationSum2(candidates: number[], target: number): number[][] {\n    candidates.sort((a, b) => a - b);\n    const ans: number[][] = [];\n    const t: number[] = [];\n    const dfs = (i: number, s: number) => {\n        if (s === 0) {\n            ans.push(t.slice());\n            return;\n        }\n        if (i >= candidates.length || s < candidates[i]) {\n            return;\n        }\n        const x = candidates[i];\n        t.push(x);\n        dfs(i + 1, s - x);\n        t.pop();\n        while (i < candidates.length && candidates[i] === x) {\n            ++i;\n        }\n        dfs(i, s);\n    };\n    dfs(0, target);\n    return ans;\n}\n```',
    },
  ],
  binarySearch: [
    {
      href: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array',
      title: 'Find Minimum in Rotated Sorted Array',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given a sorted array that has been rotated an unknown number of times, find the minimum element in the array.',
      answer:
        '```typescript\nfunction findMin(nums: number[]): number {\n    let left = 0;\n    let right = nums.length - 1;\n    while (left < right) {\n        const mid = (left + right) >>> 1;\n        if (nums[mid] > nums[right]) {\n            left = mid + 1;\n        } else {\n            right = mid;\n        }\n    }\n    return nums[left];\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/find-peak-element',
      title: 'Find Peak Element',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Determine the maximum element in an array and verify that it is indeed the peak by checking both its left and right elements, ensuring the maximum element is not part of a larger peak sequence.',
      answer:
        '```typescript\nfunction findPeakElement(nums: number[]): number {\n    let [left, right] = [0, nums.length - 1];\n    while (left < right) {\n        const mid = (left + right) >> 1;\n        if (nums[mid] > nums[mid + 1]) {\n            right = mid;\n        } else {\n            left = mid + 1;\n        }\n    }\n    return left;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/split-array-largest-sum',
      title: 'Split Array Largest Sum',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Divide an array into segments and determine the segment arrangement that yields the largest possible sum while ensuring all numbers are used exactly once.',
      answer:
        '```typescript\nfunction splitArray(nums: number[], k: number): number {\n    let l = Math.max(...nums);\n    let r = nums.reduce((a, b) => a + b);\n\n    const check = (mx: number) => {\n        let [s, cnt] = [0, 0];\n        for (const x of nums) {\n            s += x;\n            if (s > mx) {\n                s = x;\n                if (++cnt === k) return false;\n            }\n        }\n        return true;\n    };\n\n    while (l < r) {\n        const mid = (l + r) >> 1;\n        if (check(mid)) {\n            r = mid;\n        } else {\n            l = mid + 1;\n        }\n    }\n    return l;\n}\n```',
    },
  ],
  topKElements: [
    {
      href: 'https://leetcode.com/problems/kth-largest-element-in-a-stream',
      title: 'Kth Largest Element in a Stream',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Design an algorithm to efficiently determine the kth largest element from a constantly changing stream of numbers.',
      answer:
        '```typescript\ntype ComparatorFunction = (a: number, b: number) => number;\n\nlet kthLargestSize: number;\nlet minHeap: MinHeap;\n\ninterface MinHeap {\n    data: number[];\n    comparator: ComparatorFunction;\n    heapify: () => void;\n    peek: () => number | null;\n    offer: (value: number) => void;\n    poll: () => number | null;\n    bubbleUp: (index: number) => void;\n    bubbleDown: (index: number) => void;\n    swap: (index1: number, index2: number) => void;\n    size: () => number;\n}\n\nfunction KthLargestInit(k: number, nums: number[]): void {\n    kthLargestSize = k;\n    minHeap = createMinHeap();\n    nums.forEach(num => {\n        kthLargestAdd(num);\n    });\n}\n\nfunction kthLargestAdd(val: number): number {\n    minHeap.offer(val);\n    if (minHeap.size() > kthLargestSize) {\n        minHeap.poll();\n    }\n    return minHeap.peek()!;\n}\n\nfunction createMinHeap(): MinHeap {\n    const heap: MinHeap = {\n        data: [],\n        comparator: (a, b) => a - b,\n        heapify() {\n            if (this.size() < 2) return;\n            for (let i = 1; i < this.size(); i++) {\n                this.bubbleUp(i);\n            }\n        },\n        peek() {\n            return this.size() === 0 ? null : this.data[0];\n        },\n        offer(value) {\n            this.data.push(value);\n            this.bubbleUp(this.size() - 1);\n        },\n        poll() {\n            if (this.size() === 0) {\n                return null;\n            }\n            const result = this.data[0];\n            const last = this.data.pop();\n            if (this.size() !== 0) {\n                this.data[0] = last!;\n                this.bubbleDown(0);\n            }\n            return result;\n        },\n        bubbleUp(index) {\n            while (index > 0) {\n                const parentIndex = (index - 1) >> 1;\n                if (this.comparator(this.data[index], this.data[parentIndex]) < 0) {\n                    this.swap(index, parentIndex);\n                    index = parentIndex;\n                } else {\n                    break;\n                }\n            }\n        },\n        bubbleDown(index) {\n            const lastIndex = this.size() - 1;\n            while (true) {\n                let findIndex = index;\n                const leftIndex = index * 2 + 1;\n                const rightIndex = index * 2 + 2;\n                if (\n                    leftIndex <= lastIndex &&\n                    this.comparator(this.data[leftIndex], this.data[findIndex]) < 0\n                ) {\n                    findIndex = leftIndex;\n                }\n                if (\n                    rightIndex <= lastIndex &&\n                    this.comparator(this.data[rightIndex], this.data[findIndex]) < 0\n                ) {\n                    findIndex = rightIndex;\n                }\n                if (index !== findIndex) {\n                    this.swap(index, findIndex);\n                    index = findIndex;\n                } else {\n                    break;\n                }\n            }\n        },\n        swap(index1, index2) {\n            [this.data[index1], this.data[index2]] = [this.data[index2], this.data[index1]];\n        },\n        size() {\n            return this.data.length;\n        }\n    };\n\n    heap.heapify();\n    return heap;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/top-k-frequent-elements',
      title: 'Top K Frequent Elements',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Find the top K elements with the highest frequency in a given array of integers, ranked from most frequent to least.',
      answer:
        '```typescript\nfunction topKFrequent(nums: number[], k: number): number[] {\n    const cnt = new Map<number, number>();\n    for (const x of nums) {\n        cnt.set(x, (cnt.get(x) ?? 0) + 1);\n    }\n    const pq = new MinPriorityQueue();\n    for (const [x, c] of cnt) {\n        pq.enqueue(x, c);\n        if (pq.size() > k) {\n            pq.dequeue();\n        }\n    }\n    return pq.toArray().map(x => x.element);\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix',
      title: 'Kth Smallest Element in a Sorted Matrix',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given a sorted matrix and a target k, find the kth smallest element within the matrix.',
      answer:
        '```typescript\ntype Matrix = number[][];\n\nfunction kthSmallest(matrix: Matrix, k: number): number {\n    const n = matrix.length;\n    let left = matrix[0][0];\n    let right = matrix[n - 1][n - 1];\n\n    while (left < right) {\n        const mid = left + Math.floor((right - left) / 2);\n        \n        if (check(matrix, mid, k, n)) {\n            right = mid;\n        } else {\n            left = mid + 1;\n        }\n    }\n    \n    return left;\n}\n\nfunction check(matrix: Matrix, mid: number, k: number, n: number): boolean {\n    let count = 0;\n    let i = n - 1;\n    let j = 0;\n\n    while (i >= 0 && j < n) {\n        if (matrix[i][j] <= mid) {\n            count += (i + 1);\n            ++j;\n        } else {\n            --i;\n        }\n    }\n    \n    return count >= k;\n}\n```',
    },
  ],
  kWayMerge: [
    {
      href: 'https://leetcode.com/problems/find-k-pairs-with-smallest-sums',
      title: 'Find K Pairs with Smallest Sums',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given an array and an integer k, find the number of pairs in the array that have the smallest sum.',
      answer:
        "```typescript\nimport { PriorityQueue } from 'typescript-collections';\n\ntype IndexPair = [number, number];\n\nfunction comparePairs(nums1: number[], nums2: number[], a: IndexPair, b: IndexPair): boolean {\n    return nums1[a[0]] + nums2[a[1]] > nums1[b[0]] + nums2[b[1]];\n}\n\nfunction kSmallestPairs(nums1: number[], nums2: number[], k: number): number[][] {\n    const size1 = nums1.length;\n    const size2 = nums2.length;\n\n    const result: number[][] = [];\n\n    const minHeap = new PriorityQueue<IndexPair>((a, b) => comparePairs(nums1, nums2, a, b));\n\n    for (let i = 0; i < Math.min(k, size1); i++) {\n        minHeap.enqueue([i, 0]);\n    }\n\n    while (k > 0 && !minHeap.isEmpty()) {\n        const [index1, index2] = minHeap.dequeue()!;\n\n        result.push([nums1[index1], nums2[index2]]);\n\n        if (index2 + 1 < size2) {\n            minHeap.enqueue([index1, index2 + 1]);\n        }\n\n        k--;\n    }\n\n    return result;\n}\n```",
    },
    {
      href: 'https://leetcode.com/problems/merge-k-sorted-lists',
      title: 'Merge k Sorted Lists',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Combine multiple sorted lists into a single sorted list, efficiently merging and ordering elements from each input list in O(n log k) time complexity.',
      answer:
        '```typescript\n/**\n * Definition for singly-linked list.\n * class ListNode {\n *     val: number\n *     next: ListNode | null\n *     constructor(val?: number, next?: ListNode | null) {\n *         this.val = (val===undefined ? 0 : val)\n *         this.next = (next===undefined ? null : next)\n *     }\n * }\n */\n\nfunction mergeKLists(lists: Array<ListNode | null>): ListNode | null {\n    const pq = new MinPriorityQueue({ priority: (node: ListNode) => node.val });\n    for (const head of lists) {\n        if (head) {\n            pq.enqueue(head);\n        }\n    }\n    const dummy: ListNode = new ListNode();\n    let cur: ListNode = dummy;\n    while (!pq.isEmpty()) {\n        const node = pq.dequeue().element;\n        cur.next = node;\n        cur = cur.next;\n        if (node.next) {\n            pq.enqueue(node.next);\n        }\n    }\n    return dummy.next;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/smallest-range-covering-elements-from-k-lists',
      title: 'Smallest Range Covering Elements from K Lists',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Given k sorted lists, find the smallest range that covers all elements across these lists.',
      answer:
        '```typescript\nconst smallestRange = (nums: number[][]): number[] => {\n    const pq = new MinPriorityQueue<[number, number, number]>({ priority: ([x]) => x });\n    const n = nums.length;\n    let [l, r, max] = [0, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];\n\n    for (let j = 0; j < n; j++) {\n        const x = nums[j][0];\n        pq.enqueue([x, j, 0]);\n        max = Math.max(max, x);\n    }\n\n    while (pq.size() === n) {\n        const [min, j, i] = pq.dequeue().element;\n\n        if (max - min < r - l) {\n            [l, r] = [min, max];\n        }\n\n        const iNext = i + 1;\n        if (iNext < nums[j].length) {\n            const next = nums[j][iNext];\n            pq.enqueue([next, j, iNext]);\n            max = Math.max(max, next);\n        }\n    }\n\n    return [l, r];\n};\n```',
    },
  ],
  graphBFS: [
    {
      href: 'https://leetcode.com/problems/shortest-path-in-binary-matrix',
      title: 'Shortest Path in Binary Matrix',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Find the shortest path between two points in a binary matrix, where each cell represents a value of either 0 or 1, and movement is restricted to adjacent cells.',
      answer:
        '```typescript\nfunction shortestPathBinaryMatrix(grid: number[][]): number {\n    if (grid[0][0]) {\n        return -1;\n    }\n    const max = grid.length - 1;\n    grid[0][0] = 1;\n    let q: number[][] = [[0, 0]];\n    for (let ans = 1; q.length > 0; ++ans) {\n        const nq: number[][] = [];\n        for (const [i, j] of q) {\n            if (i === max && j === max) {\n                return ans;\n            }\n            for (let x = i - 1; x <= i + 1; ++x) {\n                for (let y = j - 1; y <= j + 1; ++y) {\n                    if (grid[x]?.[y] === 0) {\n                        grid[x][y] = 1;\n                        nq.push([x, y]);\n                    }\n                }\n            }\n        }\n        q = nq;\n    }\n    return -1;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/minimum-knight-moves',
      title: 'Minimum Knight Moves',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        "Given the coordinates of a knight's position on a chessboard, determine the minimum number of moves required to reach a specific target position using valid knight movements (two squares in one direction, then one square to the side).",
      answer:
        '```typescript\ntype Point = [number, number];\n\nconst OFFSET = 310;\nconst BOARD_SIZE = 700;\n\nlet visited: boolean[][] = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false));\n\nconst directions: Point[] = [\n    [-2, 1], [-1, 2], [1, 2], [2, 1],\n    [2, -1], [1, -2], [-1, -2], [-2, -1],\n];\n\nfunction minKnightMoves(x: number, y: number): number {\n    x += OFFSET;\n    y += OFFSET;\n\n    let minMoves: number = 0;\n    const queue: Point[] = [[OFFSET, OFFSET]];\n    visited[OFFSET][OFFSET] = true;\n\n    while (queue.length > 0) {\n        const levelSize: number = queue.length;\n\n        for (let i = 0; i < levelSize; i++) {\n            const current: Point = queue.shift()!;\n\n            if (current[0] === x && current[1] === y) {\n                return minMoves;\n            }\n\n            directions.forEach(direction => {\n                const nextRow: number = current[0] + direction[0];\n                const nextCol: number = current[1] + direction[1];\n\n                if (nextRow >= 0 && nextRow < BOARD_SIZE && nextCol >= 0 && nextCol < BOARD_SIZE && !visited[nextRow][nextCol]) {\n                    visited[nextRow][nextCol] = true;\n                    queue.push([nextRow, nextCol]);\n                }\n            });\n        }\n        \n        minMoves++;\n    }\n\n    return -1;\n}\n\nfunction resetVisited(): void {\n    visited = visited.map(row => row.fill(false));\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/open-the-lock',
      title: 'Open the Lock',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'In this problem, you need to determine the minimum number of characters that need to be added or removed from a given set of letters to form a new sequence where two adjacent numbers differ by at most 1.',
      answer:
        '```typescript\nfunction openLock(deadends: string[], target: string): number {\n    const vis = Array<boolean>(10_000);\n    const q = [[0, 0, 0, 0, 0]];\n    const t = +target;\n    deadends.forEach(s => (vis[+s] = true));\n\n    for (const [a, b, c, d, ans] of q) {\n        const key = a * 1000 + b * 100 + c * 10 + d;\n        if (vis[key]) {\n            continue;\n        }\n\n        vis[key] = true;\n        if (key === t) {\n            return ans;\n        }\n\n        for (let i = 0; i < 4; i++) {\n            const next = [a, b, c, d, ans + 1];\n            const prev = [a, b, c, d, ans + 1];\n            next[i] = (next[i] + 11) % 10;\n            prev[i] = (prev[i] + 9) % 10;\n            q.push(prev, next);\n        }\n    }\n\n    return -1;\n}\n```',
    },
  ],
  graphDFS: [
    {
      href: 'https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph',
      title: 'Number of Connected Components in an Undirected Graph',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'The goal is to write a program that determines the number of separate subgraphs or "connected components" within an undirected graph represented as an adjacency list.',
      answer:
        '```typescript\nfunction countComponents(n: number, edges: number[][]): number {\n    const g: Map<number, number[]> = new Map(Array.from({ length: n }, (_, i) => [i, []]));\n    for (const [a, b] of edges) {\n        g.get(a)!.push(b);\n        g.get(b)!.push(a);\n    }\n\n    const vis = new Set<number>();\n    let ans = 0;\n    for (const [i] of g) {\n        if (vis.has(i)) {\n            continue;\n        }\n        const q = [i];\n        for (const j of q) {\n            if (vis.has(j)) {\n                continue;\n            }\n            vis.add(j);\n            q.push(...g.get(j)!);\n        }\n        ans++;\n    }\n    return ans;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/course-schedule',
      title: 'Course Schedule',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given a list of course prerequisites, determine the order in which a student can take the courses to avoid conflicts.',
      answer:
        '```typescript\nfunction canFinish(numCourses: number, prerequisites: number[][]): boolean {\n    const g: number[][] = new Array(numCourses).fill(0).map(() => []);\n    const indeg: number[] = new Array(numCourses).fill(0);\n    for (const [a, b] of prerequisites) {\n        g[b].push(a);\n        indeg[a]++;\n    }\n    const q: number[] = [];\n    for (let i = 0; i < numCourses; ++i) {\n        if (indeg[i] == 0) {\n            q.push(i);\n        }\n    }\n    let cnt = 0;\n    while (q.length) {\n        const i = q.shift()!;\n        cnt++;\n        for (const j of g[i]) {\n            if (--indeg[j] == 0) {\n                q.push(j);\n            }\n        }\n    }\n    return cnt == numCourses;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/graph-valid-tree',
      title: 'Graph Valid Tree',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'This problem involves determining whether a given directed or undirected graph with multiple nodes and edges is valid by checking if its number of edges matches the maximum possible number for the same number of nodes in a tree structure.',
      answer:
        '```typescript\nconst validTree = (numberOfNodes: number, graphEdges: number[][]): boolean => {\n    const parent: number[] = new Array(numberOfNodes);\n\n    for (let i = 0; i < numberOfNodes; ++i) {\n        parent[i] = i;\n    }\n\n    const findRootParent = (node: number): number => {\n        if (parent[node] !== node) {\n            parent[node] = findRootParent(parent[node]);\n        }\n        return parent[node];\n    };\n\n    for (const [nodeA, nodeB] of graphEdges) {\n        if (findRootParent(nodeA) === findRootParent(nodeB)) {\n            return false;\n        }\n        parent[findRootParent(nodeA)] = findRootParent(nodeB);\n        --numberOfNodes;\n    }\n\n    return numberOfNodes === 1;\n};\n```',
    },
  ],
  topologicalSort: [
    {
      href: 'https://leetcode.com/problems/course-schedule-ii',
      title: 'Course Schedule II',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'A program is required to determine the order in which courses must be taken within a semester given a set of prerequisite course constraints, ensuring that all prerequisites are met before taking each subsequent course.',
      answer:
        '```typescript\nfunction findOrder(numCourses: number, prerequisites: number[][]): number[] {\n    const g: number[][] = Array.from({ length: numCourses }, () => []);\n    const indeg: number[] = new Array(numCourses).fill(0);\n    for (const [a, b] of prerequisites) {\n        g[b].push(a);\n        indeg[a]++;\n    }\n    const q: number[] = [];\n    for (let i = 0; i < numCourses; ++i) {\n        if (indeg[i] === 0) {\n            q.push(i);\n        }\n    }\n    const ans: number[] = [];\n    while (q.length) {\n        const i = q.shift()!;\n        ans.push(i);\n        for (const j of g[i]) {\n            if (--indeg[j] === 0) {\n                q.push(j);\n            }\n        }\n    }\n    return ans.length === numCourses ? ans : [];\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/minimum-height-trees',
      title: 'Minimum Height Trees',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given an undirected graph, find the minimum height trees that can be formed from a given set of nodes, with all other nodes removed as the only option for each node in the tree.',
      answer:
        '```typescript\nfunction findMinHeightTrees(n: number, edges: number[][]): number[] {\n    if (n === 1) {\n        return [0];\n    }\n    const g: number[][] = Array.from({ length: n }, () => []);\n    const degree: number[] = Array(n).fill(0);\n    for (const [a, b] of edges) {\n        g[a].push(b);\n        g[b].push(a);\n        ++degree[a];\n        ++degree[b];\n    }\n    const q: number[] = [];\n    for (let i = 0; i < n; ++i) {\n        if (degree[i] === 1) {\n            q.push(i);\n        }\n    }\n    const ans: number[] = [];\n    while (q.length > 0) {\n        ans.length = 0;\n        const t: number[] = [];\n        for (const a of q) {\n            ans.push(a);\n            for (const b of g[a]) {\n                if (--degree[b] === 1) {\n                    t.push(b);\n                }\n            }\n        }\n        q.splice(0, q.length, ...t);\n    }\n    return ans;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/alien-dictionary',
      title: 'Alien Dictionary',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        "Create an algorithm to arrange words in the correct order based on their given alphabet, such as 'w' comes before 'z' in the alien dictionary.",
      answer:
        '```typescript\nfunction minimumCost(n: number, connections: number[][]): number {\n    const p: number[] = Array.from({ length: n }, (_, i) => i);\n    const find = (x: number): number => {\n        if (p[x] !== x) {\n            p[x] = find(p[x]);\n        }\n        return p[x];\n    };\n    connections.sort((a, b) => a[2] - b[2]);\n    let ans = 0;\n    for (const [x, y, cost] of connections) {\n        if (find(x - 1) === find(y - 1)) {\n            continue;\n        }\n        p[find(x - 1)] = find(y - 1);\n        ans += cost;\n        if (--n === 1) {\n            return ans;\n        }\n    }\n    return -1;\n}\n```',
    },
  ],
  matrixTraversal: [
    {
      href: 'https://leetcode.com/problems/spiral-matrix',
      title: 'Spiral Matrix',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Write an algorithm that traverses and prints all elements in a square matrix in a spiral order, starting from the outermost layer and moving inwards.',
      answer:
        '```typescript\nfunction spiralOrder(matrix: number[][]): number[] {\n    const m = matrix.length;\n    const n = matrix[0].length;\n    let x1 = 0;\n    let y1 = 0;\n    let x2 = m - 1;\n    let y2 = n - 1;\n    const ans: number[] = [];\n    while (x1 <= x2 && y1 <= y2) {\n        for (let j = y1; j <= y2; ++j) {\n            ans.push(matrix[x1][j]);\n        }\n        for (let i = x1 + 1; i <= x2; ++i) {\n            ans.push(matrix[i][y2]);\n        }\n        if (x1 < x2 && y1 < y2) {\n            for (let j = y2 - 1; j >= y1; --j) {\n                ans.push(matrix[x2][j]);\n            }\n            for (let i = x2 - 1; i > x1; --i) {\n                ans.push(matrix[i][y1]);\n            }\n        }\n        ++x1;\n        ++y1;\n        --x2;\n        --y2;\n    }\n    return ans;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/set-matrix-zeroes',
      title: 'Set Matrix Zeroes',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given a matrix, modify the elements in such a way that the rows or columns containing zero become completely zeroed out.',
      answer:
        '```typescript\n/**\n Do not return anything, modify matrix in-place instead.\n */\nfunction setZeroes(matrix: number[][]): void {\n    const m = matrix.length;\n    const n = matrix[0].length;\n    const i0 = matrix[0].includes(0);\n    const j0 = matrix.map(row => row[0]).includes(0);\n    for (let i = 1; i < m; ++i) {\n        for (let j = 1; j < n; ++j) {\n            if (matrix[i][j] === 0) {\n                matrix[i][0] = 0;\n                matrix[0][j] = 0;\n            }\n        }\n    }\n    for (let i = 1; i < m; ++i) {\n        for (let j = 1; j < n; ++j) {\n            if (matrix[i][0] === 0 || matrix[0][j] === 0) {\n                matrix[i][j] = 0;\n            }\n        }\n    }\n    if (i0) {\n        matrix[0].fill(0);\n    }\n    if (j0) {\n        for (let i = 0; i < m; ++i) {\n            matrix[i][0] = 0;\n        }\n    }\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/diagonal-traverse',
      title: 'Diagonal Traverse',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Write an efficient algorithm to traverse all elements in a square grid, starting from the top-left corner and moving diagonally down and right, visiting each cell exactly once.',
      answer:
        '```typescript\nfunction findDiagonalOrder(mat: number[][]): number[] {\n    const res = [];\n    const m = mat.length;\n    const n = mat[0].length;\n    let i = 0;\n    let j = 0;\n    let mark = true;\n    while (res.length !== n * m) {\n        if (mark) {\n            while (i >= 0 && j < n) {\n                res.push(mat[i][j]);\n                i--;\n                j++;\n            }\n            if (j === n) {\n                j--;\n                i++;\n            }\n            i++;\n        } else {\n            while (i < m && j >= 0) {\n                res.push(mat[i][j]);\n                i++;\n                j--;\n            }\n            if (i === m) {\n                i--;\n                j++;\n            }\n            j++;\n        }\n        mark = !mark;\n    }\n    return res;\n}\n```',
    },
  ],
  palindromicSubsequence: [
    {
      href: 'https://leetcode.com/problems/longest-palindromic-subsequence',
      title: 'Longest Palindromic Subsequence',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Find the longest subsequence within a given string that reads the same backward as forward.',
      answer:
        '```typescript\nfunction longestPalindromeSubseq(s: string): number {\n    const n = s.length;\n    const f: number[][] = Array.from({ length: n }, () => Array(n).fill(0));\n    for (let i = 0; i < n; ++i) {\n        f[i][i] = 1;\n    }\n    for (let i = n - 2; ~i; --i) {\n        for (let j = i + 1; j < n; ++j) {\n            if (s[i] === s[j]) {\n                f[i][j] = f[i + 1][j - 1] + 2;\n            } else {\n                f[i][j] = Math.max(f[i + 1][j], f[i][j - 1]);\n            }\n        }\n    }\n    return f[0][n - 1];\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/palindromic-substrings',
      title: 'Palindromic Substrings',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'This challenge involves finding all possible substrings within a given string that read the same backward as forward, also known as palindromes.',
      answer:
        '```typescript\nfunction countSubstrings(str: string): number {\n    let count: number = 0;\n    const length: number = str.length;\n\n    for (let center = 0; center < length * 2 - 1; ++center) {\n        let left: number = center >> 1;\n        let right: number = (center + 1) >> 1;\n\n        while (left >= 0 && right < length && str[left] == str[right]) {\n            ++count;\n            \n            --left;\n            ++right;\n        }\n    }\n    return count;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/count-different-palindromic-subsequences',
      title: 'Count Different Palindromic Subsequences',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'This problem asks to find the number of unique palindromic subsequences within a given string, where a palindrome is a sequence that reads the same forward and backward.',
      answer:
        '```typescript\nfunction countSubstrings(str: string): number {\n    let count: number = 0;\n    const length: number = str.length;\n\n    for (let center = 0; center < length * 2 - 1; ++center) {\n        let left: number = center >> 1;\n        let right: number = (center + 1) >> 1;\n\n        while (left >= 0 && right < length && str[left] == str[right]) {\n            ++count;\n            \n            --left;\n            ++right;\n        }\n    }\n    return count;\n}\n```',
    },
  ],
  longestCommonSubstring: [
    {
      href: 'https://leetcode.com/problems/longest-common-prefix',
      title: 'Longest Common Prefix',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Find the longest substring shared by all strings in an input array, assuming they are stored as arrays of characters.',
      answer:
        "```typescript\nfunction longestCommonPrefix(strs: string[]): string {\n    const len = strs.reduce((r, s) => Math.min(r, s.length), Infinity);\n    for (let i = len; i > 0; i--) {\n        const target = strs[0].slice(0, i);\n        if (strs.every(s => s.slice(0, i) === target)) {\n            return target;\n        }\n    }\n    return '';\n}\n```",
    },
    {
      href: 'https://leetcode.com/problems/longest-common-subsequence',
      title: 'Longest Common Subsequence',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'The goal is to find the longest sequence that appears in both two given sequences, by identifying overlapping or identical sub-sequences.',
      answer:
        '```typescript\nfunction longestCommonSubsequence(text1: string, text2: string): number {\n    const m = text1.length;\n    const n = text2.length;\n    const f = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));\n    for (let i = 1; i <= m; i++) {\n        for (let j = 1; j <= n; j++) {\n            if (text1[i - 1] === text2[j - 1]) {\n                f[i][j] = f[i - 1][j - 1] + 1;\n            } else {\n                f[i][j] = Math.max(f[i - 1][j], f[i][j - 1]);\n            }\n        }\n    }\n    return f[m][n];\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/edit-distance',
      title: 'Edit Distance',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'The goal is to develop an algorithm that calculates the minimum number of operations (insertions, deletions, and substitutions) required to transform one string into another.',
      answer:
        '```typescript\nfunction minDistance(word1: string, word2: string): number {\n    const m = word1.length;\n    const n = word2.length;\n    const f: number[][] = Array(m + 1)\n        .fill(0)\n        .map(() => Array(n + 1).fill(0));\n    for (let j = 1; j <= n; ++j) {\n        f[0][j] = j;\n    }\n    for (let i = 1; i <= m; ++i) {\n        f[i][0] = i;\n        for (let j = 1; j <= n; ++j) {\n            if (word1[i - 1] === word2[j - 1]) {\n                f[i][j] = f[i - 1][j - 1];\n            } else {\n                f[i][j] = Math.min(f[i - 1][j], f[i][j - 1], f[i - 1][j - 1]) + 1;\n            }\n        }\n    }\n    return f[m][n];\n}\n```',
    },
  ],
  recursionAndMemoization: [
    {
      href: 'https://leetcode.com/problems/climbing-stairs',
      title: 'Climbing Stairs',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.EASY,
      question:
        'You need to find the number of unique paths that can be taken on a staircase with n steps, where at each step you can either take 1 or 2 steps forward.',
      answer:
        '```typescript\nfunction climbStairs(n: number): number {\n    const a = [\n        [1, 1],\n        [1, 0],\n    ];\n    return pow(a, n - 1)[0][0];\n}\n\nfunction mul(a: number[][], b: number[][]): number[][] {\n    const [m, n] = [a.length, b[0].length];\n    const c = Array(m)\n        .fill(0)\n        .map(() => Array(n).fill(0));\n    for (let i = 0; i < m; ++i) {\n        for (let j = 0; j < n; ++j) {\n            for (let k = 0; k < a[0].length; ++k) {\n                c[i][j] += a[i][k] * b[k][j];\n            }\n        }\n    }\n    return c;\n}\n\nfunction pow(a: number[][], n: number): number[][] {\n    let res = [\n        [1, 1],\n        [0, 0],\n    ];\n    while (n) {\n        if (n & 1) {\n            res = mul(res, a);\n        }\n        a = mul(a, a);\n        n >>= 1;\n    }\n    return res;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/house-robber',
      title: 'House Robber',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'In the House Robber problem, you need to find the maximum amount of money that can be stolen from a row of houses while avoiding the risk of being caught by the police.',
      answer:
        '```typescript\nfunction rob(nums: number[]): number {\n    let [f, g] = [0, 0];\n    for (const x of nums) {\n        [f, g] = [Math.max(f, g), f + x];\n    }\n    return Math.max(f, g);\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/target-sum',
      title: 'Target Sum',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'In this challenge, you are tasked with finding all unique combinations of numbers in an array that sum up to a given target value, known as the "target sum."',
      answer:
        '```typescript\nfunction findTargetSumWays(nums: number[], target: number): number {\n    const s = nums.reduce((a, b) => a + b, 0);\n    if (s < target || (s - target) % 2) {\n        return 0;\n    }\n    const n = ((s - target) / 2) | 0;\n    const f = Array(n + 1).fill(0);\n    f[0] = 1;\n    for (const x of nums) {\n        for (let j = n; j >= x; j--) {\n            f[j] += f[j - x];\n        }\n    }\n    return f[n];\n}\n```',
    },
  ],
  backtracking: [
    {
      href: 'https://leetcode.com/problems/combination-sum',
      title: 'Combination Sum',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given a set of integers and a target sum, find all unique combinations of numbers that add up to the target sum without repeating any number in a combination.',
      answer:
        '```typescript\nfunction combinationSum(candidates: number[], target: number): number[][] {\n    candidates.sort((a, b) => a - b);\n    const ans: number[][] = [];\n    const t: number[] = [];\n    const dfs = (i: number, s: number) => {\n        if (s === 0) {\n            ans.push(t.slice());\n            return;\n        }\n        if (i >= candidates.length || s < candidates[i]) {\n            return;\n        }\n        dfs(i + 1, s);\n        t.push(candidates[i]);\n        dfs(i, s - candidates[i]);\n        t.pop();\n    };\n    dfs(0, target);\n    return ans;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/n-queens',
      title: 'N-Queens',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        "The N-Queens problem involves placing 'N' queens on an NxN chessboard such that no two queens attack each other, requiring a solution to be found using backtracking algorithms.",
      answer:
        "```typescript\nfunction solveNQueens(n: number): string[][] {\n    const col: number[] = Array(n).fill(0);\n    const dg: number[] = Array(n << 1).fill(0);\n    const udg: number[] = Array(n << 1).fill(0);\n    const ans: string[][] = [];\n    const t: string[][] = Array.from({ length: n }, () => Array(n).fill('.'));\n    const dfs = (i: number) => {\n        if (i === n) {\n            ans.push(t.map(x => x.join('')));\n            return;\n        }\n        for (let j = 0; j < n; ++j) {\n            if (col[j] + dg[i + j] + udg[n - i + j] === 0) {\n                t[i][j] = 'Q';\n                col[j] = dg[i + j] = udg[n - i + j] = 1;\n                dfs(i + 1);\n                col[j] = dg[i + j] = udg[n - i + j] = 0;\n                t[i][j] = '.';\n            }\n        }\n    };\n    dfs(0);\n    return ans;\n}\n```",
    },
    {
      href: 'https://leetcode.com/problems/sudoku-solver',
      title: 'Sudoku Solver',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Design an algorithm to solve a Sudoku puzzle, which is a 9x9 grid filled with numbers from 1-9, where each row, column, and 3x3 sub-grid must contain each number only once.',
      answer:
        "```typescript\nfunction solveSudoku(board: string[][]): void {\n    const rows: number[][] = Array.from({ length: 9 }, () => Array(10).fill(0));\n    const cols: number[][] = Array.from({ length: 9 }, () => Array(10).fill(0));\n    const boxes: number[][] = Array.from({ length: 9 }, () => Array(10).fill(0));\n    const emptyCells: [number, number][] = [];\n\n    // Initialize the bitmasks and collect empty cells\n    for (let r = 0; r < 9; r++) {\n        for (let c = 0; c < 9; c++) {\n            const num = board[r][c];\n            if (num === '.') {\n                emptyCells.push([r, c]);\n            } else {\n                const n = parseInt(num);\n                rows[r][n] = 1;\n                cols[c][n] = 1;\n                boxes[Math.floor(r / 3) * 3 + Math.floor(c / 3)][n] = 1;\n            }\n        }\n    }\n\n    function isValid(r: number, c: number, n: number): boolean {\n        const boxIndex = Math.floor(r / 3) * 3 + Math.floor(c / 3);\n        return rows[r][n] === 0 && cols[c][n] === 0 && boxes[boxIndex][n] === 0;\n    }\n\n    function placeNumber(r: number, c: number, n: number): void {\n        rows[r][n] = 1;\n        cols[c][n] = 1;\n        boxes[Math.floor(r / 3) * 3 + Math.floor(c / 3)][n] = 1;\n        board[r][c] = n.toString();\n    }\n\n    function removeNumber(r: number, c: number, n: number): void {\n        rows[r][n] = 0;\n        cols[c][n] = 0;\n        boxes[Math.floor(r / 3) * 3 + Math.floor(c / 3)][n] = 0;\n        board[r][c] = '.';\n    }\n\n    function backtrack(index: number): boolean {\n        if (index === emptyCells.length) return true;\n\n        const [r, c] = emptyCells[index];\n        for (let n = 1; n <= 9; n++) {\n            if (isValid(r, c, n)) {\n                placeNumber(r, c, n);\n                if (backtrack(index + 1)) return true;\n                removeNumber(r, c, n);\n            }\n        }\n        return false;\n    }\n\n    backtrack(0);\n}\n```",
    },
  ],
  greedyAlgorithms: [
    {
      href: 'https://leetcode.com/problems/jump-game',
      title: 'Jump Game',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        "Given an array of numbers representing the maximum jump distance from each position, determine if it's possible to reach the last index without ever backtracking.",
      answer:
        '```typescript\nfunction canJump(nums: number[]): boolean {\n    let mx: number = 0;\n    for (let i = 0; i < nums.length; ++i) {\n        if (mx < i) {\n            return false;\n        }\n        mx = Math.max(mx, i + nums[i]);\n    }\n    return true;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/gas-station',
      title: 'Gas Station',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Determine the minimum number of gas stations that need to be visited in order to return home, given the locations and capacities of various gas stations along a route.',
      answer:
        '```typescript\nfunction canCompleteCircuit(gas: number[], cost: number[]): number {\n    const n = gas.length;\n    let i = n - 1;\n    let j = n - 1;\n    let s = 0;\n    let cnt = 0;\n    while (cnt < n) {\n        s += gas[j] - cost[j];\n        ++cnt;\n        j = (j + 1) % n;\n        while (s < 0 && cnt < n) {\n            --i;\n            s += gas[i] - cost[i];\n            ++cnt;\n        }\n    }\n    return s < 0 ? -1 : i;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/candy',
      title: 'Candy',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Given an array of integers representing the number of candies each student received on different days, determine how many candies each student should receive at the end of the week based on their daily allocation and the total available candy.',
      answer:
        '```typescript\nfunction candy(ratings: number[]): number {\n    const n = ratings.length;\n    const left = new Array(n).fill(1);\n    const right = new Array(n).fill(1);\n    for (let i = 1; i < n; ++i) {\n        if (ratings[i] > ratings[i - 1]) {\n            left[i] = left[i - 1] + 1;\n        }\n    }\n    for (let i = n - 2; i >= 0; --i) {\n        if (ratings[i] > ratings[i + 1]) {\n            right[i] = right[i + 1] + 1;\n        }\n    }\n    let ans = 0;\n    for (let i = 0; i < n; ++i) {\n        ans += Math.max(left[i], right[i]);\n    }\n    return ans;\n}\n```',
    },
  ],
}

export const ADVANCED_TOPICS_PROBLEMS = {
  dynamicProgramming: [
    {
      href: 'https://leetcode.com/problems/minimum-path-sum',
      title: 'Minimum Path Sum',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'The goal is to find the minimum sum of weights in a path from the top-left corner to the bottom-right corner of a rectangular grid while avoiding certain obstacles.',
      answer:
        '```typescript\nfunction minPathSum(grid: number[][]): number {\n    const m = grid.length;\n    const n = grid[0].length;\n    const f: number[][] = Array(m)\n        .fill(0)\n        .map(() => Array(n).fill(0));\n    f[0][0] = grid[0][0];\n    for (let i = 1; i < m; ++i) {\n        f[i][0] = f[i - 1][0] + grid[i][0];\n    }\n    for (let j = 1; j < n; ++j) {\n        f[0][j] = f[0][j - 1] + grid[0][j];\n    }\n    for (let i = 1; i < m; ++i) {\n        for (let j = 1; j < n; ++j) {\n            f[i][j] = Math.min(f[i - 1][j], f[i][j - 1]) + grid[i][j];\n        }\n    }\n    return f[m - 1][n - 1];\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/partition-equal-subset-sum',
      title: 'Partition Equal Subset Sum',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        "The task is to determine if it's possible to partition the elements of an array into subsets that sum up to equal target values, with each subset having unique elements.",
      answer:
        '```typescript\nfunction canPartition(nums: number[]): boolean {\n    const s = nums.reduce((a, b) => a + b, 0);\n    if (s % 2 === 1) {\n        return false;\n    }\n    const m = s >> 1;\n    const f: boolean[] = Array(m + 1).fill(false);\n    f[0] = true;\n    for (const x of nums) {\n        for (let j = m; j >= x; --j) {\n            f[j] = f[j] || f[j - x];\n        }\n    }\n    return f[m];\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/burst-balloons',
      title: 'Burst Balloons',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'The goal is to find the maximum number of balloons that can be popped, given a list of balloons where each balloon has a value and two endpoints, with constraints on when a balloon can be popped after it is inflated.',
      answer:
        '```typescript\nfunction maxCoins(nums: number[]): number {\n    const n = nums.length;\n    const arr = Array(n + 2).fill(1);\n    for (let i = 0; i < n; i++) {\n        arr[i + 1] = nums[i];\n    }\n\n    const f: number[][] = Array.from({ length: n + 2 }, () => Array(n + 2).fill(0));\n    for (let i = n - 1; i >= 0; i--) {\n        for (let j = i + 2; j <= n + 1; j++) {\n            for (let k = i + 1; k < j; k++) {\n                f[i][j] = Math.max(f[i][j], f[i][k] + f[k][j] + arr[i] * arr[k] * arr[j]);\n            }\n        }\n    }\n    return f[0][n + 1];\n}\n```',
    },
  ],
  bloomFilters: [
    {
      href: 'https://leetcode.com/problems/single-number-ii',
      title: 'Single Number II',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'This problem requires finding all single numbers in an array where each number appears only once, and the remaining elements appear twice.',
      answer:
        '```typescript\nfunction singleNumber(nums) {\n    let [ans, acc] = [0, 0];\n\n    for (const x of nums) {\n        ans ^= x & ~acc;\n        acc ^= x & ~ans;\n    }\n\n    return ans;\n}\n```',
    },
  ],
  segmentTrees: [
    {
      href: 'https://leetcode.com/problems/range-sum-query-mutable',
      title: 'Range Sum Query - Mutable',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'This problem requires implementing a data structure to efficiently store and retrieve the cumulative sum of elements within a given range in an array, allowing for updates to be made and queries performed in O(1) time complexity on average.',
      answer:
        '```typescript\nclass FenwickTree {\n    private bits: number[];\n    constructor(items: number[]) {\n        this.bits = new Array(items.length).fill(0);\n        for (let i = 0; i < items.length; i++) {\n            this.update(i, items[i]);\n        }\n    }\n\n    sum(r: number) {\n        let ret = 0;\n        while (r >= 0) {\n            ret += this.bits[r];\n            r = (r & (r + 1)) - 1\n        }\n\n        return ret;\n    }\n\n    update(i: number, delta: number) {\n        while (i < this.bits.length) {\n            this.bits[i] += delta;\n            i = i | (i + 1);\n        }\n    }\n}\n\nclass NumArray {\n    private fenwickTree: FenwickTree;\n    constructor(private nums: number[]) {\n        this.fenwickTree = new FenwickTree(nums);\n    }\n\n    update(index: number, val: number): void {\n        const delta = val - this.nums[index];\n        this.nums[index] = val;\n        this.fenwickTree.update(index, delta);\n    }\n\n    sumRange(left: number, right: number): number {\n        return this.fenwickTree.sum(right) - this.fenwickTree.sum(left - 1);\n    }\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/the-skyline-problem',
      title: 'The Skyline Problem',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Given a list of buildings with their heights and starting and ending positions, determine the height of the skyline at each point in time, represented by an ordered pair of (x-coordinate, y-coordinate).',
      answer:
        '```typescript\nfunction getSkyline(buildings: number[][]): number[][] {\n    const buildingMap: Record<string, {left: number, right: number, height: number}> = {}\n    const pointToStartBuildingMap: Record<string, string[]> = {}\n    const pointToEndBuildingMap: Record<string, string[]> = {}\n    \n    const unsortedPOI: Set<number> = new Set()\n    for(const index in buildings){\n        const [left, right, height] = buildings[index]\n        buildingMap[index] = {left, right, height}\n        unsortedPOI.add(right)\n        unsortedPOI.add(left)\n\n        if(!pointToStartBuildingMap[left]){\n            pointToStartBuildingMap[left] = []\n        }\n        pointToStartBuildingMap[left].push(index)\n\n        if(!pointToEndBuildingMap[right]){\n            pointToEndBuildingMap[right] = []\n        }\n        pointToEndBuildingMap[right].push(index)\n    }\n\n    const POIs: number[] = [...unsortedPOI].sort((a,b)=>Number(a)-Number(b))\n\n    const upBuildings: Set<string> = new Set()\n    let currHeight = 0\n    const output = []\n    for(const x of POIs){\n        if(pointToStartBuildingMap[x])\n            for(const building of pointToStartBuildingMap[x]){\n                upBuildings.add(building)\n            }\n        if(pointToEndBuildingMap[x])\n            for(const building of pointToEndBuildingMap[x]){\n                upBuildings.delete(building)\n            }\n\n        let newHeight = 0\n        for(const building of upBuildings){\n            const height = buildingMap[building].height\n            if(height > newHeight)\n                newHeight = height\n        }\n        \n        if(newHeight != currHeight){\n            output.push([x, newHeight])\n            currHeight = newHeight\n        }\n    }\n    return output\n}\n```',
    },
  ],
  unionFind: [
    {
      href: 'https://leetcode.com/problems/number-of-islands',
      title: 'Number of Islands',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'The goal is to determine the number of islands in a given grid, where an island is defined as a group of adjacent cells with water (0) or land (1) that are connected by land cells.',
      answer:
        "```typescript\nfunction numIslands(grid: string[][]): number {\n    const m = grid.length;\n    const n = grid[0].length;\n    let p = [];\n    for (let i = 0; i < m * n; ++i) {\n        p.push(i);\n    }\n    function find(x) {\n        if (p[x] != x) {\n            p[x] = find(p[x]);\n        }\n        return p[x];\n    }\n    const dirs = [1, 0, 1];\n    for (let i = 0; i < m; ++i) {\n        for (let j = 0; j < n; ++j) {\n            if (grid[i][j] == '1') {\n                for (let k = 0; k < 2; ++k) {\n                    const x = i + dirs[k];\n                    const y = j + dirs[k + 1];\n                    if (x < m && y < n && grid[x][y] == '1') {\n                        p[find(i * n + j)] = find(x * n + y);\n                    }\n                }\n            }\n        }\n    }\n    let ans = 0;\n    for (let i = 0; i < m; ++i) {\n        for (let j = 0; j < n; ++j) {\n            if (grid[i][j] == '1' && i * n + j == find(i * n + j)) {\n                ++ans;\n            }\n        }\n    }\n    return ans;\n}\n```",
    },
    {
      href: 'https://leetcode.com/problems/redundant-connection',
      title: 'Redundant Connection',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'In the Redundant Connection problem, find the connection between two points in a network of nodes and edges where some connections are redundant and should be ignored.',
      answer:
        '```typescript\nclass UnionFind {\n    p: number[];\n    size: number[];\n    constructor(n: number) {\n        this.p = Array.from({ length: n }, (_, i) => i);\n        this.size = Array(n).fill(1);\n    }\n\n    find(x: number): number {\n        if (this.p[x] !== x) {\n            this.p[x] = this.find(this.p[x]);\n        }\n        return this.p[x];\n    }\n\n    union(a: number, b: number): boolean {\n        const [pa, pb] = [this.find(a), this.find(b)];\n        if (pa === pb) {\n            return false;\n        }\n        if (this.size[pa] > this.size[pb]) {\n            this.p[pb] = pa;\n            this.size[pa] += this.size[pb];\n        } else {\n            this.p[pa] = pb;\n            this.size[pb] += this.size[pa];\n        }\n        return true;\n    }\n}\n\nfunction findRedundantConnection(edges: number[][]): number[] {\n    const uf = new UnionFind(edges.length);\n    for (let i = 0; ; ++i) {\n        if (!uf.union(edges[i][0] - 1, edges[i][1] - 1)) {\n            return edges[i];\n        }\n    }\n}\n```',
    },
  ],
  minimumSpanningTrees: [
    {
      href: 'https://leetcode.com/problems/connecting-cities-with-minimum-cost',
      title: 'Connecting Cities With Minimum Cost',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'This challenge involves finding the most cost-effective way to connect multiple cities by forming a network with the minimum total cost, considering various constraints and optimal routing techniques.',
      answer:
        '```typescript\nclass UnionFind {\n    private p: number[];\n    private size: number[];\n\n    constructor(n: number) {\n        this.p = Array(n)\n            .fill(0)\n            .map((_, i) => i);\n        this.size = Array(n).fill(1);\n    }\n\n    find(x: number): number {\n        if (this.p[x] !== x) {\n            this.p[x] = this.find(this.p[x]);\n        }\n        return this.p[x];\n    }\n\n    union(a: number, b: number): boolean {\n        const pa = this.find(a);\n        const pb = this.find(b);\n        if (pa === pb) {\n            return false;\n        }\n        if (this.size[pa] > this.size[pb]) {\n            this.p[pb] = pa;\n            this.size[pa] += this.size[pb];\n        } else {\n            this.p[pa] = pb;\n            this.size[pb] += this.size[pa];\n        }\n        return true;\n    }\n}\n\nfunction minCostToSupplyWater(n: number, wells: number[], pipes: number[][]): number {\n    for (let i = 0; i < n; ++i) {\n        pipes.push([0, i + 1, wells[i]]);\n    }\n    pipes.sort((a, b) => a[2] - b[2]);\n    const uf = new UnionFind(n + 1);\n    let ans = 0;\n    for (const [a, b, c] of pipes) {\n        if (uf.union(a, b)) {\n            ans += c;\n            if (--n === 0) {\n                break;\n            }\n        }\n    }\n    return ans;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/optimize-water-distribution-in-a-village',
      title: 'Optimize Water Distribution in a Village',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Design an efficient water distribution system for a village by allocating the minimum amount of water to each household while satisfying the demand and minimizing waste, given a set of households with varying water needs.',
      answer:
        '```typescript\nclass UnionFind {\n    private p: number[];\n    private size: number[];\n\n    constructor(n: number) {\n        this.p = Array(n)\n            .fill(0)\n            .map((_, i) => i);\n        this.size = Array(n).fill(1);\n    }\n\n    find(x: number): number {\n        if (this.p[x] !== x) {\n            this.p[x] = this.find(this.p[x]);\n        }\n        return this.p[x];\n    }\n\n    union(a: number, b: number): boolean {\n        const pa = this.find(a);\n        const pb = this.find(b);\n        if (pa === pb) {\n            return false;\n        }\n        if (this.size[pa] > this.size[pb]) {\n            this.p[pb] = pa;\n            this.size[pa] += this.size[pb];\n        } else {\n            this.p[pa] = pb;\n            this.size[pb] += this.size[pa];\n        }\n        return true;\n    }\n}\n\nfunction minCostToSupplyWater(n: number, wells: number[], pipes: number[][]): number {\n    for (let i = 0; i < n; ++i) {\n        pipes.push([0, i + 1, wells[i]]);\n    }\n    pipes.sort((a, b) => a[2] - b[2]);\n    const uf = new UnionFind(n + 1);\n    let ans = 0;\n    for (const [a, b, c] of pipes) {\n        if (uf.union(a, b)) {\n            ans += c;\n            if (--n === 0) {\n                break;\n            }\n        }\n    }\n    return ans;\n}\n```',
    },
  ],
  shortestPathAlgorithms: [
    {
      href: 'https://leetcode.com/problems/path-with-minimum-effort',
      title: 'Path With Minimum Effort',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given a graph with non-negative edge weights, find the shortest path from a source node to all other nodes while considering possible obstacles represented by non-negative edge weights.',
      answer:
        '```typescript\nfunction minimumEffortPath(heights: number[][]): number {\n    const m = heights.length;\n    const n = heights[0].length;\n    const pq = new PriorityQueue({ compare: (a, b) => a[0] - b[0] });\n    pq.enqueue([0, 0, 0]);\n    const dist = Array.from({ length: m }, () => Array.from({ length: n }, () => Infinity));\n    dist[0][0] = 0;\n    const dirs = [-1, 0, 1, 0, -1];\n    while (pq.size() > 0) {\n        const [t, i, j] = pq.dequeue()!;\n        for (let k = 0; k < 4; ++k) {\n            const [x, y] = [i + dirs[k], j + dirs[k + 1]];\n            if (x >= 0 && x < m && y >= 0 && y < n) {\n                const d = Math.max(t, Math.abs(heights[x][y] - heights[i][j]));\n                if (d < dist[x][y]) {\n                    dist[x][y] = d;\n                    pq.enqueue([d, x, y]);\n                }\n            }\n        }\n    }\n    return dist[m - 1][n - 1];\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/network-delay-time',
      title: 'Network Delay Time',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Find the minimum time by which all nodes in a directed graph must be visited after a given start node, considering possible delays and edge weights.',
      answer:
        '```typescript\nfunction networkDelayTime(times: number[][], N: number, K: number): number {\n    const tt = new Array(N + 1).fill(Infinity);\n    tt[0] = 0;\n    tt[K] = 0;\n\n    let flag = true;\n\n    while (flag) {\n        flag = false;\n        times.forEach(([u, v, w]) => {\n            if (tt[u] !== Infinity && tt[v] > tt[u] + w) {\n                tt[v] = tt[u] + w;\n                flag = true;\n            }\n        });\n    }\n\n    const res = Math.max(...tt);\n\n    return res === Infinity ? -1 : res;\n}\n```',
    },
  ],
  maximumFlow: [
    {
      href: 'https://leetcode.com/problems/find-valid-matrix-given-row-and-column-sums',
      title: 'Find Valid Matrix Given Row and Column Sums',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given the sum of each row and column in a matrix, determine if there exists at least one valid arrangement where the sums match.',
      answer:
        '```typescript\nfunction restoreMatrix(rowSum: number[], colSum: number[]): number[][] {\n    const m = rowSum.length;\n    const n = colSum.length;\n    const ans = Array.from(new Array(m), () => new Array(n).fill(0));\n    for (let i = 0; i < m; i++) {\n        for (let j = 0; j < n; j++) {\n            const x = Math.min(rowSum[i], colSum[j]);\n            ans[i][j] = x;\n            rowSum[i] -= x;\n            colSum[j] -= x;\n        }\n    }\n    return ans;\n}\n```',
    },
  ],
  bitManipulation: [
    {
      href: 'https://leetcode.com/problems/sum-of-two-integers',
      title: 'Sum of Two Integers',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'This problem involves finding the sum of two integers, which could be a positive or negative number, and returning the result as an integer.',
      answer:
        '```typescript\nfunction getSum(a: number, b: number): number {\n    let carry = 0;\n\n    while (b !== 0) {\n        carry = a & b;\n        a = a ^ b;\n        b = carry << 1;\n    }\n\n    return a;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array',
      title: 'Maximum XOR of Two Numbers in an Array',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given an array of integers, find the maximum possible bitwise XOR that can be obtained by combining any two numbers from the array.',
      answer:
        "```typescript\nfunction findMaximumXOR(nums: number[]): number {\n    nums.sort((a, b) => a - b)\n    let max = 0\n    for (const num of nums) {\n        const target = flip(num)\n        const t1 = binarySearch(nums, target)\n        max = Math.max(max, nums[t1] ^ num)\n        if (1 <= t1) {\n            max = Math.max(max, nums[t1-1] ^ num)\n        }\n        const target2 = target + Math.pow(2, Math.floor(Math.log2(num)))\n        const t2 = binarySearch(nums, target2)\n        max = Math.max(max, nums[t2] ^ num)\n        if (1 <= t2) {\n            max = Math.max(max, nums[t2-1] ^ num)\n        }\n    }\n    return max\n}\n\nfunction binarySearch(nums: number[], target: number) {\n    let l = 0\n    let r = nums.length-1\n    while (l < r) {\n        const m = Math.floor((l+r) / 2)\n        if (target <= nums[m]) {\n            r = m\n        } else {\n            l = m+1\n        }\n    }\n    return l\n}\n\nfunction flip(num: number) {\n    return parseInt(num.toString(2).split('').map(b => b === '1' ? '0': '1').join(''), 2)\n}\n```",
    },
  ],
  randomizedAlgorithms: [
    {
      href: 'https://leetcode.com/problems/random-pick-with-weight',
      title: 'Random Pick with Weight',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        "Given an array of weights, randomly select an index based on the corresponding weight's probability distribution and return that element.",
      answer:
        '```typescript\nlet prefixSums: number[] = [];\n\nfunction initialize(weights: number[]): void {\n    const n = weights.length;\n    prefixSums = new Array(n + 1).fill(0);\n    for (let i = 0; i < n; ++i) {\n        prefixSums[i + 1] = prefixSums[i] + weights[i];\n    }\n}\n\nfunction pickIndex(): number {\n    const n = prefixSums.length;\n    const randomNum = 1 + Math.floor(Math.random() * prefixSums[n - 1]);\n    let left = 1;\n    let right = n - 1;\n\n    while (left < right) {\n        const mid = Math.floor((left + right) / 2);\n        if (prefixSums[mid] >= randomNum) {\n            right = mid;\n        } else {\n            left = mid + 1;\n        }\n    }\n    \n    return left - 1;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/random-point-in-non-overlapping-rectangles',
      title: 'Random Point in Non-overlapping Rectangles',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given a set of non-overlapping rectangles, determine the probability that a randomly chosen point within these rectangles falls inside at least one rectangle.',
      answer:
        '```typescript\nlet prefixSums: number[] = [];\n\nfunction initialize(weights: number[]): void {\n    const n = weights.length;\n    prefixSums = new Array(n + 1).fill(0);\n    for (let i = 0; i < n; ++i) {\n        prefixSums[i + 1] = prefixSums[i] + weights[i];\n    }\n}\n\nfunction pickIndex(): number {\n    const n = prefixSums.length;\n    const randomNum = 1 + Math.floor(Math.random() * prefixSums[n - 1]);\n    let left = 1;\n    let right = n - 1;\n\n    while (left < right) {\n        const mid = Math.floor((left + right) / 2);\n        if (prefixSums[mid] >= randomNum) {\n            right = mid;\n        } else {\n            left = mid + 1;\n        }\n    }\n    \n    return left - 1;\n}\n```',
    },
  ],
  suffixArraysAndSuffixTrees: [
    {
      href: 'https://leetcode.com/problems/longest-repeating-substring',
      title: 'Longest Repeating Substring',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Find the longest substring that repeats itself within another substring in a given string, returning its length and the substring itself as output.',
      answer:
        '```typescript\nfunction longestRepeatingSubstring(s: string): number {\n    const length = s.length;\n    \n    const dp: number[][] = Array.from({ length }, () => Array(length).fill(0));\n    let longest = 0;\n\n    for (let i = 0; i < length; ++i) {\n        for (let j = i + 1; j < length; ++j) {\n            if (s[i] === s[j]) {\n                dp[i][j] = (i > 0) ? dp[i - 1][j - 1] + 1 : 1;\n                \n                longest = Math.max(longest, dp[i][j]);\n            }\n        }\n    }\n    \n    return longest;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/stream-of-characters',
      title: 'Stream of Characters',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'The "Stream of Characters" challenge involves processing a continuous stream of characters and performing operations such as insertion, deletion, or updating of characters in a data structure while maintaining efficient performance.',
      answer:
        '```typescript\ninterface Trie {\n    isEnd: boolean;\n    children: Array<Trie>;\n};\n\nconst A_ORD = "a".charCodeAt(0);\nconst ALPHABET_SIZE = "z".charCodeAt(0) - A_ORD;\n\nclass StreamChecker {\n    trie: Trie;\n    current: Trie[];\n\n    setNode(trie: Trie, letter: string, isEnd: boolean = false): Trie {\n        const _pos = letter.charCodeAt(0) - A_ORD;\n        trie.children[_pos] = (\n            trie.children[_pos] ?\n            trie.children[_pos] :\n            {\n                isEnd,\n                children: new Array(ALPHABET_SIZE)\n            }\n        );\n        return trie.children[_pos];\n    }\n    \n    constructor(words: string[]) {\n        this.trie = {\n            isEnd: false,\n            children: new Array(ALPHABET_SIZE)\n        };\n        for (let i = 0; i < words.length; i++) {\n            let _trie = this.trie;\n            for (let j = 0; j < words[i].length; j++) {\n                _trie = this.setNode(_trie, words[i][j]);\n            }\n            _trie.isEnd = true;\n        }\n        this.current = [];\n    }\n\n    query(letter: string): boolean {\n        let toReturn: boolean = false;\n        const toRemove: number[] = [];\n        const _pos = letter.charCodeAt(0) - A_ORD;\n        for (let i = 0; i < this.current.length; i++) {\n            if (this.current[i].children[_pos]) {\n                this.current[i] = this.current[i].children[_pos];\n                if (this.current[i].isEnd) {\n                    toReturn = true;\n                }\n            } else {\n                toRemove.push(i);\n            }\n        }\n        for (let i = toRemove.length - 1; i >= 0; i--) {\n            this.current.splice(toRemove[i], 1);\n        }\n        if (this.trie.children[_pos]) {\n            this.current.push(this.trie.children[_pos]);\n            if (this.trie.children[_pos].isEnd) {\n                toReturn = true;\n            }\n        }\n        return toReturn;\n    }\n}\n```',
    },
  ],
  approximationAlgorithms: [
    {
      href: 'https://leetcode.com/problems/minimum-number-of-taps-to-open-to-water-a-garden',
      title: 'Minimum Number of Taps to Open to Water a Garden',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Given a garden with tap positions and a water pressure reading at each position, find the minimum number of taps that need to be opened to fully water the entire garden.',
      answer:
        '```typescript\nfunction minTaps(n: number, ranges: number[]): number {\n    const last = new Array(n + 1).fill(0);\n    for (let i = 0; i < n + 1; ++i) {\n        const l = Math.max(0, i - ranges[i]);\n        const r = i + ranges[i];\n        last[l] = Math.max(last[l], r);\n    }\n    let ans = 0;\n    let mx = 0;\n    let pre = 0;\n    for (let i = 0; i < n; ++i) {\n        mx = Math.max(mx, last[i]);\n        if (mx <= i) {\n            return -1;\n        }\n        if (pre == i) {\n            ++ans;\n            pre = mx;\n        }\n    }\n    return ans;\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/best-position-for-a-service-centre',
      title: 'Best Position for a Service Centre',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Given a set of coordinates representing potential locations for a service centre, determine the optimal position that minimizes travel time or distance to all existing locations.',
      answer:
        '```typescript\nfunction getMinDistSum(positions: number[][]): number {\n    const n = positions.length;\n    let [x, y] = [0, 0];\n    for (const [px, py] of positions) {\n        x += px;\n        y += py;\n    }\n    x /= n;\n    y /= n;\n    const decay = 0.999;\n    const eps = 1e-6;\n    let alpha = 0.5;\n    while (true) {\n        let [gradX, gradY] = [0, 0];\n        let dist = 0;\n        for (const [px, py] of positions) {\n            const a = x - px;\n            const b = y - py;\n            const c = Math.sqrt(a * a + b * b);\n            gradX += a / (c + 1e-8);\n            gradY += b / (c + 1e-8);\n            dist += c;\n        }\n        const dx = gradX * alpha;\n        const dy = gradY * alpha;\n        if (Math.abs(dx) <= eps && Math.abs(dy) <= eps) {\n            return dist;\n        }\n        x -= dx;\n        y -= dy;\n        alpha *= decay;\n    }\n}\n```',
    },
  ],
  sqrtDecomposition: [
    {
      href: 'https://leetcode.com/problems/range-addition',
      title: 'Range Addition',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'You are given two non-negative integers representing the start and end times of events, and you must calculate the total time range after adding or subtracting an arbitrary number within that range.',
      answer:
        '```typescript\nclass BinaryIndexedTree {\n    private n: number;\n    private c: number[];\n\n    constructor(n: number) {\n        this.n = n;\n        this.c = Array(n + 1).fill(0);\n    }\n\n    update(x: number, delta: number): void {\n        for (; x <= this.n; x += x & -x) {\n            this.c[x] += delta;\n        }\n    }\n\n    query(x: number): number {\n        let s = 0;\n        for (; x > 0; x -= x & -x) {\n            s += this.c[x];\n        }\n        return s;\n    }\n}\n\nfunction getModifiedArray(length: number, updates: number[][]): number[] {\n    const bit = new BinaryIndexedTree(length);\n    for (const [l, r, c] of updates) {\n        bit.update(l + 1, c);\n        bit.update(r + 2, -c);\n    }\n    return Array.from({ length }, (_, i) => bit.query(i + 1));\n}\n```',
    },
    {
      href: 'https://leetcode.com/problems/count-of-smaller-numbers-after-self',
      title: 'Count of Smaller Numbers After Self',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Write an algorithm to find the count of smaller numbers after each element in a given sorted array, and return them as a new array.',
      answer:
        '```typescript\nfunction countSmaller(nums: number[]): number[] {\n    const n = nums.length;\n    const result = new Array(n).fill(0);\n    const indexes = nums.map((_, i) => i);\n\n    function mergeSort(start: number, end: number) {\n        if (end - start <= 1) return;\n\n        const mid = Math.floor((start + end) / 2);\n        mergeSort(start, mid);\n        mergeSort(mid, end);\n\n        const temp: number[] = [];\n        let i = start, j = mid;\n\n        while (i < mid || j < end) {\n            if (j === end || (i < mid && nums[indexes[i]] <= nums[indexes[j]])) {\n                temp.push(indexes[i]);\n                result[indexes[i]] += j - mid;\n                i++;\n            } else {\n                temp.push(indexes[j]);\n                j++;\n            }\n        }\n\n        for (let i = start; i < end; i++) {\n            indexes[i] = temp[i - start];\n        }\n    }\n\n    mergeSort(0, n);\n    return result;\n}\n```',
    },
  ],
  networkFlowAlgorithms: [
    {
      href: 'https://leetcode.com/problems/maximum-students-taking-exam',
      title: 'Maximum Students Taking Exam',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Write an algorithm to determine the maximum number of students that can take an exam without exceeding a given time limit, assuming each student requires a fixed amount of time.',
      answer:
        "```typescript\nfunction maxStudents(seats: string[][]): number {\n    const m: number = seats.length;\n    const n: number = seats[0].length;\n    const ss: number[] = Array(m).fill(0);\n    const f: number[][] = Array.from({ length: 1 << n }, () => Array(m).fill(-1));\n    for (let i = 0; i < m; ++i) {\n        for (let j = 0; j < n; ++j) {\n            if (seats[i][j] === '.') {\n                ss[i] |= 1 << j;\n            }\n        }\n    }\n\n    const dfs = (seat: number, i: number): number => {\n        if (f[seat][i] !== -1) {\n            return f[seat][i];\n        }\n        let ans: number = 0;\n        for (let mask = 0; mask < 1 << n; ++mask) {\n            if ((seat | mask) !== seat || (mask & (mask << 1)) !== 0) {\n                continue;\n            }\n            const cnt: number = mask.toString(2).split('1').length - 1;\n            if (i === m - 1) {\n                ans = Math.max(ans, cnt);\n            } else {\n                let nxt: number = ss[i + 1];\n                nxt &= ~(mask >> 1);\n                nxt &= ~(mask << 1);\n                ans = Math.max(ans, cnt + dfs(nxt, i + 1));\n            }\n        }\n        return (f[seat][i] = ans);\n    };\n    return dfs(ss[0], 0);\n}\n```",
    },
  ],
  convexHull: [
    {
      href: 'https://leetcode.com/problems/erect-the-fence',
      title: 'Erect the Fence',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Design an efficient algorithm to determine the minimum cost required to erect a fence around a given rectangular plot of land by selecting the optimal placement of four vertical poles, with each pole connected to two adjacent sections of the fence at specific heights.',
      answer:
        '```typescript\nfunction outerTrees(trees: number[][]): number[][] {\n    if (trees.length === 1) return trees;\n\n    trees.sort((a, b) => {\n        if (a[0] === b[0]) {\n            return a[1] - b[1];\n        } else {\n            return a[0] - b[0];\n        }\n    });\n\n    const cross = (\n        o: Array<number>,\n        a: Array<number>,\n        b: Array<number>,\n    ): number => {\n        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);\n    };\n\n    const lower: number[][] = new Array();\n    trees.forEach((p) => {\n        while (\n            lower.length >= 2 &&\n            cross(lower[lower.length - 2], lower[lower.length - 1], p) < 0\n        ) {\n            lower.pop();\n        }\n        lower.push(p);\n    });\n\n    const upper: number[][] = new Array();\n    trees\n        .slice()\n        .reverse()\n        .forEach((p) => {\n            while (\n                upper.length >= 2 &&\n                cross(upper[upper.length - 2], upper[upper.length - 1], p) < 0\n            ) {\n                upper.pop();\n            }\n            upper.push(p);\n        });\n\n    upper.pop();\n    lower.pop();\n\n    const prevs = new Set();\n    return [...upper, ...lower].filter((value) => {\n        if (prevs.has(value.toString())) {\n            return false;\n        }\n        prevs.add(value.toString());\n        return true;\n    });\n}\n```',
    },
  ],
  combinatorialOptimization: [
    {
      href: 'https://leetcode.com/problems/minimum-cost-to-connect-sticks',
      title: 'Minimum Cost to Connect Sticks',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given an array of stick lengths, find the minimum cost to connect all sticks by forming two groups of sticks with equal total lengths.',
      answer:
        "```typescript\nfunction connectSticks(sticks: number[]): number {\n    const pq = new Heap(sticks);\n    let ans = 0;\n    while (pq.size() > 1) {\n        const x = pq.pop();\n        const y = pq.pop();\n        ans += x + y;\n        pq.push(x + y);\n    }\n    return ans;\n}\n\ntype Compare<T> = (lhs: T, rhs: T) => number;\n\nclass Heap<T = number> {\n    data: Array<T | null>;\n    lt: (i: number, j: number) => boolean;\n    constructor();\n    constructor(data: T[]);\n    constructor(compare: Compare<T>);\n    constructor(data: T[], compare: Compare<T>);\n    constructor(data: T[] | Compare<T>, compare?: (lhs: T, rhs: T) => number);\n    constructor(\n        data: T[] | Compare<T> = [],\n        compare: Compare<T> = (lhs: T, rhs: T) => (lhs < rhs ? -1 : lhs > rhs ? 1 : 0),\n    ) {\n        if (typeof data === 'function') {\n            compare = data;\n            data = [];\n        }\n        this.data = [null, ...data];\n        this.lt = (i, j) => compare(this.data[i]!, this.data[j]!) < 0;\n        for (let i = this.size(); i > 0; i--) this.heapify(i);\n    }\n\n    size(): number {\n        return this.data.length - 1;\n    }\n\n    push(v: T): void {\n        this.data.push(v);\n        let i = this.size();\n        while (i >> 1 !== 0 && this.lt(i, i >> 1)) this.swap(i, (i >>= 1));\n    }\n\n    pop(): T {\n        this.swap(1, this.size());\n        const top = this.data.pop();\n        this.heapify(1);\n        return top!;\n    }\n\n    top(): T {\n        return this.data[1]!;\n    }\n    heapify(i: number): void {\n        while (true) {\n            let min = i;\n            const [l, r, n] = [i * 2, i * 2 + 1, this.data.length];\n            if (l < n && this.lt(l, min)) min = l;\n            if (r < n && this.lt(r, min)) min = r;\n            if (min !== i) {\n                this.swap(i, min);\n                i = min;\n            } else break;\n        }\n    }\n\n    clear(): void {\n        this.data = [null];\n    }\n\n    private swap(i: number, j: number): void {\n        const d = this.data;\n        [d[i], d[j]] = [d[j], d[i]];\n    }\n}\n```",
    },
    {
      href: 'https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons',
      title: 'Minimum Number of Arrows to Burst Balloons',
      type: ProblemType.CODING,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Given a list of balloons with distinct pairs of adjacent integers representing their burst point values, find the minimum number of arrows needed to pop all balloons such that no two popped balloons have points within 2 units of each other.',
      answer:
        '```typescript\nfunction findMinArrowShots(points: number[][]): number {\n    points.sort((a, b) => a[1] - b[1]);\n    let ans = 0;\n    let last = -Infinity;\n    for (const [a, b] of points) {\n        if (last < a) {\n            ans++;\n            last = b;\n        }\n    }\n    return ans;\n}\n```',
    },
  ],
}

export const CORE_FUNDAMENTALS = {
  asyncJs: [
    {
      href: '/js-track/core-fundamentals/async-js/page.mdx#callback-hell-pitfalls',
      title: 'Callback Hell Pitfalls',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'What are the main issues with using callbacks for asynchronous code in JavaScript?',
      answer:
        "- **Callback Hell**: Nested callbacks leading to code that's hard to read and maintain.\n- **Inversion of Control**: Loss of control over when and how the callback is executed.\n- **Error Handling Complexity**: Errors must be handled at every level of the callback chain.\n- **Lack of Composability**: Difficult to compose multiple asynchronous operations cleanly.",
    },
    {
      href: '/js-track/core-fundamentals/async-js/page.mdx#improving-asynchronous-programming',
      title: 'Improving Asynchronous Programming',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Explain how promises improve upon callbacks in asynchronous programming.',
      answer:
        '- **Chaining**: Promises can be chained, allowing for sequential execution of asynchronous operations.\n- **Error Propagation**: Errors automatically propagate down the promise chain to a single `.catch()` block.\n- **Avoid Callback Hell**: Flatten the code structure, making it more readable.\n- **Composability**: Promise methods like `Promise.all()` and `Promise.race()` allow combining multiple promises.',
    },
    {
      href: '/js-track/core-fundamentals/async-js/page.mdx#promise-comparison-methods',
      title: 'Promise Comparison Methods',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is the difference between `Promise.all()` and `Promise.race()`?',
      answer:
        '- **`Promise.all()`**:\n\n     - Waits for all promises to fulfill.\n     - Resolves with an array of results if all promises fulfill.\n     - Rejects immediately if any promise rejects.\n\n- **`Promise.race()`**:\n\n     - Resolves or rejects as soon as one promise resolves or rejects.\n     - Returns the result or error of the first settled promise.',
    },
    {
      href: '/js-track/core-fundamentals/async-js/page.mdx#simplifying-promise-handling',
      title: 'Simplifying Promise Handling',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'How does `async/await` simplify working with promises?',
      answer:
        '- **Synchronous-like Syntax**: Makes asynchronous code look like synchronous code.\n- **Improved Readability**: Reduces the need for chaining `.then()` methods.\n- **Error Handling**: Use `try...catch` blocks for error handling, similar to synchronous code.\n- **Conditional Logic**: Easier to write conditional and looping logic with asynchronous operations.',
    },
    {
      href: '/js-track/core-fundamentals/async-js/page.mdx#handling-async-errors',
      title: 'Handling Async Errors',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Can you explain how to handle errors when using `async/await`?',
      answer:
        "- Use `try...catch` blocks around `await` expressions to catch errors.\n- Alternatively, attach a `.catch()` method to the returned promise if not using `try...catch`.\n\n   **Example**:\n\n   ```javascript\n   async function getData() {\n     try {\n       const data = await fetchData()\n       return data\n     } catch (error) {\n       console.error('Error:', error)\n     }\n   }\n   ```",
    },
  ],
  closures: [
    {
      href: '/js-track/core-fundamentals/closures/page.mdx#javascript-closures-explained',
      title: 'JavaScript Closures Explained',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question: 'What is a closure in JavaScript, and how does it work?',
      answer:
        "A closure is a function that has access to its own scope, the outer function's scope, and the global scope. It allows an inner function to access variables from an outer function even after the outer function has returned. This is possible because functions in JavaScript form closures around the scope in which they were declared, preserving the lexical environment.",
    },
    {
      href: '/js-track/core-fundamentals/closures/page.mdx#lexical-scoping-in-javascript',
      title: 'Lexical Scoping in JavaScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question: 'Explain lexical scoping in JavaScript.',
      answer:
        'Lexical scoping means that the accessibility of variables is determined by the physical structure of the code. Functions are executed using the scope chain that was in effect when they were defined, not when they are executed. This means that inner functions have access to variables declared in their outer scopes.',
    },
    {
      href: '/js-track/core-fundamentals/closures/page.mdx#closures-for-private-variables',
      title: 'Closures for Private Variables',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'How can closures be used to create private variables in JavaScript?',
      answer:
        "Closures can encapsulate variables within a function scope, exposing only specific functions that can access or modify those variables. By returning an object with methods that interact with the private variables, you can emulate private state.\n\n   **Example:**\n\n   ```javascript\n   function secretHolder() {\n     let secret = 'hidden'\n\n     return {\n       getSecret: function () {\n         return secret\n       },\n       setSecret: function (newSecret) {\n         secret = newSecret\n       },\n     }\n   }\n\n   const mySecret = secretHolder()\n   console.log(mySecret.getSecret()) // Outputs: 'hidden'\n   mySecret.setSecret('revealed')\n   console.log(mySecret.getSecret()) // Outputs: 'revealed'\n   ```",
    },
    {
      href: '/js-track/core-fundamentals/closures/page.mdx#common-pitfalls-in-closures',
      title: 'Common Pitfalls in Closures',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are some common pitfalls when using closures, and how can they be avoided?',
      answer:
        '- **Memory Leaks**: Closures can lead to memory leaks if they retain references to unused variables or large data structures.\n     - **Avoidance**: Nullify references to variables that are no longer needed.\n- **Unexpected Variable Sharing**: When using loops with `var`, all closures might share the same variable.\n     - **Avoidance**: Use `let` for block scoping or IIFEs to create new scopes.\n- **Performance Overhead**: Excessive use of closures can consume more memory.\n     - **Avoidance**: Optimize by limiting the number of closures and releasing resources when possible.',
    },
    {
      href: '/js-track/core-fundamentals/closures/page.mdx#how-closures-work',
      title: 'How Closures Work',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Can you explain how the scope chain works when dealing with nested functions and closures?',
      answer:
        'The scope chain is a series of references to outer lexical environments. When a variable is accessed, the JavaScript engine starts from the innermost scope and moves outward, looking for the variable in each lexical environment. In nested functions, each function adds a layer to the scope chain. Closures retain access to their outer scopes through this chain, even after the outer functions have completed execution.',
    },
  ],
  engineAndRuntime: [
    {
      href: '/js-track/core-fundamentals/js-engine-and-runtime/page.mdx#v8-engine-execution-process',
      title: 'V8 Engine Execution Process',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain the process of how JavaScript code is executed in the V8 engine.',
      answer:
        '- **Parsing**: Source code is parsed into an AST.\n- **Compilation**: AST is compiled into bytecode by Ignition (interpreter).\n- **Execution**: Bytecode is executed.\n- **Profiling**: Hot code is identified through profiling.\n- **Optimization**: TurboFan (optimizing compiler) recompiles hot code into optimized machine code.\n- **Deoptimization**: If assumptions fail, code is deoptimized back to bytecode execution.',
    },
    {
      href: '/js-track/core-fundamentals/js-engine-and-runtime/page.mdx#understanding-hidden-classes',
      title: 'Understanding Hidden Classes',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What are hidden classes, and how do they affect performance?',
      answer:
        "- Hidden classes are internal representations of object shapes.\n- Objects with the same hidden class allow the engine to optimize property access.\n- Changing an object's structure (adding/removing properties) creates new hidden classes, hindering optimization.\n- Consistent object structures improve performance.",
    },
    {
      href: '/js-track/core-fundamentals/js-engine-and-runtime/page.mdx#garbage-collector-overview',
      title: 'Garbage Collector Overview',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How does the garbage collector work in JavaScript engines like V8?',
      answer:
        '- Uses algorithms like mark-and-sweep and generational collection.\n- **Mark-and-Sweep**:\n     - Marks all reachable objects starting from root references.\n     - Sweeps and collects unmarked objects.\n- **Generational Collection**:\n     - Divides heap into young and old generations.\n     - Young generation collects short-lived objects frequently.\n     - Old generation collects long-lived objects less often.\n- Aims to reclaim memory while minimizing pause times.',
    },
    {
      href: '/js-track/core-fundamentals/js-engine-and-runtime/page.mdx#understanding-event-loops',
      title: 'Understanding Event Loops',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is the event loop, and how does it handle asynchronous operations?',
      answer:
        '- The event loop is a mechanism that manages the execution of multiple chunks of code over time.\n- **Mechanism**:\n     - Executes tasks from the call stack.\n     - When the call stack is empty, it processes microtasks (e.g., Promises).\n     - Then processes tasks from the macrotask queue (e.g., `setTimeout` callbacks).\n- Allows asynchronous operations to be executed without blocking the main thread.',
    },
    {
      href: '/js-track/core-fundamentals/js-engine-and-runtime/page.mdx#understanding-call-stack-vs-queues',
      title: 'Understanding Call Stack vs Queues',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Describe the difference between the call stack and the task queues.',
      answer:
        '- **Call Stack**:\n\n     - Executes function calls.\n     - Operates in a LIFO manner.\n     - Holds execution contexts.\n\n- **Task Queues**:\n\n     - **Microtask Queue**:\n       - Holds microtasks like Promise callbacks.\n       - Processed after the current call stack is empty.\n     - **Macrotask Queue**:\n       - Holds tasks like `setTimeout` callbacks, I/O events.\n       - Processed after microtasks are cleared.\n\n- The event loop manages the flow between the call stack and task queues.',
    },
  ],
  errorHandling: [
    {
      href: '/js-track/core-fundamentals/error-handling/page.mdx#purpose-of-try-catch',
      title: 'Purpose of Try Catch',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What is the purpose of `try...catch` in JavaScript?',
      answer:
        'The `try...catch` statement allows you to handle exceptions that occur in your code. Code that may throw an error is placed inside the `try` block, and if an error occurs, control is passed to the `catch` block, where you can handle the error. This prevents the program from crashing and allows for graceful error handling.',
    },
    {
      href: '/js-track/core-fundamentals/error-handling/page.mdx#how-finally-blocks-work',
      title: 'How Finally Blocks Work',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How does the `finally` block work in a `try...catch` statement?',
      answer:
        "The `finally` block contains code that will always execute after the `try` and `catch` blocks, regardless of whether an error was thrown or caught. It's typically used for cleanup operations, such as closing files or releasing resources.",
    },
    {
      href: '/js-track/core-fundamentals/error-handling/page.mdx#common-javascript-errors',
      title: 'Common JavaScript Errors',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What are some common types of errors in JavaScript?',
      answer:
        '- **SyntaxError**: Errors in the code syntax.\n- **ReferenceError**: Accessing an undeclared variable.\n- **TypeError**: Using a value in an inappropriate way.\n- **RangeError**: A number is outside the allowable range.\n- **URIError**: Errors in encoding or decoding URIs.\n- **EvalError**: Errors related to the `eval()` function (rare).',
    },
    {
      href: '/js-track/core-fundamentals/error-handling/page.mdx#creating-custom-errors-in-js',
      title: 'Creating Custom Errors in JS',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'How can you create and throw a custom error in JavaScript?',
      answer:
        "You can create a custom error by creating an instance of the `Error` class or by extending it to create a custom error type. Use the `throw` statement to throw the error.\n\n   **Example**:\n\n   ```javascript\n   class CustomError extends Error {\n     constructor(message) {\n       super(message)\n       this.name = 'CustomError'\n     }\n   }\n\n   throw new CustomError('This is a custom error')\n   ```",
    },
    {
      href: '/js-track/core-fundamentals/error-handling/page.mdx#purpose-of-debugger-statement',
      title: 'Purpose of Debugger Statement',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is the purpose of the `debugger` statement in JavaScript?',
      answer:
        'The `debugger` statement acts like a breakpoint in the code. When the JavaScript engine encounters `debugger`, it pauses execution if a debugging session is active. This allows developers to inspect variables, the call stack, and step through code.',
    },
  ],
  eventLoop: [
    {
      href: '/js-track/core-fundamentals/event-loop/page.mdx#javascript-event-loop-explanation',
      title: 'JavaScript Event Loop Explanation',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'Explain how the event loop works in JavaScript.',
      answer:
        '- The event loop is a mechanism that coordinates the execution of code by continuously checking the call stack and task queues.\n- When the call stack is empty, the event loop processes all microtasks in the microtask queue.\n- After microtasks are processed, the event loop processes one task from the task queue.\n- This cycle repeats indefinitely, allowing JavaScript to handle asynchronous operations efficiently.',
    },
    {
      href: '/js-track/core-fundamentals/event-loop/page.mdx#understanding-task-queue-vs-microtask-queue',
      title: 'Understanding Task Queue vs Microtask Queue',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is the difference between the task queue and the microtask queue?',
      answer:
        '- The task queue (macrotask queue) holds tasks scheduled by `setTimeout`, `setInterval`, and DOM events.\n- The microtask queue holds microtasks such as promise callbacks (`.then()`, `.catch()`), `MutationObserver` callbacks, and tasks scheduled with `queueMicrotask()`.\n- The event loop prioritizes the microtask queue over the task queue, executing all microtasks before processing the next task.',
    },
    {
      href: '/js-track/core-fundamentals/event-loop/page.mdx#why-zero-delay-delays',
      title: 'Why Zero Delay Delays',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Why does `setTimeout` with a delay of zero not execute immediately?',
      answer:
        '- Even with a delay of zero, `setTimeout` schedules the callback to be executed after all current code execution and microtasks are completed.\n- The callback is placed in the task queue and will only be executed when the call stack is empty and after the microtask queue has been processed.',
    },
    {
      href: '/js-track/core-fundamentals/event-loop/page.mdx#understanding-async-await-loops',
      title: 'Understanding Async/Await Loops',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'How do promises and async/await relate to the event loop?',
      answer:
        "- Promises' `.then()` and `.catch()` callbacks are scheduled as microtasks.\n- When using `async/await`, the `await` keyword pauses the function execution until the awaited promise is resolved or rejected.\n- The continuation of the async function after `await` is scheduled as a microtask.",
    },
    {
      href: '/js-track/core-fundamentals/event-loop/page.mdx#common-pitfalls-in-async-code',
      title: 'Common Pitfalls in Async Code',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are some common pitfalls when working with asynchronous JavaScript code?',
      answer:
        '- **Callback Hell**: Nesting multiple callbacks leading to hard-to-read code.\n- **Uncaught Promise Rejections**: Failing to handle promise rejections can cause unhandled exceptions.\n- **Race Conditions**: Not properly managing the order of asynchronous operations.\n- **Blocking the Event Loop**: Running heavy computations on the main thread, preventing the event loop from processing other tasks.',
    },
  ],
  contextAndCallStack: [
    {
      href: '/js-track/core-fundamentals/execution-context-and-call-stack/page.mdx#understanding-execution-contexts',
      title: 'Understanding Execution Contexts',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is an execution context in JavaScript, and how does it work?',
      answer:
        'An **execution context** is an abstract environment where JavaScript code is evaluated and executed. It includes information about the variables, the scope chain, and the value of `this`. There are different types of execution contexts, such as the global context and function contexts. When code runs, a new execution context is created and pushed onto the call stack. Once the code in that context is executed, the context is popped off the stack.',
    },
    {
      href: '/js-track/core-fundamentals/execution-context-and-call-stack/page.mdx#understanding-javascript-contexts',
      title: 'Understanding JavaScript Contexts',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Can you explain the difference between the global execution context and the function execution context?',
      answer:
        'The **global execution context** is the default context where JavaScript code runs initially. It sets up the global object and the global scope. There is only one global execution context per program. In contrast, a **function execution context** is created every time a function is invoked. Each function execution context has its own scope, variables, and `this` binding. Multiple function execution contexts can exist simultaneously, managed by the call stack.',
    },
    {
      href: '/js-track/core-fundamentals/execution-context-and-call-stack/page.mdx#javascript-call-stack-management',
      title: 'JavaScript Call Stack Management',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How does the call stack manage execution contexts in JavaScript?',
      answer:
        'The **call stack** is a stack data structure that keeps track of execution contexts in a Last-In-First-Out (LIFO) order. When a function is called, its execution context is created and pushed onto the call stack. The JavaScript engine executes the code within the topmost context on the stack. Once the function completes execution, its context is popped off the stack, and control returns to the previous context. This management ensures that functions execute in the correct order and maintain their own scope and variables.',
    },
    {
      href: '/js-track/core-fundamentals/execution-context-and-call-stack/page.mdx#temporal-dead-zone-limitation',
      title: 'Temporal Dead Zone Limitation',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What is the Temporal Dead Zone (TDZ) in JavaScript?',
      answer:
        'The **Temporal Dead Zone (TDZ)** refers to the period between the start of a block and the point where a `let` or `const` variable is declared and initialized. During the TDZ, the variable exists but is not accessible, and attempting to access it results in a `ReferenceError`. This behavior helps prevent the use of variables before they are properly declared.\n\n   **Example:**\n\n   ```javascript\n   console.log(a) // ReferenceError\n   let a = 5\n   ```',
    },
    {
      href: '/js-track/core-fundamentals/execution-context-and-call-stack/page.mdx#closures-and-execution-contexts',
      title: 'Closures and Execution Contexts',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'How do closures interact with execution contexts and the call stack?',
      answer:
        "A **closure** is created when a function retains access to its outer (enclosing) function's variables even after the outer function has returned. When a function is created, it captures the variables from its surrounding execution context. This allows the inner function to access these variables whenever it is invoked, regardless of the current state of the call stack. Closures are essential for data encapsulation and creating private variables.",
    },
  ],
  scopeChain: [
    {
      href: '/js-track/core-fundamentals/scope-chain/page.mdx#execution-context-in-js',
      title: 'Execution Context in JS',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What is an execution context in JavaScript?',
      answer:
        '- An execution context is an abstract concept that contains information about the environment within which the current code is being executed.\n- It includes the variable environment, lexical environment, and `this` binding.\n- Types include the global execution context and function execution contexts.',
    },
    {
      href: '/js-track/core-fundamentals/scope-chain/page.mdx#how-javascript-scope-chain-works',
      title: 'How JavaScript Scope Chain Works',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'Explain how the scope chain works in JavaScript.',
      answer:
        '- The scope chain is a list of objects that JavaScript uses to resolve variable identifiers.\n- When a variable is accessed, JavaScript looks in the current scope.\n- If not found, it moves up to the outer (parent) scope, continuing up the chain until it reaches the global scope.\n- If the variable is not found in any scope, a `ReferenceError` is thrown.',
    },
    {
      href: '/js-track/core-fundamentals/scope-chain/page.mdx#understanding-variable-shadowing',
      title: 'Understanding Variable Shadowing',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What is variable shadowing, and how can it affect your code?',
      answer:
        '- Variable shadowing occurs when a variable declared in a local scope has the same name as a variable in an outer scope.\n- The inner variable shadows the outer one, making the outer variable inaccessible in that scope.\n- It can lead to confusion or bugs if not managed carefully.',
    },
    {
      href: '/js-track/core-fundamentals/scope-chain/page.mdx#understanding-variable-scope',
      title: 'Understanding Variable Scope',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is the difference between `let`, `const`, and `var` in terms of scope?',
      answer:
        '- `var` is function-scoped or globally scoped if declared outside a function.\n- `let` and `const` are block-scoped, meaning they are only accessible within the block `{}` they are declared in.\n- Variables declared with `let` and `const` are not hoisted in the same way as `var`.',
    },
    {
      href: '/js-track/core-fundamentals/scope-chain/page.mdx#understanding-hoisting-in-javascript',
      title: 'Understanding Hoisting in JavaScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'How does hoisting work in JavaScript?',
      answer:
        "- Hoisting is JavaScript's behavior of moving variable and function declarations to the top of their containing scope during the compilation phase.\n- Variables declared with `var` are hoisted but initialized with `undefined`.\n- Functions declared using function declarations are hoisted with their definitions.\n- Variables declared with `let` and `const` are hoisted but not initialized, leading to a Temporal Dead Zone (TDZ) until they are assigned.",
    },
  ],
  functionTypes: [
    {
      href: '/js-track/core-fundamentals/function-types/page.mdx#function-declarations-vs-expressions',
      title: 'Function Declarations vs Expressions',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is the difference between function declarations and function expressions in JavaScript?',
      answer:
        '- **Function Declarations**:\n\n     - Defined with the `function` keyword followed by a name.\n     - Hoisted entirely, allowing them to be called before their definition.\n     - Example:\n\n       ```javascript\n       function foo() {\n         // function body\n       }\n       ```\n\n- **Function Expressions**:\n\n     - Defined by assigning a function to a variable.\n     - Only the variable declaration is hoisted, not the assignment.\n     - Can be anonymous or named.\n     - Example:\n\n       ```javascript\n       const bar = function () {\n         // function body\n       }\n       ```',
    },
    {
      href: '/js-track/core-fundamentals/function-types/page.mdx#iife-in-javascript',
      title: 'IIFE in JavaScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'Explain what an IIFE is and provide a use case for it.',
      answer:
        'An IIFE (Immediately Invoked Function Expression) is a function expression that is executed immediately after its definition. It creates a private scope, preventing variable collisions and keeping the global namespace clean.\n\n   **Use Case:**\n\n- Encapsulating code to avoid polluting the global scope.\n- Creating a module pattern to expose only specific functions or variables.',
    },
    {
      href: '/js-track/core-fundamentals/function-types/page.mdx#function-call-methods',
      title: 'Function Call Methods',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How do `call()`, `apply()`, and `bind()` differ in JavaScript?',
      answer:
        '- **`call()`**:\n\n     - Invokes a function immediately.\n     - Arguments are passed individually.\n     - Syntax: `functionName.call(thisArg, arg1, arg2, ...)`\n\n- **`apply()`**:\n\n     - Invokes a function immediately.\n     - Arguments are passed as an array.\n     - Syntax: `functionName.apply(thisArg, [argsArray])`\n\n- **`bind()`**:\n\n     - Returns a new function with `this` and optional arguments bound.\n     - Does not invoke the function immediately.\n     - Syntax: `const boundFunction = functionName.bind(thisArg, arg1, arg2, ...)`',
    },
    {
      href: '/js-track/core-fundamentals/function-types/page.mdx#javascript-function-invocation-methods',
      title: 'JavaScript Function Invocation Methods',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are the different ways to invoke a function in JavaScript, and how do they affect the value of `this`?',
      answer:
        '- **Regular Function Invocation**:\n\n     - Called as a standalone function.\n     - `this` is the global object (non-strict mode) or `undefined` (strict mode).\n\n- **Method Invocation**:\n\n     - Called as a method of an object.\n     - `this` refers to the object invoking the method.\n\n- **Constructor Invocation**:\n\n     - Called with the `new` keyword.\n     - `this` refers to the newly created object.\n\n- **Indirect Invocation**:\n\n     - Using `call()`, `apply()`, or `bind()`.\n     - `this` is explicitly set to the provided value.\n\n- **Arrow Functions**:\n\n     - `this` is lexically bound to the enclosing scope.',
    },
    {
      href: '/js-track/core-fundamentals/function-types/page.mdx#reasons-to-avoid-arrow-functions',
      title: 'Reasons to Avoid Arrow Functions',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Why should you avoid using arrow functions as methods in objects?',
      answer:
        'Arrow functions do not have their own `this` binding. Instead, they inherit `this` from the enclosing lexical scope. When used as methods in objects, `this` does not refer to the object itself but to the surrounding scope, which can lead to unexpected behavior.\n\n   **Example:**\n\n   ```javascript\n   const obj = {\n     value: 10,\n     getValue: () => {\n       return this.value\n     },\n   }\n\n   console.log(obj.getValue()) // Outputs: undefined\n   ```',
    },
  ],
  dataTypes: [
    {
      href: '/js-track/core-fundamentals/data-types/page.mdx#differences-between-primitive-and-objects',
      title: 'Differences Between Primitive and Objects',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What are the differences between primitive data types and objects in JavaScript?',
      answer:
        "- **Primitives**:\n\n     - Immutable values (Number, String, Boolean, Null, Undefined, Symbol, BigInt).\n     - Stored directly in the variable's memory location.\n     - Passed by value; copying a primitive creates a new value.\n\n- **Objects**:\n\n     - Mutable collections of properties.\n     - Stored as references; variables hold a reference to the object's memory location.\n     - Passed by reference; copying an object copies the reference, not the object itself.",
    },
    {
      href: '/js-track/core-fundamentals/data-types/page.mdx#removing-array-duplicates',
      title: 'Removing Array Duplicates',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'How do you remove duplicates from an array in JavaScript?',
      answer:
        '- Using a `Set`:\n\n     ```javascript\n     let numbers = [1, 2, 2, 3, 4, 4, 5]\n     let uniqueNumbers = [...new Set(numbers)] // [1, 2, 3, 4, 5]\n     ```',
    },
    {
      href: '/js-track/core-fundamentals/data-types/page.mdx#javascript-object-vs-map',
      title: 'JavaScript Object vs Map',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are the key differences between an object and a Map in JavaScript?',
      answer:
        '- **Object**:\n\n     - Keys are strings or symbols.\n     - Not ordered; property order is not guaranteed.\n     - Prototypes can affect key lookup.\n     - Limited built-in methods for manipulation.\n\n- **Map**:\n\n     - Keys can be of any type, including objects and functions.\n     - Maintains the insertion order of keys.\n     - No prototype chain affecting key lookup.\n     - Provides methods like `set`, `get`, `has`, `delete`, and is iterable.',
    },
    {
      href: '/js-track/core-fundamentals/data-types/page.mdx#choosing-between-maps',
      title: 'Choosing Between Maps',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question: 'When would you use a WeakMap over a Map?',
      answer:
        '- Use a `WeakMap` when you need to associate data with objects without preventing their garbage collection.\n- Ideal for storing metadata or private data related to an object.\n- Keys are held weakly; if there are no other references to the key object, it can be garbage collected.',
    },
    {
      href: '/js-track/core-fundamentals/data-types/page.mdx#how-map-filter-works',
      title: 'How Map Filter Works',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'Explain how the `map` and `filter` methods work on arrays.',
      answer:
        '- **`map(callback)`**:\n\n     - Creates a new array by applying the callback function to each element of the original array.\n     - The original array is not modified.\n\n     **Example**:\n\n     ```javascript\n     let numbers = [1, 2, 3]\n     let squares = numbers.map((n) => n * n) // [1, 4, 9]\n     ```\n\n- **`filter(callback)`**:\n\n     - Creates a new array with all elements that pass the test implemented by the callback function.\n     - The original array is not modified.\n\n     **Example**:\n\n     ```javascript\n     let numbers = [1, 2, 3, 4, 5]\n     let evenNumbers = numbers.filter((n) => n % 2 === 0) // [2, 4]\n     ```',
    },
  ],
  memoryManagement: [
    {
      href: '/js-track/core-fundamentals/memory-management/page.mdx#understanding-memory-leaks-in-js',
      title: 'Understanding Memory Leaks in JS',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is a memory leak, and how can it occur in JavaScript applications?',
      answer:
        '- A memory leak occurs when memory that is no longer needed is not released, leading to increasing memory usage over time.\n- In JavaScript, memory leaks can happen due to unintended global variables, unreleased references in closures, detached DOM nodes, timers, and event listeners not properly cleaned up.',
    },
    {
      href: '/js-track/core-fundamentals/memory-management/page.mdx#garbage-collection-algorithms',
      title: 'Garbage Collection Algorithms',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain the difference between the mark-and-sweep and reference counting garbage collection algorithms.',
      answer:
        '- **Reference Counting**:\n     - Keeps track of the number of references to each object.\n     - Objects are collected when their reference count reaches zero.\n     - Cannot handle circular references.\n- **Mark-and-Sweep**:\n     - Starts from root objects and marks all reachable objects.\n     - Collects unmarked objects during the sweep phase.\n     - Can handle circular references effectively.',
    },
    {
      href: '/js-track/core-fundamentals/memory-management/page.mdx#optimizing-garbage-collection',
      title: 'Optimizing Garbage Collection',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question: 'How do modern JavaScript engines optimize garbage collection?',
      answer:
        '- Use generational garbage collection, categorizing objects into young and old generations.\n- Implement incremental and concurrent garbage collection to minimize pause times.\n- Optimize for short-lived objects by frequently collecting the young generation.',
    },
    {
      href: '/js-track/core-fundamentals/memory-management/page.mdx#weak-references-explained',
      title: 'Weak References Explained',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are weak references, and how do they help with memory management?',
      answer:
        "- Weak references (`WeakMap`, `WeakSet`) allow you to hold references to objects without preventing them from being garbage collected.\n- If the object has no other references, it can be collected even if it's still in a `WeakMap` or `WeakSet`.\n- Useful for caches or storing metadata about objects without affecting their life cycle.",
    },
    {
      href: '/js-track/core-fundamentals/memory-management/page.mdx#detecting-memory-leaks-in-js',
      title: 'Detecting Memory Leaks in JS',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'How can you detect and debug memory leaks in a JavaScript application?',
      answer:
        "- Use memory profiling tools like Chrome DevTools' Memory tab to take heap snapshots and monitor memory usage over time.\n- Look for patterns of increasing memory usage.\n- Identify detached DOM nodes, unreleased references, and large objects that persist unexpectedly.\n- Use allocation timelines to see where memory allocations occur.",
    },
  ],
  modules: [
    {
      href: '/js-track/core-fundamentals/modules/page.mdx#commonjs-vs-es6-modules',
      title: 'CommonJS vs ES6 Modules',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What are the differences between CommonJS and ES6 modules?',
      answer:
        '- **Syntax**:\n     - CommonJS uses `require()` for importing and `module.exports` for exporting.\n     - ES6 modules use `import` and `export` keywords.\n- **Execution**:\n     - CommonJS modules are loaded synchronously; ideal for server-side Node.js.\n     - ES6 modules can be loaded asynchronously; suitable for both client-side and server-side.\n- **Exports**:\n     - CommonJS modules export a single object (`module.exports`).\n     - ES6 modules support multiple named exports and default exports.\n- **Native Support**:\n     - CommonJS is natively supported in Node.js.\n     - ES6 modules are natively supported in modern browsers and Node.js (with `"type": "module"`).',
    },
    {
      href: '/js-track/core-fundamentals/modules/page.mdx#using-es6-modules-in-node-js',
      title: 'Using ES6 Modules in Node.js',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'Explain how you can use ES6 modules in Node.js.',
      answer:
        '- Use the `.mjs` file extension for modules.\n     - Example: `import { myFunction } from \\\'./module.mjs\\\';`\n- Set `"type": "module"` in the `package.json` file.\n     - Then you can use ES6 module syntax in `.js` files.\n- Alternatively, use a transpiler like Babel to convert ES6 modules to CommonJS.',
    },
    {
      href: '/js-track/core-fundamentals/modules/page.mdx#understanding-module-patterns',
      title: 'Understanding Module Patterns',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What is the purpose of the UMD module pattern?',
      answer:
        '- UMD (Universal Module Definition) is designed to create modules that are compatible with both CommonJS (Node.js) and AMD (browser) module systems.\n- It allows a module to work in multiple environments, ensuring broader compatibility.',
    },
    {
      href: '/js-track/core-fundamentals/modules/page.mdx#exporting-multiple-functions',
      title: 'Exporting Multiple Functions',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'How do you export multiple functions from a module using ES6 syntax?',
      answer:
        '- Use named exports:\n\n     ```javascript\n     export function functionOne() {\n       /* ... */\n     }\n     export function functionTwo() {\n       /* ... */\n     }\n     ```\n\n- Or export at the end:\n\n     ```javascript\n     function functionOne() {\n       /* ... */\n     }\n     function functionTwo() {\n       /* ... */\n     }\n\n     export { functionOne, functionTwo }\n     ```',
    },
    {
      href: '/js-track/core-fundamentals/modules/page.mdx#understanding-dynamic-imports',
      title: 'Understanding Dynamic Imports',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What are dynamic imports, and when would you use them?',
      answer:
        "- Dynamic imports allow you to load modules asynchronously at runtime using the `import()` function, which returns a promise.\n- Useful for code splitting, lazy loading modules, and loading modules based on conditions or user interactions.\n\n   **Example**:\n\n   ```javascript\n   import('./module.js').then((module) => {\n     module.doSomething()\n   })\n   ```",
    },
  ],
  objectAndClassPatterns: [
    {
      href: '/js-track/core-fundamentals/object-patterns/page.mdx#constructor-vs-regular-functions',
      title: 'Constructor vs Regular Functions',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is the difference between a constructor function and a regular function in JavaScript?',
      answer:
        '- A constructor function is intended to be used with the `new` keyword to create new objects.\n- When called with `new`, a constructor function creates a new object, sets `this` to that object, and returns it.\n- Regular functions are called without `new` and `this` depends on how the function is called.',
    },
    {
      href: '/js-track/core-fundamentals/object-patterns/page.mdx#inheritance-in-es6-classes',
      title: 'Inheritance in ES6 Classes',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'How does inheritance work in ES6 classes?',
      answer:
        '- Inheritance is achieved using the `extends` keyword.\n- A subclass extends a parent class and inherits its properties and methods.\n- The `super()` function is used within the subclass constructor to call the parent class constructor.',
    },
    {
      href: '/js-track/core-fundamentals/object-patterns/page.mdx#es6-classes-advantages',
      title: 'ES6 Classes Advantages',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What are the advantages of using ES6 classes over constructor functions?',
      answer:
        '- Cleaner and more concise syntax.\n- Easier to read and maintain.\n- Simplifies inheritance with `extends` and `super`.\n- Supports static methods, getters, setters, and private fields.',
    },
    {
      href: '/js-track/core-fundamentals/object-patterns/page.mdx#inheritance-role-of-super',
      title: 'Inheritance Role of Super',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'Explain the role of `super()` in class inheritance.',
      answer:
        '- `super()` calls the constructor of the parent class.\n- It is necessary to use `super()` before accessing `this` in a subclass constructor.\n- Allows access to parent class methods and properties.',
    },
    {
      href: '/js-track/core-fundamentals/object-patterns/page.mdx#implementing-private-variables-in-es6-classes',
      title: 'Implementing Private Variables in ES6 Classes',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Can you explain how to implement private variables in ES6 classes?',
      answer:
        "- Use the `#` prefix to declare private fields.\n- Private fields are only accessible within the class body.\n- Example:\n\n     ```javascript\n     class Example {\n       #privateField = 'secret'\n\n       getSecret() {\n         return this.#privateField\n       }\n     }\n     ```",
    },
  ],
  prototypes: [
    {
      href: '/js-track/core-fundamentals/prototypes-and-prototypal-inheritance/page.mdx#prototypical-inheritance-explained',
      title: 'Prototypical Inheritance Explained',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question: 'What is prototypal inheritance in JavaScript?',
      answer:
        'Prototypal inheritance is a feature in JavaScript where objects inherit properties and methods from other objects through the prototype chain. Each object has a `[[Prototype]]` reference to another object, allowing it to access properties and methods defined on its prototype. This inheritance model is more flexible than classical inheritance found in other languages, enabling objects to inherit directly from other objects.',
    },
    {
      href: '/js-track/core-fundamentals/prototypes-and-prototypal-inheritance/page.mdx#prototype-chain-basics',
      title: 'Prototype Chain Basics',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How does the prototype chain work when accessing properties on an object?',
      answer:
        'When accessing a property on an object, JavaScript first looks for the property on the object itself. If the property is not found, it looks up the `[[Prototype]]` chain, checking each prototype object in turn until it finds the property or reaches the end of the chain (`null`). This process allows objects to inherit properties and methods from their prototypes.',
    },
    {
      href: '/js-track/core-fundamentals/prototypes-and-prototypal-inheritance/page.mdx#understanding-prototype-properties',
      title: 'Understanding Prototype Properties',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain the difference between the `__proto__` property and the `prototype` property.',
      answer:
        "- **`__proto__`**: An object's internal `[[Prototype]]` reference, pointing to its prototype object. It is used at runtime to resolve property lookups.\n- **`prototype`**: A property of constructor functions (functions intended to be used with `new`) that defines the prototype for instances created by that constructor. When an object is created using `new Constructor()`, its `__proto__` is set to `Constructor.prototype`.",
    },
    {
      href: '/js-track/core-fundamentals/prototypes-and-prototypal-inheritance/page.mdx#constructor-property-purpose',
      title: 'Constructor Property Purpose',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        "What is the purpose of the `constructor` property in an object's prototype?",
      answer:
        "The `constructor` property in an object's prototype refers back to the constructor function that created the object. It allows instances to identify their constructor and is useful for type checking and inheritance. When manually setting an object's prototype, it's common practice to reset the `constructor` property to maintain the correct reference.",
    },
    {
      href: '/js-track/core-fundamentals/prototypes-and-prototypal-inheritance/page.mdx#implementing-inheritance-in-es6',
      title: 'Implementing Inheritance in ES6',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How can you implement inheritance in JavaScript using ES6 classes?',
      answer:
        "In ES6, you can use the `class` syntax along with the `extends` keyword to implement inheritance.\n\n   **Example:**\n\n   ```javascript\n   class Parent {\n     constructor(name) {\n       this.name = name\n     }\n\n     greet() {\n       console.log(`Hello, ${this.name}`)\n     }\n   }\n\n   class Child extends Parent {\n     constructor(name, age) {\n       super(name)\n       this.age = age\n     }\n\n     displayAge() {\n       console.log(`I am ${this.age} years old.`)\n     }\n   }\n\n   const child = new Child('Alice', 10)\n   child.greet() // Outputs: Hello, Alice\n   child.displayAge() // Outputs: I am 10 years old.\n   ```",
    },
  ],
  thisAndBinding: [
    {
      href: '/js-track/core-fundamentals/this-keyword-and-binding-rules/page.mdx#javascript-context-of-this',
      title: 'JavaScript "Context of this"',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is the value of `this` in different contexts in JavaScript?',
      answer:
        "- **Global Context**: `this` refers to the global object (`window` in browsers).\n- **Function Context**:\n     - Default binding: `this` is `undefined` in strict mode; global object in non-strict mode.\n     - Implicit binding: `this` refers to the object before the dot when calling a method.\n     - Explicit binding: Using `.call()`, `.apply()`, or `.bind()`, `this` is explicitly set.\n     - New binding: Using `new` keyword, `this` refers to the newly created object.\n- **Arrow Functions**: `this` is lexically bound and refers to the enclosing scope's `this`.",
    },
    {
      href: '/js-track/core-fundamentals/this-keyword-and-binding-rules/page.mdx#impact-on-constructor-variables',
      title: 'Impact on Constructor Variables',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Explain how the `new` keyword affects the value of `this` in a constructor function.',
      answer:
        'When a function is invoked with the `new` keyword, a new object is created, and `this` inside the constructor function refers to that new object. The properties and methods are added to the new object, and the function implicitly returns `this` unless a non-primitive value is explicitly returned.',
    },
    {
      href: '/js-track/core-fundamentals/this-keyword-and-binding-rules/page.mdx#difference-between-call-and-bind',
      title: 'Difference Between call and bind',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'How does the `.call()` method differ from `.bind()` in setting the value of `this`?',
      answer:
        '- **`.call()`**: Invokes the function immediately with `this` set to the provided value and accepts arguments individually.\n- **`.bind()`**: Returns a new function with `this` permanently bound to the provided value, but does not invoke the function immediately.',
    },
    {
      href: '/js-track/core-fundamentals/this-keyword-and-binding-rules/page.mdx#arrow-function-and-context',
      title: 'Arrow Function and Context',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Why does using an arrow function as a method in an object result in `this` being undefined?',
      answer:
        'Arrow functions do not have their own `this` binding. Instead, they inherit `this` from the enclosing lexical scope. When used as methods in objects, the enclosing scope is typically the global scope, so `this` refers to the global object (or `undefined` in strict mode), not the object itself.',
    },
    {
      href: '/js-track/core-fundamentals/this-keyword-and-binding-rules/page.mdx#code-execution-outcome',
      title: 'Code Execution Outcome',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question: 'What is the outcome of the following code, and why?',
      answer:
        '**Output:**\n\n   ```\n   4\n   ```\n\n   **Explanation:**\n\n- `callback()` is invoked without any context, so `this` refers to the global object.\n- The global `length` variable is `4`.\n- Therefore, `console.log(this.length);` outputs `4`.',
    },
  ],
  scopeAndHoisting: [
    {
      href: '/js-track/core-fundamentals/variable-scope-and-hoisting/page.mdx#javascript-variable-options',
      title: 'JavaScript Variable Options',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is the difference between `var`, `let`, and `const` in JavaScript?',
      answer:
        '- **`var`**: Function-scoped or globally scoped if declared outside a function. Hoisted and initialized with `undefined`. Allows redeclaration and reassignment.\n- **`let`**: Block-scoped. Hoisted but not initialized (TDZ applies). Does not allow redeclaration in the same scope but allows reassignment.\n- **`const`**: Block-scoped. Hoisted but not initialized (TDZ applies). Does not allow redeclaration or reassignment. Must be initialized at declaration.',
    },
    {
      href: '/js-track/core-fundamentals/variable-scope-and-hoisting/page.mdx#understanding-hoisting-in-js',
      title: 'Understanding Hoisting in JS',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain hoisting in JavaScript and how it affects variable declarations with `var`, `let`, and `const`.',
      answer:
        "Hoisting is JavaScript's behavior of moving declarations to the top of their scope during the compilation phase. For `var`, declarations are hoisted and initialized with `undefined`, allowing variables to be used before their declaration without a `ReferenceError`. For `let` and `const`, declarations are hoisted but not initialized, resulting in the Temporal Dead Zone where accessing the variable before its declaration causes a `ReferenceError`.",
    },
    {
      href: '/js-track/core-fundamentals/variable-scope-and-hoisting/page.mdx#temporal-dead-zone-in-js',
      title: 'Temporal Dead Zone in JS',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What is the Temporal Dead Zone (TDZ) in JavaScript?',
      answer:
        'The Temporal Dead Zone is the period between when a variable declared with `let` or `const` is hoisted and when it is initialized. During the TDZ, accessing the variable results in a `ReferenceError`. This enforces the correct order of variable declaration and initialization, preventing variables from being used before they are defined.',
    },
    {
      href: '/js-track/core-fundamentals/variable-scope-and-hoisting/page.mdx#reassigning-let-and-const',
      title: 'Reassigning let and Const',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Can you reassign and redeclare variables declared with `let` and `const`?',
      answer:
        '- **`let`**: Variables declared with `let` can be reassigned but cannot be redeclared in the same scope. Attempting to redeclare results in a `SyntaxError`.\n- **`const`**: Variables declared with `const` cannot be reassigned or redeclared. They must be initialized at the time of declaration, and attempting to reassign results in a `TypeError`.',
    },
    {
      href: '/js-track/core-fundamentals/variable-scope-and-hoisting/page.mdx#understanding-variable-scope',
      title: 'Understanding Variable Scope',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'Why should you prefer using `const` and `let` over `var`?',
      answer:
        'Using `const` and `let` helps prevent common pitfalls associated with `var`, such as accidental redeclarations and scope leakage due to function scoping. `let` and `const` provide block-level scoping, which aligns more closely with other programming languages and helps maintain cleaner, more predictable code. Additionally, `const` enforces immutability for primitive values, promoting better coding practices.',
    },
  ],
}

export const TYPESCRIPT_INTRODUCTION = {
  advancedTypes: [
    {
      href: '/js-track/typescript-introduction/advanced-types/page.mdx#union-types-in-typescript',
      title: 'Union Types in TypeScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'What are union types in TypeScript, and when would you use them?',
      answer:
        '- Union types allow a variable to be one of several types, defined using the `|` operator.\n- They are used when a value can be of multiple types and you want to enforce type safety while accommodating different possible types.\n- **Example**:\n\n     ```typescript\n     type ID = number | string\n     let userId: ID\n     ```',
    },
    {
      href: '/js-track/typescript-introduction/advanced-types/page.mdx#intersection-types-explained',
      title: 'Intersection Types Explained',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question: 'Explain intersection types and provide a use case.',
      answer:
        "- Intersection types combine multiple types into one, requiring that a value satisfies all included types, using the `&` operator.\n- They are useful when you want to merge properties from multiple types or interfaces.\n- **Example**:\n\n     ```typescript\n     interface Person {\n       name: string\n     }\n     interface Employee {\n       employeeId: number\n     }\n     type Staff = Person & Employee\n     let staffMember: Staff = { name: 'Alice', employeeId: 123 }\n     ```",
    },
    {
      href: '/js-track/typescript-introduction/advanced-types/page.mdx#type-guards-in-typescript',
      title: 'Type Guards in TypeScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What are type guards, and how do they help in TypeScript?',
      answer:
        '- Type guards are expressions that perform runtime checks to refine the type of a variable within a specific scope.\n- They help TypeScript understand what type a variable is, enabling safe property access and method calls.\n- Common type guards include `typeof`, `instanceof`, and custom type guards using type predicates.',
    },
    {
      href: '/js-track/typescript-introduction/advanced-types/page.mdx#typescript-control-flow-analysis',
      title: 'TypeScript Control Flow Analysis',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        "How does TypeScript's control flow analysis assist in type narrowing?",
      answer:
        '- TypeScript uses control flow analysis to track the types of variables across different code paths.\n- Based on conditions and type guards, it narrows down the possible types of a variable within specific blocks.\n- This ensures type safety and allows for more precise type checking.',
    },
    {
      href: '/js-track/typescript-introduction/advanced-types/page.mdx#what-are-discriminated-unions',
      title: 'What are Discriminated Unions?',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Can you explain what discriminated unions are and their benefits?',
      answer:
        "- Discriminated unions are union types that have a common discriminant property with a literal type.\n- They allow TypeScript to narrow types based on the value of the discriminant.\n- Benefits include exhaustive type checking and simplified type guards.\n- **Example**:\n\n     ```typescript\n     interface Circle {\n       kind: 'circle'\n       radius: number\n     }\n     interface Square {\n       kind: 'square'\n       size: number\n     }\n     type Shape = Circle | Square\n     ```",
    },
  ],
  basicTypes: [
    {
      href: '/js-track/typescript-introduction/basic-types-and-type-annotations/page.mdx#typescript-primitive-types',
      title: 'TypeScript Primitive Types',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What are the basic primitive types in TypeScript?',
      answer:
        '- **Number**: Represents numeric values (both integer and floating-point).\n- **String**: Represents text data.\n- **Boolean**: Represents logical values `true` and `false`.\n- **Null**: Represents the absence of any object value.\n- **Undefined**: Denotes a variable that has not been assigned a value.',
    },
    {
      href: '/js-track/typescript-introduction/basic-types-and-type-annotations/page.mdx#type-differences-in-ts',
      title: 'Type Differences in TS',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Explain the difference between `any` and `unknown` types in TypeScript.',
      answer:
        '- **`any`**:\n\n     - Opts out of type checking.\n     - Allows any operation on the variable without type errors.\n     - Should be used sparingly as it can lead to runtime errors.\n\n- **`unknown`**:\n\n     - Similar to `any`, but safer.\n     - Requires type checking before performing operations.\n     - Encourages type safety by enforcing type checks.',
    },
    {
      href: '/js-track/typescript-introduction/basic-types-and-type-annotations/page.mdx#type-inference-basics',
      title: 'Type Inference Basics',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question: 'What is type inference in TypeScript, and how does it work?',
      answer:
        '- Type inference is the ability of TypeScript to automatically determine the type of a variable or expression based on its value or context.\n- It works by analyzing the assigned value and the context in which a variable or function is used.\n- Type inference reduces the need for explicit type annotations when the type is obvious.',
    },
    {
      href: '/js-track/typescript-introduction/basic-types-and-type-annotations/page.mdx#defining-and-using-tuples',
      title: 'Defining and Using Tuples',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'How do you define a tuple in TypeScript, and when would you use it?',
      answer:
        "- **Defining a Tuple**:\n\n     ```typescript\n     let tupleName: [type1, type2, ..., typeN] = [value1, value2, ..., valueN];\n     ```\n\n- **Example**:\n\n     ```typescript\n     let person: [string, number] = ['Alice', 25]\n     ```\n\n- **Usage**:\n\n     - Tuples are used when you need to represent an array with a fixed number of elements of specific types.\n     - They are useful for representing structured data where the position and type of each element are known.",
    },
    {
      href: '/js-track/typescript-introduction/basic-types-and-type-annotations/page.mdx#the-dangers-of-any-type',
      title: 'The Dangers of Any Type',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question: 'Why should you avoid overusing the `any` type in TypeScript?',
      answer:
        "- Overusing `any` defeats the purpose of TypeScript's type safety.\n- It disables type checking, allowing for potential runtime errors.\n- It makes code less readable and maintainable.\n- Prefer using specific types or `unknown` to maintain type safety.",
    },
  ],
  compiler: [
    {
      href: '/js-track/typescript-introduction/compiler-api/page.mdx#typescript-compiler-api',
      title: 'TypeScript Compiler API',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question: 'What is the TypeScript Compiler API, and why is it useful?',
      answer:
        "- The TypeScript Compiler API allows developers to interact with the TypeScript compiler programmatically.\n- It provides access to the compiler's internal processes, enabling code analysis, AST manipulation, code transformation, and code generation.\n- Useful for creating custom tools like linters, code formatters, code generators, and implementing custom compile-time transformations.",
    },
    {
      href: '/js-track/typescript-introduction/compiler-api/page.mdx#traversing-typescript-asts',
      title: 'Traversing TypeScript ASTs',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain how you can traverse and modify the AST in TypeScript.',
      answer:
        '- Traversal is typically done using the visitor pattern, recursively visiting each node using functions like `ts.forEachChild` or `ts.visitEachChild`.\n- Modification involves creating new nodes or updating existing ones using factory functions provided by `ts.factory`.\n- By returning new nodes from visitor functions, you can replace nodes in the AST, effectively modifying the code.',
    },
    {
      href: '/js-track/typescript-introduction/compiler-api/page.mdx#custom-transformers-in-typescript',
      title: 'Custom Transformers in TypeScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are custom transformers in TypeScript, and how do they work?',
      answer:
        '- Custom transformers are functions that receive and return AST nodes, allowing you to modify code during the compilation process.\n- They are implemented as transformer factory functions that take a `TransformationContext` and return a transformer function.\n- They are applied during the compilation process, modifying the AST before the code is emitted.',
    },
    {
      href: '/js-track/typescript-introduction/compiler-api/page.mdx#customizing-tsc-transformers',
      title: 'Customizing TSC Transformers',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Can you use custom transformers with the TypeScript compiler (`tsc`) directly? If not, how can you apply them?',
      answer:
        '- The TypeScript compiler (`tsc`) does not support custom transformers directly via command-line options.\n- To apply custom transformers, you can use the Compiler API to create a custom compilation script that invokes the compiler programmatically with the transformers.\n- Alternatively, integrate the transformers into build tools like Webpack (using `ts-loader`) or Gulp.',
    },
    {
      href: '/js-track/typescript-introduction/compiler-api/page.mdx#customizing-typescript-compiler-tools',
      title: 'Customizing TypeScript Compiler Tools',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Describe a scenario where you would use the TypeScript Compiler API to create a custom tool.',
      answer:
        '- **Scenario**: Creating a custom linter that enforces specific coding standards or detects code patterns not covered by existing linters.\n- By parsing the code into an AST and traversing it, you can analyze code structures, detect undesirable patterns, and report them.\n- Another scenario is generating code documentation by extracting comments and code structures from the AST.',
    },
  ],
  declarations: [
    {
      href: '/js-track/typescript-introduction/declaration-files-and-ambient-declarations/page.mdx#declaration-files-in-typescript',
      title: 'Declaration Files in TypeScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is a declaration file in TypeScript, and why is it important?',
      answer:
        "- A declaration file (`.d.ts`) provides type information about a JavaScript library or code, allowing TypeScript to understand and type-check code that interacts with it.\n- It's important because it enables type safety, improved code intelligence, and seamless integration of JavaScript libraries into TypeScript projects.",
    },
    {
      href: '/js-track/typescript-introduction/declaration-files-and-ambient-declarations/page.mdx#typescript-declaration-types',
      title: 'TypeScript Declaration Types',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Explain the difference between ambient declarations and regular TypeScript declarations.',
      answer:
        '- **Ambient Declarations**:\n     - Use the `declare` keyword.\n     - Describe types that are provided by external code (e.g., global variables, functions from a JavaScript library).\n     - Do not produce JavaScript output.\n- **Regular Declarations**:\n     - Define types and implementations within TypeScript code.\n     - Are compiled into JavaScript when the project is built.',
    },
    {
      href: '/js-track/typescript-introduction/declaration-files-and-ambient-declarations/page.mdx#consuming-javascript-libraries-without-types',
      title: 'Consuming JavaScript Libraries Without Types',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How do you consume a JavaScript library that does not have TypeScript type definitions?',
      answer:
        "- **Options**:\n     - **Search for Type Definitions**: Check if type definitions are available in the DefinitelyTyped repository (`@types` packages).\n     - **Write Custom Declaration Files**: Create your own `.d.ts` file to provide necessary type information.\n     - **Use `require` with `any`**: Import the library using `const lib = require('lib-name');` and cast it to `any` (not recommended due to loss of type safety).",
    },
    {
      href: '/js-track/typescript-introduction/declaration-files-and-ambient-declarations/page.mdx#purpose-of-declare-keyword',
      title: 'Purpose of Declare Keyword',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What is the purpose of the `declare` keyword in TypeScript?',
      answer:
        '- The `declare` keyword is used to indicate that the variable, function, class, or module exists and is provided by external code.\n- It tells the TypeScript compiler about the existence and type of an entity without providing an implementation.',
    },
    {
      href: '/js-track/typescript-introduction/declaration-files-and-ambient-declarations/page.mdx#writing-a-declaration-file',
      title: 'Writing a Declaration File',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Can you explain how to write a declaration file for a module-based JavaScript library?',
      answer:
        "- **Steps**:\n\n     - Create a `.d.ts` file named after the library (e.g., `library-name.d.ts`).\n     - Use a `declare module 'library-name'` block.\n     - Inside the module block, declare exported functions, classes, interfaces, etc.\n     - Use `export` statements to match the library's API.\n\n- **Example**:\n\n     ```typescript\n     // library-name.d.ts\n     declare module 'library-name' {\n       export function functionName(param: ParamType): ReturnType\n       export class ClassName {\n         // Declarations\n       }\n     }\n     ```",
    },
  ],
  decorators: [
    {
      href: '/js-track/typescript-introduction/decorators-and-metadata/page.mdx#typescript-decorator-use-cases',
      title: 'Typescript Decorator Use Cases',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is a decorator in TypeScript, and what are its use cases?',
      answer:
        '- A decorator is a special declaration that can be attached to classes, methods, properties, or parameters to modify their behavior.\n- Use cases include adding metadata, logging, validation, dependency injection, and modifying class or method behavior without altering the original code.',
    },
    {
      href: '/js-track/typescript-introduction/decorators-and-metadata/page.mdx#typescript-decorator-tutorial',
      title: 'TypeScript Decorator Tutorial',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain how to create and apply a method decorator in TypeScript.',
      answer:
        "- **Creating a Method Decorator**:\n\n     ```typescript\n     function methodDecorator(\n       target: Object,\n       propertyKey: string | symbol,\n       descriptor: PropertyDescriptor,\n     ): PropertyDescriptor | void {\n       // Decorator logic\n     }\n     ```\n\n- **Applying a Method Decorator**:\n\n     ```typescript\n     class MyClass {\n       @methodDecorator\n       myMethod() {\n         // Method body\n       }\n     }\n     ```\n\n- The decorator function can modify the method's behavior by changing the descriptor.",
    },
    {
      href: '/js-track/typescript-introduction/decorators-and-metadata/page.mdx#metadata-reflection-api-in-ts',
      title: 'Metadata Reflection API in TS',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is the Metadata Reflection API in TypeScript, and how is it used with decorators?',
      answer:
        '- The Metadata Reflection API allows defining and retrieving metadata about program elements at runtime.\n- It is used with decorators to store and access metadata, such as type information, which can be used for dependency injection, validation, etc.\n- Requires the `reflect-metadata` library and enabling `emitDecoratorMetadata` in `tsconfig.json`.',
    },
    {
      href: '/js-track/typescript-introduction/decorators-and-metadata/page.mdx#class-decorators-vs-methods',
      title: 'Class Decorators vs Methods',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Describe the difference between a class decorator and a method decorator.',
      answer:
        "- **Class Decorator**:\n     - Applied to a class declaration.\n     - Receives the constructor function as its argument.\n     - Can modify or replace the class constructor.\n- **Method Decorator**:\n     - Applied to a method within a class.\n     - Receives the target object, method name, and property descriptor.\n     - Can modify the method's behavior by altering the descriptor.",
    },
    {
      href: '/js-track/typescript-introduction/decorators-and-metadata/page.mdx#typescript-dependency-injection',
      title: 'TypeScript Dependency Injection',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How can decorators be used to implement dependency injection in TypeScript?',
      answer:
        '- Decorators can be used to annotate classes and constructor parameters with metadata about dependencies.\n- For example, an `@injectable` decorator can mark a class as available for injection, and an `@inject` decorator can specify which dependencies to inject.\n- At runtime, a dependency injection framework can use the metadata to resolve and inject the required instances.',
    },
  ],
  enums: [
    {
      href: '/js-track/typescript-introduction/enums-and-literal-types/page.mdx#enums-in-typescript',
      title: 'Enums in TypeScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What is an enum in TypeScript, and why would you use one?',
      answer:
        '- An enum is a way to define a set of named constants, which can be either numeric or string values.\n- Enums provide type safety, improve code readability, and group related constants.\n- They help prevent invalid values by restricting variables to predefined options.',
    },
    {
      href: '/js-track/typescript-introduction/enums-and-literal-types/page.mdx#typescript-enum-difference',
      title: 'Typescript Enum Difference',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Explain the difference between numeric enums and string enums in TypeScript.',
      answer:
        '- **Numeric Enums**:\n     - Default in TypeScript.\n     - Members are assigned numeric values starting from `0` by default.\n     - Support auto-incrementing and reverse mapping.\n- **String Enums**:\n     - Members are initialized with string literals.\n     - No auto-incrementing; each member must have an explicit string value.\n     - Do not support reverse mapping.\n     - Useful for readability and serialization.',
    },
    {
      href: '/js-track/typescript-introduction/enums-and-literal-types/page.mdx#literal-types-in-typescript',
      title: 'Literal Types in TypeScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are literal types in TypeScript, and how do they differ from enums?',
      answer:
        '- Literal types allow variables to be restricted to exact values (e.g., specific strings or numbers).\n- They are defined using type aliases and unions of literal values.\n- Enums define a type and a set of named constants, which can be used as values.\n- Literal types are more flexible and can be combined with other types to create complex types.',
    },
    {
      href: '/js-track/typescript-introduction/enums-and-literal-types/page.mdx#typescript-discriminated-unions-benefits',
      title: 'TypeScript Discriminated Unions Benefits',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How can discriminated unions be used in TypeScript, and what are their benefits?',
      answer:
        '- Discriminated unions combine union types with literal types or enums to create a type-safe way of handling different variants of a type.\n- Each variant has a common property (the discriminant) with a literal type.\n- Benefits include:\n     - Type safety through exhaustive checks.\n     - Compiler assistance in ensuring all cases are handled.\n     - Clear and maintainable code structure.',
    },
    {
      href: '/js-track/typescript-introduction/enums-and-literal-types/page.mdx#avoiding-heterogeneous-enums',
      title: 'Avoiding Heterogeneous Enums',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'Why might you avoid using heterogeneous enums in TypeScript?',
      answer:
        "- Heterogeneous enums mix numeric and string values.\n- They can lead to confusion and inconsistency.\n- May introduce unexpected behavior or bugs.\n- It's generally better to stick to either numeric or string enums for clarity and maintainability.",
    },
  ],
  generics: [
    {
      href: '/js-track/typescript-introduction/generics-and-constraints/page.mdx#typescript-generics-basics',
      title: 'TypeScript Generics Basics',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What are generics in TypeScript, and why are they useful?',
      answer:
        '- Generics allow the creation of components that can work with a variety of types while providing type safety.\n- They enable writing reusable and flexible code.\n- Generics provide a way to parameterize types, making code more maintainable and reducing duplication.',
    },
    {
      href: '/js-track/typescript-introduction/generics-and-constraints/page.mdx#applying-constraints-to-types',
      title: 'Applying Constraints to Types',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'How do you apply constraints to a generic type in TypeScript?',
      answer:
        '- Constraints are applied using the `extends` keyword.\n- It restricts the types that can be used as generic parameters.\n\n     ```typescript\n     function functionName<T extends ConstraintType>(param: T): ReturnType {\n       // Function body\n     }\n     ```\n\n- This ensures that the generic type has certain properties or methods.',
    },
    {
      href: '/js-track/typescript-introduction/generics-and-constraints/page.mdx#using-keyof-in-generics',
      title: 'Using Keyof in Generics',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain the use of the `keyof` operator in TypeScript generics.',
      answer:
        '- The `keyof` operator takes an object type and produces a union of its keys.\n- It is used to constrain generic types to the keys of a given type.\n\n     ```typescript\n     function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {\n       return obj[key]\n     }\n     ```\n\n- This ensures that only valid property keys are used.',
    },
    {
      href: '/js-track/typescript-introduction/generics-and-constraints/page.mdx#typescript-class-with-constraints',
      title: 'TypeScript Class with Constraints',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Can you provide an example of a generic class with a constraint in TypeScript?',
      answer:
        '```typescript\n   interface Printable {\n     print(): void\n   }\n\n   class Document<T extends Printable> {\n     content: T\n     constructor(content: T) {\n       this.content = content\n     }\n     printContent(): void {\n       this.content.print()\n     }\n   }\n   ```\n\n- In this example, the generic class `Document` is constrained to types that implement the `Printable` interface.',
    },
    {
      href: '/js-track/typescript-introduction/generics-and-constraints/page.mdx#benefits-of-generics-vs-any',
      title: 'Benefits of Generics vs Any',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'What are the benefits of using generics over the `any` type in TypeScript?',
      answer:
        '- Generics provide type safety by ensuring that the types used are consistent and valid.\n- They maintain type information, enabling better tooling support, such as autocompletion and type checking.\n- Using `any` disables type checking, which can lead to runtime errors.\n- Generics make code more maintainable and self-documenting.',
    },
  ],
  interfaces: [
    {
      href: '/js-track/typescript-introduction/interfaces-and-type-aliases/page.mdx#typescript-interface-vs-aliases',
      title: 'Typescript Interface vs Aliases',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is the purpose of interfaces in TypeScript, and how do they differ from type aliases?',
      answer:
        '- **Interfaces**:\n\n     - Define contracts for objects, functions, and classes.\n     - Describe the structure and types of object properties.\n     - Can be extended and implemented.\n     - Support declaration merging.\n\n- **Type Aliases**:\n\n     - Create new names for existing types.\n     - Can define primitives, unions, intersections, and other types.\n     - Cannot be reopened to add new properties.\n     - Cannot be implemented or extended in the same way as interfaces.',
    },
    {
      href: '/js-track/typescript-introduction/interfaces-and-type-aliases/page.mdx#defining-optional-properties',
      title: 'Defining Optional Properties',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'How do you define optional and readonly properties in an interface?',
      answer:
        '- **Optional Properties**:\n\n     - Use the `?` symbol after the property name.\n\n     ```typescript\n     interface User {\n       id: number\n       name?: string // Optional property\n     }\n     ```\n\n- **Readonly Properties**:\n\n     - Use the `readonly` modifier before the property name.\n\n     ```typescript\n     interface Point {\n       readonly x: number\n       readonly y: number\n     }\n     ```',
    },
    {
      href: '/js-track/typescript-introduction/interfaces-and-type-aliases/page.mdx#typescript-multiple-interface-inheritance',
      title: 'TypeScript Multiple Interface Inheritance',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Can interfaces extend multiple interfaces in TypeScript? Provide an example.',
      answer:
        "- Yes, interfaces can extend multiple interfaces.\n\n- **Example**:\n\n     ```typescript\n     interface A {\n       propertyA: string\n     }\n\n     interface B {\n       propertyB: number\n     }\n\n     interface C extends A, B {\n       propertyC: boolean\n     }\n\n     const obj: C = {\n       propertyA: 'Hello',\n       propertyB: 42,\n       propertyC: true,\n     }\n     ```",
    },
    {
      href: '/js-track/typescript-introduction/interfaces-and-type-aliases/page.mdx#type-aliases-vs-interfaces',
      title: 'Type Aliases vs Interfaces',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'When should you use a type alias over an interface in TypeScript?',
      answer:
        '- Use type aliases when:\n\n     - Defining primitives, unions, intersections, or tuples.\n     - You need flexibility in type definitions.\n     - You are working with complex types that interfaces cannot represent.\n\n- Use interfaces when:\n\n     - Defining object shapes.\n     - You need to extend or implement types.\n     - You want to take advantage of declaration merging.',
    },
    {
      href: '/js-track/typescript-introduction/interfaces-and-type-aliases/page.mdx#enforcing-class-contracts',
      title: 'Enforcing Class Contracts',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How can interfaces be used to enforce class contracts in TypeScript?',
      answer:
        '- Classes can implement interfaces to ensure they provide specific methods and properties.\n\n- The `implements` keyword is used to indicate that a class adheres to an interface.\n\n- **Example**:\n\n     ```typescript\n     interface Logger {\n       log(message: string): void\n     }\n\n     class ConsoleLogger implements Logger {\n       log(message: string): void {\n         console.log(message)\n       }\n     }\n     ```',
    },
  ],
  conditionalTypes: [
    {
      href: '/js-track/typescript-introduction/mapped-and-conditional-types/page.mdx#understanding-typescript-keyof',
      title: 'Understanding TypeScript Keyof',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is the `keyof` operator in TypeScript, and how is it used?',
      answer:
        "- The `keyof` operator takes an object type and produces a union of its keys.\n- It is used to create dynamic and type-safe property accessors or transformations.\n- **Example**:\n\n     ```typescript\n     interface Person {\n       name: string\n       age: number\n     }\n\n     type PersonKeys = keyof Person // 'name' | 'age'\n     ```",
    },
    {
      href: '/js-track/typescript-introduction/mapped-and-conditional-types/page.mdx#type-of-operator-explanation',
      title: 'Type of Operator Explanation',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'Explain how the `typeof` operator works in a type context.',
      answer:
        "- When used in a type context, `typeof` obtains the type of a value or variable.\n- It allows you to create type definitions based on existing values.\n- **Example**:\n\n     ```typescript\n     let person = { name: 'Alice', age: 30 }\n     type PersonType = typeof person // { name: string; age: number; }\n     ```",
    },
    {
      href: '/js-track/typescript-introduction/mapped-and-conditional-types/page.mdx#mapped-types-explained',
      title: 'Mapped Types Explained',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What are mapped types, and when would you use them?',
      answer:
        '- Mapped types create new types by transforming each property of an existing type.\n- They are used to apply modifications, such as making properties optional or readonly.\n- **Example**:\n\n     ```typescript\n     type Readonly<T> = {\n       readonly [P in keyof T]: T[P]\n     }\n     ```',
    },
    {
      href: '/js-track/typescript-introduction/mapped-and-conditional-types/page.mdx#conditional-type-usage',
      title: 'Conditional Type Usage',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'Describe conditional types and provide a use case.',
      answer:
        '- Conditional types allow types to be defined based on conditions, similar to ternary expressions.\n- They are useful for type transformations and creating types that depend on other types.\n- **Example**:\n\n     ```typescript\n     type NonNullable<T> = T extends null | undefined ? never : T\n\n     type A = NonNullable<string | null> // string\n     ```',
    },
    {
      href: '/js-track/typescript-introduction/mapped-and-conditional-types/page.mdx#distributive-conditional-types',
      title: 'Distributive Conditional Types',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question: 'How do distributive conditional types work in TypeScript?',
      answer:
        "- Distributive conditional types automatically distribute over union types, applying the conditional type to each member of the union individually.\n- This behavior is utilized in utility types like `Exclude` and `Extract`.\n- **Example**:\n\n     ```typescript\n     type T0 = Exclude<'a' | 'b' | 'c', 'a' | 'f'> // 'b' | 'c'\n     ```",
    },
  ],
  migrationStrategies: [
    {
      href: '/js-track/typescript-introduction/migration-strategies/page.mdx#migrating-to-typescript',
      title: 'Migrating to TypeScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are some strategies for migrating a large JavaScript codebase to TypeScript?',
      answer:
        '- **Incremental Migration**: Migrate codebase gradually, starting with key modules.\n- **Using `allowJs`**: Include JavaScript files in the TypeScript project.\n- **Enable `checkJs`**: Perform type checking on JavaScript files.\n- **Leveraging JSDoc**: Use JSDoc comments for type annotations.\n- **Automated Tools**: Use tools like `ts-migrate` to automate parts of the migration.',
    },
    {
      href: '/js-track/typescript-introduction/migration-strategies/page.mdx#integrating-typescript-without-disruption',
      title: 'Integrating TypeScript Without Disruption',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'How can you integrate TypeScript into a JavaScript project without disrupting development?',
      answer:
        '- **Allow JavaScript Files**: Use the `allowJs` compiler option to include JavaScript files.\n- **Gradual Renaming**: Rename `.js` files to `.ts` incrementally.\n- **Maintain Build Process**: Ensure existing build and deployment processes continue to work.\n- **Type Checking JavaScript**: Enable `checkJs` to catch errors in JavaScript files.',
    },
    {
      href: '/js-track/typescript-introduction/migration-strategies/page.mdx#benefits-of-jsdoc-migration',
      title: 'Benefits of JSDoc Migration',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What are the benefits of using JSDoc comments during the migration to TypeScript?',
      answer:
        '- **Type Checking**: Provides type annotations without changing file extensions.\n- **Documentation**: Improves code documentation and readability.\n- **Ease of Migration**: Serves as a stepping stone before converting to TypeScript syntax.\n- **IDE Support**: Enhances code completion and hints in editors.',
    },
    {
      href: '/js-track/typescript-introduction/migration-strategies/page.mdx#minimizing-any-type-usage',
      title: 'Minimizing Any Type Usage',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain how the `any` type affects TypeScript code and how to minimize its usage during migration.',
      answer:
        '- **Effect of `any`**: Disables type checking for variables, potentially introducing runtime errors.\n- **Minimizing Usage**:\n     - Use specific types or interfaces.\n     - Employ type inference where possible.\n     - Replace `any` with `unknown` to enforce type checks before usage.\n     - Incrementally refine types as more information becomes available.',
    },
    {
      href: '/js-track/typescript-introduction/migration-strategies/page.mdx#migrating-third-party-libraries',
      title: 'Migrating Third-Party Libraries',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'What challenges might you face when migrating third-party libraries, and how can you address them?',
      answer:
        '- **Challenges**:\n     - Missing type definitions for some libraries.\n     - Incompatibility with TypeScript.\n- **Solutions**:\n     - Install type definitions from DefinitelyTyped (`@types` packages).\n     - Create custom declaration files (`.d.ts`) for missing types.\n     - Use `declare module` to define modules with minimal type information.\n     - Consider alternatives or updates for unsupported libraries.',
    },
  ],
  namespacesAndModules: [
    {
      href: '/js-track/typescript-introduction/namespaces-and-modules/page.mdx#typescript-namespace-vs-modules',
      title: 'TypeScript Namespace vs Modules',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are the main differences between namespaces and modules in TypeScript?',
      answer:
        '- **Namespaces**:\n     - Use the `namespace` keyword.\n     - Group code under a named identifier within a single file or across multiple files.\n     - Do not produce module loaders; code is available globally.\n     - Useful in environments without module support.\n- **Modules**:\n     - Use `import` and `export` statements.\n     - Code is encapsulated within files; must be explicitly imported.\n     - Leverage module systems like CommonJS or ES Modules.\n     - Preferred in modern development for better encapsulation and dependency management.',
    },
    {
      href: '/js-track/typescript-introduction/namespaces-and-modules/page.mdx#typescript-module-resolution-strategies',
      title: 'TypeScript Module Resolution Strategies',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'How does TypeScript resolve modules, and what are the module resolution strategies available?',
      answer:
        '- TypeScript resolves modules by mapping module names to files on the disk using module resolution strategies.\n- **Module Resolution Strategies**:\n     - **Classic**:\n       - Default in older TypeScript versions.\n       - Simplistic, looks for files relative to the importing file.\n     - **Node**:\n       - Mimics Node.js resolution algorithm.\n       - Searches `node_modules` directories and respects `package.json` `main` fields.\n- The strategy can be configured using the `moduleResolution` compiler option in `tsconfig.json`.',
    },
    {
      href: '/js-track/typescript-introduction/namespaces-and-modules/page.mdx#choosing-namespaces-vs-modules',
      title: 'Choosing Namespaces vs Modules',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'When should you use namespaces over modules in TypeScript?',
      answer:
        '- Use namespaces when:\n     - Targeting environments without module support (e.g., older browsers).\n     - Working on legacy codebases that already use namespaces.\n     - Developing small projects where module bundling is unnecessary.\n- However, in modern development, modules are generally preferred due to better encapsulation and compatibility with module loaders and bundlers.',
    },
    {
      href: '/js-track/typescript-introduction/namespaces-and-modules/page.mdx#typescript-barrel-files-benefits',
      title: 'TypeScript Barrel Files Benefits',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What are barrel files in TypeScript, and what are their benefits?',
      answer:
        '- **Barrel Files**:\n     - A barrel file aggregates exports from several modules into a single module.\n     - Typically named `index.ts`.\n- **Benefits**:\n     - Simplifies import statements by providing a single point of access.\n     - Improves code organization by grouping related exports.\n     - Enhances maintainability by centralizing module exports.',
    },
    {
      href: '/js-track/typescript-introduction/namespaces-and-modules/page.mdx#configuring-path-aliases-in-typescript',
      title: 'Configuring Path Aliases in TypeScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain how to configure path aliases in TypeScript and their advantages.',
      answer:
        '- **Configuring Path Aliases**:\n     - Use the `baseUrl` and `paths` options in `tsconfig.json`.\n     - Example:\n\n       ```json\n       {\n         "compilerOptions": {\n           "baseUrl": "./",\n           "paths": {\n             "@models/*": ["src/models/*"],\n             "@controllers/*": ["src/controllers/*"]\n           }\n         }\n       }\n       ```\n\n- **Advantages**:\n     - Simplifies import paths, avoiding long relative paths like `../../../`.\n     - Improves code readability.\n     - Makes refactoring easier, as the alias abstracts the physical file path.',
    },
  ],
  projectConfiguration: [
    {
      href: '/js-track/typescript-introduction/project-configuration-and-build-tools/page.mdx#configuring-typescript-projects',
      title: 'Configuring TypeScript Projects',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is the purpose of the `tsconfig.json` file in a TypeScript project?',
      answer:
        '- The `tsconfig.json` file specifies the root files and compiler options required to compile a TypeScript project.\n- It configures the TypeScript compiler (`tsc`), defines which files are included or excluded, and controls how TypeScript code is transformed into JavaScript.',
    },
    {
      href: '/js-track/typescript-introduction/project-configuration-and-build-tools/page.mdx#configuring-module-resolution',
      title: 'Configuring Module Resolution',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'How can you configure module resolution and path aliases in TypeScript?',
      answer:
        '- By setting the `baseUrl` and `paths` options in `tsconfig.json`.\n- **Example**:\n\n     ```json\n     "compilerOptions": {\n       "baseUrl": "./",\n       "paths": {\n         "@models/*": ["src/models/*"],\n         "@utils/*": ["src/utils/*"]\n       }\n     }\n     ```\n\n- This allows for simplified import statements using aliases.',
    },
    {
      href: '/js-track/typescript-introduction/project-configuration-and-build-tools/page.mdx#integrating-typescript-with-webpack',
      title: 'Integrating TypeScript with Webpack',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Explain how to integrate TypeScript with Webpack for bundling.',
      answer:
        "- Install required packages: `webpack`, `webpack-cli`, `typescript`, and `ts-loader`.\n- Configure `webpack.config.js` to use `ts-loader` for handling `.ts` files.\n- **Example**:\n\n     ```javascript\n     module.exports = {\n       entry: './src/index.ts',\n       // ... other config options\n       module: {\n         rules: [\n           {\n             test: /\\.ts$/,\n             use: 'ts-loader',\n             exclude: /node_modules/,\n           },\n         ],\n       },\n     };\n     ```",
    },
    {
      href: '/js-track/typescript-introduction/project-configuration-and-build-tools/page.mdx#typescript-loader-comparison',
      title: 'TypeScript Loader Comparison',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is the difference between using `ts-loader` and `babel-loader` for TypeScript files?',
      answer:
        '- **`ts-loader`**:\n\n     - Uses the TypeScript compiler (`tsc`) for transpilation.\n     - Performs type checking during the build process.\n     - Supports all TypeScript features.\n\n- **`babel-loader`` with `@babel/preset-typescript`**:\n\n     - Uses Babel for transpilation.\n     - Does not perform type checking; type checking must be done separately.\n     - May not support all TypeScript features (e.g., some experimental features).',
    },
    {
      href: '/js-track/typescript-introduction/project-configuration-and-build-tools/page.mdx#enabling-strict-type-checking',
      title: 'Enabling Strict Type Checking',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How can you enable strict type checking in TypeScript, and why is it recommended?',
      answer:
        '- Enable the `strict` compiler option in `tsconfig.json`:\n\n     ```json\n     "compilerOptions": {\n       "strict": true\n     }\n     ```\n\n- This enables all strict type checking options.\n- It is recommended because it helps catch more errors at compile time, leading to safer and more reliable code.',
    },
  ],
  typeGuards: [
    {
      href: '/js-track/typescript-introduction/type-guards-and-type-narrowing/page.mdx#type-guard-functions-in-typescript',
      title: 'Type Guard Functions in TypeScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is a type guard in TypeScript, and how does it differ from a type assertion?',
      answer:
        "- A type guard is an expression that performs a runtime check to narrow the type of a variable within a specific scope, informing the TypeScript compiler about the type.\n- A type assertion tells the compiler to treat a variable as a certain type without any checks, potentially leading to runtime errors if incorrect.\n- Type guards enhance type safety by validating types, whereas type assertions override the compiler's type inference.",
    },
    {
      href: '/js-track/typescript-introduction/type-guards-and-type-narrowing/page.mdx#creating-type-guards-in-typescript',
      title: 'Creating Type Guards in TypeScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'How do you create a user-defined type guard in TypeScript?',
      answer:
        "- By defining a function that performs a type check and returns a type predicate in the form `parameterName is Type`.\n- **Example**:\n\n     ```typescript\n     function isString(value: any): value is string {\n       return typeof value === 'string'\n     }\n     ```",
    },
    {
      href: '/js-track/typescript-introduction/type-guards-and-type-narrowing/page.mdx#what-is-discriminated-union',
      title: 'What is Discriminated Union?',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'Explain what discriminated unions are and provide an example.',
      answer:
        "- Discriminated unions are union types that have a common discriminant property with a literal type, allowing the compiler to narrow the type based on the value of that property.\n- **Example**:\n\n     ```typescript\n     interface Circle {\n       kind: 'circle'\n       radius: number\n     }\n\n     interface Square {\n       kind: 'square'\n       size: number\n     }\n\n     type Shape = Circle | Square\n     ```",
    },
    {
      href: '/js-track/typescript-introduction/type-guards-and-type-narrowing/page.mdx#type-script-never-type-purpose',
      title: 'Type Script Never Type Purpose',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is the purpose of the `never` type in TypeScript, and how is it used in exhaustiveness checking?',
      answer:
        '- The `never` type represents values that never occur, such as the return type of functions that always throw an error.\n- In exhaustiveness checking, `never` is used to ensure that all possible cases in a union are handled. If a variable is of type `never` in a `default` case, the compiler will error if there are unhandled types.\n- **Example**:\n\n     ```typescript\n     function assertNever(value: never): never {\n       throw new Error(`Unexpected value: ${value}`)\n     }\n     ```',
    },
    {
      href: '/js-track/typescript-introduction/type-guards-and-type-narrowing/page.mdx#type-guarding-with-in-operator',
      title: 'Type Guarding with In Operator',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'How does the `in` operator help in type guarding, and when would you use it?',
      answer:
        "- The `in` operator checks if an object has a specific property.\n- It helps in type guarding by narrowing the variable to types that have that property.\n- It's useful when dealing with union types that share some properties but differ in others.\n- **Example**:\n\n     ```typescript\n     if ('startDate' in staff) {\n       // staff is narrowed to types that have 'startDate'\n     }\n     ```",
    },
  ],
  typeInference: [
    {
      href: '/js-track/typescript-introduction/type-inference-and-compatibility/page.mdx#type-system-in-typescript',
      title: 'Type System in TypeScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is structural typing, and how does TypeScript use it for type compatibility?',
      answer:
        '- Structural typing is a type system where compatibility is determined by the actual structure (members) of the types, not their explicit names.\n- In TypeScript, types are compatible if their structures are compatible—if one type has at least the same members as another.\n- This allows for flexible assignment and interoperability between types with similar structures.',
    },
    {
      href: '/js-track/typescript-introduction/type-inference-and-compatibility/page.mdx#type-inference-in-typescript',
      title: 'Type Inference in TypeScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How does TypeScript infer types, and what are the benefits of type inference?',
      answer:
        '- TypeScript infers types based on the values and expressions used in the code.\n- For variables, the type is inferred from the assigned value.\n- For functions, return types can be inferred from the return statements.\n- Benefits include reduced code verbosity, improved readability, and maintaining type safety without explicit type annotations.',
    },
    {
      href: '/js-track/typescript-introduction/type-inference-and-compatibility/page.mdx#type-variance-in-typescript',
      title: 'Type Variance in TypeScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        "Explain the concept of variance in TypeScript's type compatibility.",
      answer:
        '- Variance describes how subtyping between more complex types relates to subtyping between their components.\n- **Covariance**: If type `A` is a subtype of `B`, then `Container<A>` is a subtype of `Container<B>`. Applies to return types.\n- **Contravariance**: If type `A` is a subtype of `B`, then `Consumer<B>` is a subtype of `Consumer<A>`. Applies to function parameter types.\n- **Bivariance**: TypeScript is bivariant in function parameters by default, allowing both covariance and contravariance, but this can be restricted with strict options.',
    },
    {
      href: '/js-track/typescript-introduction/type-inference-and-compatibility/page.mdx#function-type-compatibility-rules',
      title: 'Function Type Compatibility Rules',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'What are the rules for function type compatibility in TypeScript?',
      answer:
        "- Functions are compatible if their parameter types and return types are compatible.\n- Functions with fewer parameters can be assigned to functions expecting more parameters (parameters are optional from the target's perspective).\n- Return types must be compatible (covariant).\n- With strict function types enabled, function parameters are checked contravariantly.",
    },
    {
      href: '/js-track/typescript-introduction/type-inference-and-compatibility/page.mdx#typescript-class-compatibility',
      title: 'TypeScript Class Compatibility',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How does TypeScript handle compatibility between classes with private or protected members?',
      answer:
        '- Classes with private or protected members are only compatible if they originate from the same declaration.\n- This means that even if two classes have identical structures, they are not compatible if their private or protected members are from different declarations.\n- This ensures that the encapsulation provided by private and protected members is respected.',
    },
  ],
  typeLevelProgramming: [
    {
      href: '/js-track/typescript-introduction/type-level-programming/page.mdx#recursive-types-in-typescript',
      title: 'Recursive Types in TypeScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is a recursive type in TypeScript, and when would you use it?',
      answer:
        "- A recursive type is a type that references itself in its definition.\n- It's used to model recursive data structures like trees, linked lists, and nested objects.\n- **Example**:\n\n     ```typescript\n     type JSONValue =\n       | string\n       | number\n       | boolean\n       | null\n       | JSONValue[]\n       | { [key: string]: JSONValue }\n     ```",
    },
    {
      href: '/js-track/typescript-introduction/type-level-programming/page.mdx#understanding-typescript-inferences',
      title: 'Understanding TypeScript Inferences',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'Explain how the `infer` keyword works in TypeScript.',
      answer:
        '- The `infer` keyword is used within conditional types to introduce a type variable that can be referenced in the true branch of the conditional type.\n- It allows for extracting and manipulating types based on the structure of other types.\n- **Example**:\n\n     ```typescript\n     type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any\n     ```',
    },
    {
      href: '/js-track/typescript-introduction/type-level-programming/page.mdx#manipulating-string-types',
      title: 'Manipulating String Types',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How can you use template literal types to manipulate string types in TypeScript?',
      answer:
        '- Template literal types allow you to create new string literal types by combining string literals and unions.\n- They can be used to generate new types based on patterns.\n- **Example**:\n\n     ```typescript\n     type EventHandlerName<E extends string> = `on${Capitalize<E>}`\n     ```',
    },
    {
      href: '/js-track/typescript-introduction/type-level-programming/page.mdx#variadic-tuple-types-benefits',
      title: 'Variadic Tuple Types Benefits',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are variadic tuple types, and how do they benefit type-level programming in TypeScript?',
      answer:
        '- Variadic tuple types allow for the representation and manipulation of tuples with varying lengths.\n- They enable operations like tuple concatenation, slicing, and transformations at the type level.\n- **Example**:\n\n     ```typescript\n     type Concat<T extends any[], U extends any[]> = [...T, ...U]\n     ```',
    },
    {
      href: '/js-track/typescript-introduction/type-level-programming/page.mdx#creating-deep-partial-types',
      title: 'Creating Deep Partial Types',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Describe how you would create a `DeepPartial` type that makes all properties in a type and its sub-types optional.',
      answer:
        '- By using recursive mapped types and conditional types.\n- **Example**:\n\n     ```typescript\n     type DeepPartial<T> = {\n       [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]\n     }\n     ```',
    },
  ],
  tsBasics: [
    {
      href: '/js-track/typescript-introduction/typescript-fundamentals/page.mdx#typescript-vs-javascript',
      title: 'TypeScript vs JavaScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What is TypeScript, and how does it differ from JavaScript?',
      answer:
        '- TypeScript is a statically typed superset of JavaScript developed by Microsoft.\n- It adds optional static typing, classes, interfaces, and other features.\n- TypeScript code is compiled into plain JavaScript.\n- It enhances developer productivity by catching errors at compile time and providing better tooling support.',
    },
    {
      href: '/js-track/typescript-introduction/typescript-fundamentals/page.mdx#typescript-advantages-over-javascript',
      title: 'TypeScript Advantages Over JavaScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What are the benefits of using TypeScript over JavaScript?',
      answer:
        '- **Static Typing**: Detects errors early during development.\n- **Improved IDE Support**: Better code completion, navigation, and refactoring tools.\n- **Enhanced Readability**: Explicit types make the code more understandable.\n- **Scalability**: Facilitates the development of large applications.\n- **Modern Features**: Supports the latest ECMAScript features and beyond.',
    },
    {
      href: '/js-track/typescript-introduction/typescript-fundamentals/page.mdx#interfaces-in-typescript',
      title: 'Interfaces in TypeScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'Explain how interfaces are used in TypeScript.',
      answer:
        '- Interfaces define contracts for objects, specifying the structure they should adhere to.\n- They can define properties, methods, and their types.\n- Interfaces support inheritance through the `extends` keyword.\n- They help in type-checking and ensuring consistent object shapes.\n\n   **Example**:\n\n   ```typescript\n   interface User {\n     id: number;\n     name: string;\n     login(): void;\n   }\n   ```',
    },
    {
      href: '/js-track/typescript-introduction/typescript-fundamentals/page.mdx#typescript-generics-basics',
      title: 'TypeScript Generics Basics',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What are generics in TypeScript, and why are they useful?',
      answer:
        '- Generics allow the creation of components that can work with a variety of types while providing type safety.\n- They enable writing reusable and flexible code.\n- Generics provide a way to parameterize types.\n\n   **Example**:\n\n   ```typescript\n   function identity<T>(arg: T): T {\n     return arg;\n   }\n   ```',
    },
    {
      href: '/js-track/typescript-introduction/typescript-fundamentals/page.mdx#improving-code-maintainability',
      title: 'Improving Code Maintainability',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How does TypeScript improve code maintainability in large-scale applications?',
      answer:
        '- **Type Safety**: Reduces runtime errors by catching them at compile time.\n- **Modularity**: Encourages breaking down code into modules and interfaces.\n- **Self-Documenting Code**: Explicit types make the codebase easier to understand.\n- **Refactoring Tools**: Enhanced IDE support aids in safely modifying code.\n- **Consistent Codebase**: Enforces coding standards and practices across teams.',
    },
  ],
  utilityTypes: [
    {
      href: '/js-track/typescript-introduction/utility-types-deep-dive/page.mdx#purpose-of-partial-type',
      title: 'Purpose of Partial Type',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is the purpose of the `Partial` utility type in TypeScript?',
      answer:
        "- The `Partial` utility type constructs a type with all properties of a given type `T` set to optional.\n- It is useful when you want to create a function or object that doesn't require all properties to be specified.\n- **Example**:\n\n     ```typescript\n     interface User {\n       id: number\n       name: string\n       email: string\n     }\n\n     type PartialUser = Partial<User>\n     ```",
    },
    {
      href: '/js-track/typescript-introduction/utility-types-deep-dive/page.mdx#differences-in-utility-types',
      title: 'Differences in Utility Types',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How does the `Pick` utility type differ from the `Omit` utility type?',
      answer:
        "- `Pick<T, K>` constructs a type by selecting a set of properties `K` from type `T`.\n- `Omit<T, K>` constructs a type by excluding a set of properties `K` from type `T`.\n- **Example**:\n\n     ```typescript\n     interface User {\n       id: number\n       name: string\n       email: string\n       password: string\n     }\n\n     type UserPreview = Pick<User, 'id' | 'name'> // Includes 'id' and 'name'\n\n     type SafeUser = Omit<User, 'password'> // Excludes 'password'\n     ```",
    },
    {
      href: '/js-track/typescript-introduction/utility-types-deep-dive/page.mdx#typescript-record-utility-type',
      title: 'TypeScript Record Utility Type',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What is the `Record` utility type used for in TypeScript?',
      answer:
        "- The `Record` utility type constructs a type with a set of properties `K` of type `T`.\n- It is useful for creating a type that maps keys to values of a specific type.\n- **Example**:\n\n     ```typescript\n     type Roles = 'admin' | 'editor' | 'viewer'\n\n     type Permissions = Record<Roles, boolean>\n\n     const permissions: Permissions = {\n       admin: true,\n       editor: false,\n       viewer: true,\n     }\n     ```",
    },
    {
      href: '/js-track/typescript-introduction/utility-types-deep-dive/page.mdx#utility-types-exclude-vs-extract',
      title: 'Utility Types: Exclude vs Extract',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain how the `Exclude` and `Extract` utility types are different.',
      answer:
        "- `Exclude<T, U>` constructs a type by excluding from `T` all types that are assignable to `U`.\n- `Extract<T, U>` constructs a type by extracting from `T` all types that are assignable to `U`.\n- **Example**:\n\n     ```typescript\n     type AllKeys = 'id' | 'name' | 'email' | 'password'\n\n     type PublicKeys = Exclude<AllKeys, 'password'> // 'id' | 'name' | 'email'\n\n     type SensitiveKeys = Extract<AllKeys, 'password' | 'email'> // 'email' | 'password'\n     ```",
    },
    {
      href: '/js-track/typescript-introduction/utility-types-deep-dive/page.mdx#customizing-type-constraints',
      title: 'Customizing Type Constraints',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'How can you create a custom utility type to make all properties of a type `T` required?',
      answer:
        '- You can create a custom utility type `Required<T>` using mapped types.\n- The `-?` operator removes the optional modifier from properties.\n- **Example**:\n\n     ```typescript\n     type Required<T> = {\n       [P in keyof T]-?: T[P]\n     }\n\n     interface OptionalUser {\n       id?: number\n       name?: string\n       email?: string\n     }\n\n     type CompleteUser = Required<OptionalUser>\n     ```',
    },
  ],
}

export const ADVANCED_CONCEPTS = {
  designPatterns: [
    {
      href: '/js-track/advanced-concepts/advanced-patterns-and-best-practices/page.mdx#javascript-module-pattern',
      title: 'JavaScript Module Pattern',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What is the Module Pattern in JavaScript, and why is it used?',
      answer:
        "- The Module Pattern is a design pattern that encapsulates related code into a single unit with both private and public members.\n- It uses closures and IIFEs to create a private scope.\n- It's used to organize code, prevent global namespace pollution, and create reusable modules with encapsulated state.",
    },
    {
      href: '/js-track/advanced-concepts/advanced-patterns-and-best-practices/page.mdx#revealing-vs-module-pattern',
      title: 'Revealing vs Module Pattern',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain the Revealing Module Pattern and how it differs from the Module Pattern.',
      answer:
        '- The Revealing Module Pattern is a variation of the Module Pattern that exposes private members by returning an object with references to them.\n- It improves code readability by defining all functions and variables in the private scope and exposing only those that should be public.\n- It differs by focusing on revealing the public API at the end, making it clear which members are accessible from outside.',
    },
    {
      href: '/js-track/advanced-concepts/advanced-patterns-and-best-practices/page.mdx#avoiding-global-namespace-pollution',
      title: 'Avoiding Global Namespace Pollution',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'How does the Module Pattern help in avoiding global namespace pollution?',
      answer:
        "- By encapsulating variables and functions within a module's private scope, the Module Pattern prevents them from being added to the global namespace.\n- Only the module object (typically one global variable) is exposed, reducing the risk of naming collisions and conflicts.",
    },
    {
      href: '/js-track/advanced-concepts/advanced-patterns-and-best-practices/page.mdx#es6-modules-advantages',
      title: 'ES6 Modules Advantages',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are the advantages of using ES6 modules over the traditional Module Pattern?',
      answer:
        '- ES6 modules provide native support for modules in JavaScript.\n- They offer a standardized syntax with `import` and `export` statements.\n- ES6 modules support static analysis, which can improve tooling and optimize bundling.\n- They facilitate better support for asynchronous loading and tree shaking (eliminating unused code).',
    },
    {
      href: '/js-track/advanced-concepts/advanced-patterns-and-best-practices/page.mdx#revealing-module-pattern-benefits',
      title: 'Revealing Module Pattern Benefits',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Why might you choose to use the Revealing Module Pattern over the standard Module Pattern?',
      answer:
        '- The Revealing Module Pattern improves code clarity by having all members defined in the private scope and explicitly revealing public members.\n- It avoids the repetition of specifying public methods and properties, making the code easier to maintain.\n- It helps in clearly understanding which parts of the module are exposed and which are private.',
    },
  ],
  asyncAwait: [
    {
      href: '/js-track/advanced-concepts/async-await-deep-dive/page.mdx#purpose-of-async-keyword',
      title: 'Purpose of Async Keyword',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What is the purpose of the `async` keyword in JavaScript?',
      answer:
        '- The `async` keyword is used to declare an asynchronous function.\n- An `async` function returns a promise.\n- It allows the use of `await` within the function to pause execution until a promise is settled.',
    },
    {
      href: '/js-track/advanced-concepts/async-await-deep-dive/page.mdx#handling-async-errors',
      title: 'Handling Async Errors',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'How do you handle errors in `async/await` functions?',
      answer:
        '- Use `try/catch` blocks within the `async` function to catch errors from `await` expressions.\n- Alternatively, attach a `.catch()` method when calling the `async` function.',
    },
    {
      href: '/js-track/advanced-concepts/async-await-deep-dive/page.mdx#sequential-vs-parallel-execution',
      title: 'Sequential vs Parallel Execution',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain the difference between sequential and parallel execution in the context of `async/await`.',
      answer:
        '- **Sequential Execution**:\n\n     - Tasks are executed one after another.\n     - Each `await` waits for the previous promise to resolve before proceeding.\n     - Can lead to longer total execution time if tasks are independent.\n\n- **Parallel Execution**:\n\n     - Multiple tasks are initiated without awaiting immediately.\n     - Promises are started concurrently, and `await` is used to retrieve their results later.\n     - Reduces total execution time when tasks are independent.',
    },
    {
      href: '/js-track/advanced-concepts/async-await-deep-dive/page.mdx#awaiting-inside-loops',
      title: 'Awaiting Inside Loops',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is the effect of using `await` inside a loop, and how can you optimize it?',
      answer:
        '- Using `await` inside a loop causes each iteration to wait for the previous one to complete, resulting in sequential execution.\n- To optimize, initiate all promises first and then use `Promise.all` to wait for their completion, allowing parallel execution.',
    },
    {
      href: '/js-track/advanced-concepts/async-await-deep-dive/page.mdx#differences-in-promise-methods',
      title: 'Differences in Promise Methods',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Can you explain how `Promise.allSettled` differs from `Promise.all` and when you might use it?',
      answer:
        '- `Promise.allSettled` waits for all promises to settle (either fulfilled or rejected) and returns an array of their results.\n- Unlike `Promise.all`, it does not short-circuit if a promise rejects.\n- Use `Promise.allSettled` when you want to handle all results, regardless of whether some operations fail.',
    },
  ],
  browserStorage: [
    {
      href: '/js-track/advanced-concepts/browser-storage-mechanisms/page.mdx#difference-between-storage-options',
      title: 'Difference Between Storage Options',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is the difference between `localStorage` and `sessionStorage`?',
      answer:
        '- **`localStorage`**:\n     - Data persists even after the browser is closed.\n     - Shared across all tabs/windows under the same origin.\n- **`sessionStorage`**:\n     - Data persists only for the duration of the page session.\n     - Specific to a single tab or window.\n- Both use the Web Storage API and store data as key-value pairs in strings.',
    },
    {
      href: '/js-track/advanced-concepts/browser-storage-mechanisms/page.mdx#choosing-db-over-local-storage',
      title: 'Choosing DB Over Local Storage',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question: 'When would you use IndexedDB over `localStorage`?',
      answer:
        '- Use IndexedDB when you need to store significant amounts of structured data.\n- IndexedDB supports complex data types, transactions, and is asynchronous.\n- It is suitable for applications that require offline capabilities, caching large datasets, or handling files/blobs.',
    },
    {
      href: '/js-track/advanced-concepts/browser-storage-mechanisms/page.mdx#web-sql-still-relevant',
      title: 'Web SQL Still Relevant',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Is Web SQL still recommended for use in modern web applications?',
      answer:
        '- No, Web SQL is deprecated and is not recommended for use.\n- The specification is no longer maintained, and browser support is limited.\n- IndexedDB is the recommended alternative for client-side storage of structured data.',
    },
    {
      href: '/js-track/advanced-concepts/browser-storage-mechanisms/page.mdx#same-origin-policy-storage-implications',
      title: 'Same-Origin Policy Storage Implications',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'How does the Same-Origin Policy affect browser storage mechanisms?',
      answer:
        '- The Same-Origin Policy restricts access to data stored by a particular origin (protocol, host, and port).\n- Storage mechanisms like `localStorage`, `sessionStorage`, and IndexedDB are scoped to the origin.\n- Scripts from one origin cannot access storage data from another origin.',
    },
    {
      href: '/js-track/advanced-concepts/browser-storage-mechanisms/page.mdx#client-side-storage-security',
      title: 'Client-Side Storage Security',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'What are some security considerations when using client-side storage?',
      answer:
        '- Avoid storing sensitive information (e.g., passwords, personal data) without proper encryption.\n- Stored data can be accessed by scripts running in the browser, including potentially malicious ones.\n- Be cautious of Cross-Site Scripting (XSS) attacks that could expose stored data.',
    },
  ],
  eventHandling: [
    {
      href: '/js-track/advanced-concepts/event-handling-and-delegation/page.mdx#event-bubbling-vs-capturing',
      title: 'Event Bubbling vs Capturing',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What is event bubbling and event capturing in JavaScript?',
      answer:
        '- **Event Bubbling**:\n     - The event propagates from the target element up to its ancestors (from innermost to outermost).\n     - Default behavior in most event listeners.\n- **Event Capturing**:\n     - The event propagates from the outermost element down to the target element (from outermost to innermost).\n     - Occurs before the bubbling phase.\n     - To use capturing, set the `useCapture` parameter to `true` in `addEventListener`.',
    },
    {
      href: '/js-track/advanced-concepts/event-handling-and-delegation/page.mdx#event-delegation-basics',
      title: 'Event Delegation Basics',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'Explain event delegation and its advantages.',
      answer:
        '- **Event Delegation**:\n     - A technique where a single event listener is added to a parent element to handle events from its child elements.\n     - Leverages event bubbling to manage events efficiently.\n- **Advantages**:\n     - Reduces the number of event listeners, improving performance.\n     - Simplifies code by centralizing event handling.\n     - Automatically handles dynamically added elements.',
    },
    {
      href: '/js-track/advanced-concepts/event-handling-and-delegation/page.mdx#preventing-default-action',
      title: 'Preventing Default Action',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How can you prevent the default action of an event in JavaScript?',
      answer:
        "- Use the `event.preventDefault()` method within the event handler.\n- This method cancels the event's default behavior (e.g., following a link, submitting a form).\n\n   **Example**:\n\n   ```javascript\n   document\n     .getElementById('myForm')\n     .addEventListener('submit', function (event) {\n       event.preventDefault()\n       // Custom form submission logic\n     })\n   ```",
    },
    {
      href: '/js-track/advanced-concepts/event-handling-and-delegation/page.mdx#understanding-event-propagation-differences',
      title: 'Understanding Event Propagation Differences',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is the difference between `event.stopPropagation()` and `event.stopImmediatePropagation()`?',
      answer:
        '- **`event.stopPropagation()`**:\n     - Stops the event from propagating to parent elements.\n     - Other event listeners on the same element will still be executed.\n- **`event.stopImmediatePropagation()`**:\n     - Stops the event from propagating to parent elements.\n     - Prevents any other event listeners on the same element from being executed.',
    },
    {
      href: '/js-track/advanced-concepts/event-handling-and-delegation/page.mdx#efficient-event-handling-strategies',
      title: 'Efficient Event Handling Strategies',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Why should you avoid adding multiple event listeners to individual child elements, and how can you manage events more efficiently?',
      answer:
        '- Adding multiple event listeners to individual child elements can lead to increased memory usage and decreased performance.\n- To manage events more efficiently, use event delegation by attaching a single event listener to a common parent element.\n- This approach reduces the number of event listeners and handles events for both existing and future child elements.',
    },
  ],
  functionalProgramming: [
    {
      href: '/js-track/advanced-concepts/functional-programming-principles/page.mdx#pure-functions-in-fp',
      title: 'Pure Functions in FP',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is a pure function, and why are pure functions important in functional programming?',
      answer:
        "- A pure function is a function that always returns the same result given the same inputs and has no side effects.\n- Importance:\n     - Predictability: Easier to reason about.\n     - Testability: Simplifies unit testing.\n     - Reusability: Functions can be reused with confidence.\n     - Parallelism: Safe for concurrent execution since they don't modify shared state.",
    },
    {
      href: '/js-track/advanced-concepts/functional-programming-principles/page.mdx#immutability-in-javascript',
      title: 'Immutability in JavaScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Explain the concept of immutability and its benefits in JavaScript.',
      answer:
        '- Immutability means that once a data structure is created, it cannot be altered.\n- Benefits:\n     - Prevents unintended side effects.\n     - Easier to reason about state changes.\n     - Improves performance in some contexts (e.g., memoization).\n     - Enhances reliability in concurrent environments.',
    },
    {
      href: '/js-track/advanced-concepts/functional-programming-principles/page.mdx#side-effects-in-functions',
      title: 'Side Effects in Functions',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'What are side effects in functions, and how can they impact your code?',
      answer:
        '- Side effects are any changes in state or observable interactions with the outside world that occur during function execution, other than the return value.\n- Impact:\n     - Makes code less predictable and harder to test.\n     - Can introduce bugs due to hidden dependencies.\n     - Increases complexity in understanding the flow of data.',
    },
    {
      href: '/js-track/advanced-concepts/functional-programming-principles/page.mdx#higher-order-functions-fundamentals',
      title: 'Higher-Order Functions Fundamentals',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How do higher-order functions contribute to functional programming?',
      answer:
        '- Higher-order functions can take functions as arguments or return functions.\n- Contribution:\n     - Enables function composition and abstraction.\n     - Promotes code reuse and modularity.\n     - Facilitates declarative programming patterns.',
    },
    {
      href: '/js-track/advanced-concepts/functional-programming-principles/page.mdx#function-composition-in-js',
      title: 'Function Composition in JS',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is function composition, and how is it used in JavaScript?',
      answer:
        '- Function composition is the process of combining two or more functions to produce a new function.\n- Usage:\n\n     - Allows building complex functionality by composing simpler functions.\n     - Enhances code readability and reusability.\n     - Example:\n\n       ```javascript\n       const compose = (f, g) => (x) => f(g(x))\n       ```',
    },
  ],
  generators: [
    {
      href: '/js-track/advanced-concepts/generators-and-iterators/page.mdx#purpose-of-symbol-iterator',
      title: 'Purpose of Symbol Iterator',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What is the purpose of the `Symbol.iterator` in JavaScript?',
      answer:
        '- `Symbol.iterator` is a built-in symbol that specifies the default iterator for an object.\n- When an object has a `[Symbol.iterator]` method, it becomes iterable and can be used in constructs like `for...of` loops.\n- The method should return an iterator object that adheres to the iterator protocol.',
    },
    {
      href: '/js-track/advanced-concepts/generators-and-iterators/page.mdx#generator-functions-overview',
      title: 'Generator Functions Overview',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Explain how generator functions differ from regular functions.',
      answer:
        '- Generator functions are declared with `function*` syntax and can pause execution using `yield`.\n- They return a generator object that adheres to both the iterable and iterator protocols.\n- Regular functions run to completion when called, whereas generator functions can pause and resume.',
    },
    {
      href: '/js-track/advanced-concepts/generators-and-iterators/page.mdx#using-generators-for-sequences',
      title: 'Using Generators for Sequences',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'How can you use generators to create an infinite sequence?',
      answer:
        '- By writing a generator function with a loop that never terminates (e.g., `while (true)`), you can yield values indefinitely.\n- The caller can control how many values to consume by calling `.next()` or using a loop with a break condition.\n\n   **Example**:\n\n   ```javascript\n   function* infiniteNumbers() {\n     let num = 0\n     while (true) {\n       yield num++\n     }\n   }\n   ```',
    },
    {
      href: '/js-track/advanced-concepts/generators-and-iterators/page.mdx#yield-expression-mechanics',
      title: 'Yield Expression Mechanics',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What is the `yield*` expression used for in generators?',
      answer:
        '- The `yield*` expression is used to delegate to another generator or iterable.\n- It effectively yields all values from the delegated generator or iterable.\n\n   **Example**:\n\n   ```javascript\n   function* genA() {\n     yield 1\n     yield 2\n   }\n\n   function* genB() {\n     yield* genA()\n     yield 3\n   }\n   ```',
    },
    {
      href: '/js-track/advanced-concepts/generators-and-iterators/page.mdx#managing-asynchronous-flow',
      title: 'Managing Asynchronous Flow',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'How do generators help in managing asynchronous code flow?',
      answer:
        '- Generators can pause execution, making them useful for controlling asynchronous operations.\n- By yielding promises and resuming execution when promises resolve, generators can sequence asynchronous tasks in a synchronous-looking manner.\n- Libraries like **co** used generators to simplify async control flow before `async/await` was introduced.',
    },
  ],
  higherOrderFunctions: [
    {
      href: '/js-track/advanced-concepts/higher-order-functions-and-callbacks/page.mdx#higher-order-function-overview',
      title: 'Higher-Order Function Overview',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What is a higher-order function in JavaScript?',
      answer:
        'A higher-order function is a function that either takes one or more functions as arguments or returns a function as a result. They are used to abstract over actions and can help create more flexible and reusable code.',
    },
    {
      href: '/js-track/advanced-concepts/higher-order-functions-and-callbacks/page.mdx#map-vs-foreach-method',
      title: 'Map vs ForEach Method',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'How does the `map` method differ from `forEach`?',
      answer:
        '- `map` returns a new array containing the results of applying a function to each element of the original array.\n- `forEach` executes a provided function once for each array element but does not return a new array.\n- Use `map` when you need to transform data and collect the results; use `forEach` for side effects.',
    },
    {
      href: '/js-track/advanced-concepts/higher-order-functions-and-callbacks/page.mdx#how-reduces-work',
      title: 'How Reduces Work',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'Can you explain how the `reduce` method works?',
      answer:
        'The `reduce` method applies a reducer function to each element of an array, resulting in a single output value. The reducer function takes an accumulator and the current value, updates the accumulator, and returns it for the next iteration. An initial value for the accumulator can be provided.',
    },
    {
      href: '/js-track/advanced-concepts/higher-order-functions-and-callbacks/page.mdx#functions-as-citizens',
      title: 'Functions as Citizens',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Why are functions considered first-class citizens in JavaScript?',
      answer:
        'Because functions in JavaScript can be:\n\n- Assigned to variables.\n- Passed as arguments to other functions.\n- Returned from other functions.\n- Stored in data structures.\n\n   This allows for higher-order functions and callbacks, enabling functional programming techniques.',
    },
    {
      href: '/js-track/advanced-concepts/higher-order-functions-and-callbacks/page.mdx#using-callback-functions',
      title: 'Using Callback Functions',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Provide an example of a situation where you would use a callback function.',
      answer:
        "Callbacks are commonly used for asynchronous operations, such as handling responses from network requests or timers.\n\n   **Example:**\n\n   ```javascript\n   function fetchData(callback) {\n     setTimeout(() => {\n       const data = { id: 1, name: 'Alice' }\n       callback(data)\n     }, 1000)\n   }\n\n   fetchData((data) => {\n     console.log('Data received:', data)\n   })\n   ```",
    },
  ],
  memoryLeaks: [
    {
      href: '/js-track/advanced-concepts/memory-leaks-and-prevention/page.mdx#understanding-memory-leaks-in-js',
      title: 'Understanding Memory Leaks in JS',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What is a memory leak in JavaScript, and how does it occur?',
      answer:
        '- A memory leak in JavaScript occurs when memory that is no longer needed is not released, leading to increased memory usage over time.\n- Causes include unintended references preventing garbage collection, such as global variables, unremoved event listeners, closures retaining unnecessary data, and forgotten timers.',
    },
    {
      href: '/js-track/advanced-concepts/memory-leaks-and-prevention/page.mdx#identifying-memory-leaks',
      title: 'Identifying Memory Leaks',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'How can you identify a memory leak in a web application?',
      answer:
        '- **Symptoms**: Increasing memory usage, performance degradation, crashes.\n- **Tools**: Use browser developer tools (e.g., Chrome DevTools) to profile memory.\n- **Techniques**: Take heap snapshots, analyze memory usage over time, look for objects that should have been garbage collected.',
    },
    {
      href: '/js-track/advanced-concepts/memory-leaks-and-prevention/page.mdx#preventing-memory-leaks-in-js',
      title: 'Preventing Memory Leaks in JS',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are some best practices to prevent memory leaks in JavaScript?',
      answer:
        '- Avoid unnecessary global variables.\n- Properly remove event listeners when they are no longer needed.\n- Clear timers and intervals when they are no longer required.\n- Be cautious with closures to avoid retaining unnecessary references.\n- Manage DOM references by nullifying them when the nodes are detached.',
    },
    {
      href: '/js-track/advanced-concepts/memory-leaks-and-prevention/page.mdx#closures-and-memory-leaks',
      title: 'Closures and Memory Leaks',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Explain how closures can lead to memory leaks and how to prevent it.',
      answer:
        '- **Cause**: Closures can retain references to outer scope variables, preventing them from being garbage collected.\n- **Prevention**:\n     - Avoid capturing variables that are not needed inside the closure.\n     - Set references to `null` when they are no longer needed.\n     - Use IIFEs (Immediately Invoked Function Expressions) to limit the scope.',
    },
    {
      href: '/js-track/advanced-concepts/memory-leaks-and-prevention/page.mdx#javascript-map-vs-weakmap',
      title: 'JavaScript Map vs WeakMap',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What is the difference between WeakMap and Map in JavaScript?',
      answer:
        '- **WeakMap**:\n     - Keys must be objects.\n     - Holds weak references to keys, allowing garbage collection if there are no other references.\n     - Does not prevent garbage collection of keys.\n- **Map**:\n     - Keys can be any value.\n     - Holds strong references to keys, preventing garbage collection.\n     - Suitable for storing data where keys need to persist.',
    },
  ],
  metaProgramming: [
    {
      href: '/js-track/advanced-concepts/meta-programming-with-proxies-and-reflect/page.mdx#javascript-proxies-explained',
      title: 'JavaScript Proxies Explained',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What is a Proxy in JavaScript, and how does it work?',
      answer:
        '- A Proxy is an object that wraps another object (the target) and intercepts fundamental operations through handler functions (traps).\n- It allows customization of operations like property access, assignment, enumeration, function invocation, etc.\n- The `new Proxy(target, handler)` syntax is used to create a proxy.',
    },
    {
      href: '/js-track/advanced-concepts/meta-programming-with-proxies-and-reflect/page.mdx#reflecting-on-javascript',
      title: 'Reflecting on JavaScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question: 'Explain the purpose of the Reflect API in JavaScript.',
      answer:
        '- The Reflect API provides methods for interceptable JavaScript operations, mirroring the methods available as proxy traps.\n- It allows developers to perform default operations within proxy handlers, ensuring consistent behavior.\n- Reflect makes operations more explicit and provides utility methods for common object operations.',
    },
    {
      href: '/js-track/advanced-concepts/meta-programming-with-proxies-and-reflect/page.mdx#using-a-proxy-validator',
      title: 'Using a Proxy Validator',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How can you use a proxy to validate property assignments on an object?',
      answer:
        "- By defining a `set` trap in the proxy handler, you can intercept property assignments.\n- Within the `set` trap, you can implement validation logic to check the assigned values.\n- If the value is invalid, you can throw an error or prevent the assignment.\n\n   **Example**:\n\n   ```javascript\n   const handler = {\n     set: function (target, property, value) {\n       if (typeof value !== 'string') {\n         throw new Error('Property value must be a string')\n       }\n       target[property] = value\n       return true\n     },\n   }\n   ```",
    },
    {
      href: '/js-track/advanced-concepts/meta-programming-with-proxies-and-reflect/page.mdx#javascript-proxy-use-cases',
      title: 'JavaScript Proxy Use Cases',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What are some practical use cases for proxies in JavaScript?',
      answer:
        '- **Validation and Sanitization**: Enforcing rules on property assignments.\n- **Property Logging and Auditing**: Tracking access and changes to properties.\n- **Implementing Observable Objects**: Notifying observers about changes.\n- **Virtual and Lazy Initialization**: Deferring computation or object creation until needed.\n- **Security and Access Control**: Restricting access to certain properties or methods.',
    },
    {
      href: '/js-track/advanced-concepts/meta-programming-with-proxies-and-reflect/page.mdx#proxies-and-traps-example',
      title: 'Proxies and Traps Example',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Can you explain how the `apply` and `construct` traps are used in proxies?',
      answer:
        "- **`apply` Trap**:\n\n     - Intercepts function invocation on callable targets (functions).\n     - Allows customization of function calls, including arguments and `this` context.\n\n     **Example**:\n\n     ```javascript\n     const handler = {\n       apply: function (target, thisArg, argumentsList) {\n         console.log('Function called')\n         return target.apply(thisArg, argumentsList)\n       },\n     }\n     ```\n\n- **`construct` Trap**:\n\n     - Intercepts object creation using the `new` operator on constructor functions.\n     - Allows customization of instance creation, including arguments.\n\n     **Example**:\n\n     ```javascript\n     const handler = {\n       construct: function (target, args, newTarget) {\n         console.log('Constructor called')\n         return new target(...args)\n       },\n     }\n     ```",
    },
  ],
  performanceOptimization: [
    {
      href: '/js-track/advanced-concepts/performance-optimization-techniques/page.mdx#javascript-debounce-vs-throttle',
      title: 'JavaScript Debounce vs Throttle',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is the difference between debouncing and throttling in JavaScript?',
      answer:
        '- **Debouncing**:\n     - Delays the execution of a function until after a specified time has elapsed since the last time it was invoked.\n     - Ensures that the function is called only once after rapid events stop firing.\n- **Throttling**:\n     - Limits the execution of a function to once every specified interval, regardless of how many times the event is triggered.\n     - Ensures that the function is called at regular intervals during rapid events.',
    },
    {
      href: '/js-track/advanced-concepts/performance-optimization-techniques/page.mdx#optimizing-loops-in-javascript',
      title: 'Optimizing Loops in JavaScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'How can you optimize loops in JavaScript for better performance?',
      answer:
        '- Choose the most efficient loop construct for the task.\n- Cache the loop length and any computations done inside the loop.\n- Minimize the work done inside the loop body.\n- Use appropriate data structures for faster access.\n- Avoid unnecessary function calls within loops.',
    },
    {
      href: '/js-track/advanced-concepts/performance-optimization-techniques/page.mdx#minimizing-dom-interactions',
      title: 'Minimizing DOM Interactions',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'Why is minimizing DOM interactions important for performance?',
      answer:
        '- DOM manipulation is slow compared to JavaScript operations.\n- Frequent DOM updates can cause reflows and repaints, which are expensive rendering operations.\n- Minimizing and batching DOM interactions reduces the performance overhead.',
    },
    {
      href: '/js-track/advanced-concepts/performance-optimization-techniques/page.mdx#understanding-document-fragments',
      title: 'Understanding Document Fragments',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are Document Fragments, and how do they improve performance?',
      answer:
        '- Document Fragments are lightweight containers for DOM nodes.\n- They allow you to construct a DOM subtree without triggering reflows.\n- When the fragment is appended to the DOM, all the nodes are inserted at once, resulting in a single reflow.',
    },
    {
      href: '/js-track/advanced-concepts/performance-optimization-techniques/page.mdx#event-delegation-improves-performance',
      title: 'Event Delegation Improves Performance',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain how event delegation can improve performance in JavaScript.',
      answer:
        '- Event delegation involves adding a single event listener to a parent element instead of multiple listeners to individual child elements.\n- It reduces the number of event listeners in the application, lowering memory usage and improving performance.\n- Events bubble up from child elements to parent elements, allowing the parent to handle events from its children.',
    },
  ],
  promisePatterns: [
    {
      href: '/js-track/advanced-concepts/promises-and-asynchronous-patterns/page.mdx#understanding-javascript-promises',
      title: 'Understanding JavaScript Promises',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What is a Promise in JavaScript, and why is it useful?',
      answer:
        '- A Promise is an object representing the eventual completion or failure of an asynchronous operation.\n- It provides a cleaner, more manageable way to handle asynchronous code compared to callbacks.\n- Promises help avoid callback hell, improve error handling, and allow for chaining and composing asynchronous operations.',
    },
    {
      href: '/js-track/advanced-concepts/promises-and-asynchronous-patterns/page.mdx#how-promise-all-works',
      title: 'How Promise.all Works',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'Explain how `Promise.all()` works and when you would use it.',
      answer:
        '- `Promise.all()` accepts an iterable of promises and returns a new promise.\n- It resolves when all the input promises have resolved, with an array of their results.\n- It rejects immediately if any of the input promises reject, with the reason from the first promise that rejects.\n- Use `Promise.all()` when you need to perform multiple asynchronous operations in parallel and wait for all of them to complete before proceeding.',
    },
    {
      href: '/js-track/advanced-concepts/promises-and-asynchronous-patterns/page.mdx#difference-between-promises',
      title: 'Difference Between Promises',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is the difference between `Promise.all()` and `Promise.race()`?',
      answer:
        '- **`Promise.all()`**:\n\n     - Waits for all promises to fulfill or any to reject.\n     - Resolves with an array of results when all promises fulfill.\n     - Rejects immediately when any promise rejects.\n\n- **`Promise.race()`**:\n\n     - Returns a promise that fulfills or rejects as soon as one of the promises fulfills or rejects.\n     - Resolves or rejects with the value or reason from the first settled promise.',
    },
    {
      href: '/js-track/advanced-concepts/promises-and-asynchronous-patterns/page.mdx#handling-promise-chain-errors',
      title: 'Handling Promise Chain Errors',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'How do you handle errors in promise chains?',
      answer:
        "- Errors in a promise chain can be handled using the `.catch()` method.\n- If any promise in the chain rejects or throws an error, the control passes to the nearest `.catch()` handler.\n- It's good practice to place a `.catch()` at the end of the chain to handle any errors that may occur.",
    },
    {
      href: '/js-track/advanced-concepts/promises-and-asynchronous-patterns/page.mdx#promise-constructor-anti-pattern',
      title: 'Promise Constructor Anti-Pattern',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question: 'Can you explain the Promise constructor anti-pattern?',
      answer:
        '- The Promise constructor anti-pattern involves creating a new Promise and unnecessarily wrapping code that already returns a promise.\n- This results in more complex code without any benefit.\n- Instead, you should return the existing promise directly.\n\n   **Anti-Pattern Example:**\n\n   ```javascript\n   function badFunction() {\n     return new Promise((resolve, reject) => {\n       existingPromise.then(resolve).catch(reject)\n     })\n   }\n   ```\n\n   **Correct Approach:**\n\n   ```javascript\n   function goodFunction() {\n     return existingPromise\n   }\n   ```',
    },
  ],
  reflection: [
    {
      href: '/js-track/advanced-concepts/reflection-and-meta-programming/page.mdx#reflecting-javascript-apis',
      title: 'Reflecting JavaScript APIs',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is the Reflect API in JavaScript, and what is its purpose?',
      answer:
        '- The Reflect API is a built-in object that provides methods for interceptable JavaScript operations.\n- It standardizes and simplifies operations like property access, assignment, and function invocation.\n- Reflect methods mirror the behavior of corresponding proxy traps, providing default implementations.\n- It is used in metaprogramming to perform operations on objects in a consistent and predictable manner.',
    },
    {
      href: '/js-track/advanced-concepts/reflection-and-meta-programming/page.mdx#dynamic-property-access-in-js',
      title: 'Dynamic Property Access in JS',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain how dynamic property access works in JavaScript and provide an example.',
      answer:
        "- Dynamic property access allows you to access object properties using variables or expressions.\n- This is done using bracket notation (`object[propertyName]`) instead of dot notation (`object.propertyName`).\n- **Example**:\n\n     ```javascript\n     const obj = { name: 'Alice', age: 30 }\n     const prop = 'name'\n     console.log(obj[prop]) // Outputs: Alice\n     ```\n\n- Dynamic access is useful when property names are determined at runtime.",
    },
    {
      href: '/js-track/advanced-concepts/reflection-and-meta-programming/page.mdx#javascript-proxies-explained',
      title: 'JavaScript Proxies Explained',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What are proxies in JavaScript, and how do they relate to metaprogramming?',
      answer:
        '- A proxy is an object that wraps another object (the target) and intercepts operations performed on it.\n- Proxies allow you to define custom behavior for fundamental operations like property access, assignment, enumeration, function calls, etc.\n- They enable metaprogramming by allowing developers to modify the default behavior of objects.\n- Proxies use traps (methods) defined in a handler object to intercept and customize operations.',
    },
    {
      href: '/js-track/advanced-concepts/reflection-and-meta-programming/page.mdx#reflect-vs-direct-operations',
      title: 'Reflect vs Direct Operations',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'How does Reflect differ from direct operations on objects?',
      answer:
        '- Reflect provides methods that mirror the behavior of operators and other internal methods but in a function form.\n- Using Reflect methods ensures consistent behavior, especially when used with proxies.\n- Direct operations may have inconsistent behavior or throw errors, whereas Reflect methods return boolean values indicating success or failure.\n- Reflect methods can simplify exception handling and provide more control over operations.',
    },
    {
      href: '/js-track/advanced-concepts/reflection-and-meta-programming/page.mdx#using-reflect-with-proxies',
      title: 'Using Reflect with Proxies',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Can you provide an example of using Reflect and Proxy together to log property access on an object?',
      answer:
        '```javascript\n   const target = { name: \\\'Alice\\\', age: 30 }\n   const handler = {\n     get(target, property, receiver) {\n       console.log(`Property "${property}" accessed`)\n       return Reflect.get(target, property, receiver)\n     },\n   }\n   const proxy = new Proxy(target, handler)\n   console.log(proxy.name) // Logs: Property "name" accessed\n   // Outputs: Alice\n   ```\n\n- In this example, the proxy intercepts property access and logs the property name.\n- Reflect is used to perform the default get operation on the target object.',
    },
  ],
  security: [
    {
      href: '/js-track/advanced-concepts/security-best-practices/page.mdx#preventing-cross-site-scripting',
      title: 'Preventing Cross-Site Scripting',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is Cross-Site Scripting (XSS), and how can it be prevented?',
      answer:
        '- **Definition**: XSS is a security vulnerability that allows attackers to inject malicious scripts into web pages viewed by other users.\n- **Prevention**:\n     - Validate and sanitize user input.\n     - Escape output based on context (HTML, JavaScript, URL).\n     - Use Content Security Policy (CSP) to restrict script sources.\n     - Avoid using dangerous functions like `eval()` and `innerHTML` without sanitization.\n     - Utilize frameworks and libraries that handle output encoding.',
    },
    {
      href: '/js-track/advanced-concepts/security-best-practices/page.mdx#preventing-csrf-attacks',
      title: 'Preventing CSRF Attacks',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain Cross-Site Request Forgery (CSRF) and how to prevent it.',
      answer:
        "- **Definition**: CSRF is an attack that tricks a user into performing actions they didn't intend on a web application where they're authenticated.\n- **Prevention**:\n     - Implement CSRF tokens in forms and validate them on the server.\n     - Use the `SameSite` cookie attribute to control cross-site cookie sending.\n     - Require authentication for sensitive actions using custom headers.\n     - Employ double-submit cookies or custom request headers in AJAX requests.",
    },
    {
      href: '/js-track/advanced-concepts/security-best-practices/page.mdx#understanding-web-security-policies',
      title: 'Understanding Web Security Policies',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is Content Security Policy (CSP), and how does it enhance web security?',
      answer:
        '- **Definition**: CSP is an HTTP header that defines approved sources of content for a web page, helping to prevent XSS and data injection attacks.\n- **Enhancement**:\n     - Restricts the loading of scripts, styles, images, and other resources to trusted sources.\n     - Blocks the execution of inline scripts unless explicitly allowed.\n     - Provides a mechanism to report violations, aiding in policy refinement.',
    },
    {
      href: '/js-track/advanced-concepts/security-best-practices/page.mdx#best-practices-avoid-eval',
      title: 'Best Practices Avoid eval()',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Why should you avoid using `eval()` and `innerHTML` in JavaScript?',
      answer:
        '- **Security Risks**:\n     - `eval()` executes a string as code, which can lead to code injection if the string contains malicious input.\n     - `innerHTML` can insert HTML content into the DOM, which may include malicious scripts if not properly sanitized.\n- **Best Practices**:\n     - Use safer alternatives like `textContent` for text insertion.\n     - Avoid executing or inserting untrusted code or content.',
    },
    {
      href: '/js-track/advanced-concepts/security-best-practices/page.mdx#same-site-cookie-attribute',
      title: 'Same Site Cookie Attribute',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is the `SameSite` cookie attribute, and how does it help prevent CSRF attacks?',
      answer:
        '- **Definition**: The `SameSite` attribute instructs browsers on whether to send cookies along with cross-site requests.\n- **Prevention**:\n     - Setting `SameSite=Strict` or `SameSite=Lax` limits the circumstances under which cookies are sent, reducing the risk of CSRF.\n     - By not sending cookies with cross-site requests, the server will not authenticate unintended requests from other sites.',
    },
  ],
  serviceWorkers: [
    {
      href: '/js-track/advanced-concepts/service-workers-and-pwas/page.mdx#service-workers-explained',
      title: 'Service Workers Explained',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is a Service Worker, and how does it enhance web applications?',
      answer:
        '- A Service Worker is a script that runs in the background of the browser, separate from the web page.\n- It intercepts network requests, allowing developers to cache resources, provide offline functionality, and improve performance.\n- Enhances web applications by enabling features like offline access, push notifications, and background synchronization.',
    },
    {
      href: '/js-track/advanced-concepts/service-workers-and-pwas/page.mdx#cache-first-vs-network',
      title: 'Cache First vs Network',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'Explain the Cache First and Network First caching strategies.',
      answer:
        '- **Cache First**:\n     - The Service Worker attempts to fetch the resource from the cache.\n     - If the resource is not in the cache, it fetches it from the network and caches it for future use.\n     - Best for static assets that rarely change.\n- **Network First**:\n     - The Service Worker tries to fetch the resource from the network.\n     - If the network is unavailable, it serves the resource from the cache.\n     - Ideal for dynamic content that needs to be up-to-date.',
    },
    {
      href: '/js-track/advanced-concepts/service-workers-and-pwas/page.mdx#registering-a-service-worker',
      title: 'Registering a Service Worker',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'How do you register a Service Worker in a web application?',
      answer:
        "- Check if the browser supports Service Workers using `'serviceWorker' in navigator`.\n- Call `navigator.serviceWorker.register('/service-worker.js')` to register the Service Worker script.\n- Handle the registration promise to confirm successful registration or catch errors.\n\n   **Example**:\n\n   ```javascript\n   if ('serviceWorker' in navigator) {\n     navigator.serviceWorker\n       .register('/service-worker.js')\n       .then((registration) => {\n         console.log('Service Worker registered:', registration)\n       })\n       .catch((error) => {\n         console.error('Service Worker registration failed:', error)\n       })\n   }\n   ```",
    },
    {
      href: '/js-track/advanced-concepts/service-workers-and-pwas/page.mdx#pwa-app-manifest-basics',
      title: 'PWA App Manifest Basics',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What is a Web App Manifest, and why is it important in PWAs?',
      answer:
        "- A Web App Manifest is a JSON file that provides metadata about the web application.\n- It includes information like the app's name, icons, start URL, display mode, and theme colors.\n- Important for PWAs because it controls how the app appears to the user and how it can be launched, enabling features like adding to the home screen.",
    },
    {
      href: '/js-track/advanced-concepts/service-workers-and-pwas/page.mdx#implementing-offline-fallback-pages',
      title: 'Implementing Offline Fallback Pages',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How do you implement offline fallback pages using Service Workers?',
      answer:
        "- Cache an offline fallback page during the Service Worker's `install` event.\n- In the `fetch` event, try to fetch the requested resource from the network.\n- If the network request fails, serve the cached offline page instead.\n- Ensures that users receive meaningful content even when offline.",
    },
  ],
  symbols: [
    {
      href: '/js-track/advanced-concepts/symbols-and-symbol-usage/page.mdx#understanding-symbols-in-javascript',
      title: 'Understanding Symbols in JavaScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is a Symbol in JavaScript, and how does it differ from other primitive types?',
      answer:
        '- A Symbol is a unique and immutable primitive data type introduced in ES6.\n- Symbols are used as unique identifiers, primarily as property keys on objects.\n- Unlike other primitive types like strings or numbers, Symbols are guaranteed to be unique, even if they have the same description.',
    },
    {
      href: '/js-track/advanced-concepts/symbols-and-symbol-usage/page.mdx#using-symbols-to-avoid-collisions',
      title: 'Using Symbols to Avoid Collisions',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How can you use Symbols to avoid property name collisions in JavaScript objects?',
      answer:
        '- By using Symbols as property keys, you ensure that the property is unique and does not conflict with other properties.\n- This is particularly useful when adding properties to objects that may be extended by other code or libraries.\n- Symbols prevent accidental overwriting or interference with existing properties.',
    },
    {
      href: '/js-track/advanced-concepts/symbols-and-symbol-usage/page.mdx#understanding-well-known-symbols',
      title: 'Understanding Well-Known Symbols',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Explain what well-known Symbols are and provide an example of how to use one.',
      answer:
        '- Well-known Symbols are predefined Symbols in JavaScript that represent internal behaviors of objects.\n- They allow customization of how objects interact with language features.\n- Example: Using `Symbol.iterator` to make an object iterable.\n\n     ```javascript\n     const iterableObj = {\n       [Symbol.iterator]: function* () {\n         yield 1\n         yield 2\n         yield 3\n       },\n     }\n\n     for (const value of iterableObj) {\n       console.log(value) // Outputs: 1, 2, 3\n     }\n     ```',
    },
    {
      href: '/js-track/advanced-concepts/symbols-and-symbol-usage/page.mdx#accessing-object-properties',
      title: 'Accessing Object Properties',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Can you explain how to access and enumerate Symbol properties on an object?',
      answer:
        "- Symbol properties are not included in standard property enumerations like `Object.keys()` or `for...in` loops.\n- To access Symbol properties:\n\n     - Use `Object.getOwnPropertySymbols(obj)` to retrieve an array of Symbol properties.\n     - Use `Reflect.ownKeys(obj)` to retrieve all property keys, including Symbols.\n\n- Example:\n\n     ```javascript\n     const sym = Symbol('key')\n     const obj = { [sym]: 'value' }\n     const symbols = Object.getOwnPropertySymbols(obj)\n     console.log(symbols) // Outputs: [Symbol(key)]\n     ```",
    },
    {
      href: '/js-track/advanced-concepts/symbols-and-symbol-usage/page.mdx#symbols-in-javascript-meta',
      title: 'Symbols in JavaScript Meta',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'How do Symbols contribute to meta-programming in JavaScript?',
      answer:
        '- Symbols enable meta-programming by allowing developers to interact with and customize the internal behaviors of objects.\n- Well-known Symbols represent internal object methods that can be overridden to change how objects respond to operations like property access, iteration, type conversion, etc.\n- This allows for advanced programming patterns and customization of built-in behaviors.',
    },
  ],
  webWorkers: [
    {
      href: '/js-track/advanced-concepts/web-workers-and-multithreading/page.mdx#understanding-web-workers',
      title: 'Understanding Web Workers',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What are Web Workers in JavaScript, and why are they used?',
      answer:
        '- Web Workers allow JavaScript to run scripts in background threads.\n- They are used to perform computationally intensive tasks without blocking the main execution thread.\n- This enhances application performance and maintains a responsive user interface.',
    },
    {
      href: '/js-track/advanced-concepts/web-workers-and-multithreading/page.mdx#communicating-with-workers',
      title: 'Communicating with Workers',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'How do you communicate with a Web Worker from the main thread?',
      answer:
        '- Communication is done via message passing using the `postMessage` method.\n- The main thread sends messages to the worker using `worker.postMessage(data)`.\n- The worker listens for messages using `self.onmessage` and responds using `self.postMessage(data)`.\n- Similarly, the main thread listens for messages from the worker using `worker.onmessage`.',
    },
    {
      href: '/js-track/advanced-concepts/web-workers-and-multithreading/page.mdx#differences-in-work-arrangements',
      title: 'Differences in Work Arrangements',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is the difference between a Dedicated Worker and a Shared Worker?',
      answer:
        '- **Dedicated Worker**:\n     - Associated with a single script or window.\n     - Only the script that created it can communicate with it.\n- **Shared Worker**:\n     - Can be accessed by multiple scripts or windows, such as different browser tabs from the same origin.\n     - Uses `SharedWorker` constructor.\n     - Communication is done via `port` objects.',
    },
    {
      href: '/js-track/advanced-concepts/web-workers-and-multithreading/page.mdx#role-of-structured-cloning',
      title: 'Role of Structured Cloning',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain the role of the Structured Cloning Algorithm in Web Workers.',
      answer:
        '- The Structured Cloning Algorithm is used to copy complex data structures between the main thread and workers.\n- It supports cloning of objects, arrays, and other complex types.\n- Some data types like functions and DOM nodes cannot be cloned.\n- Ensures that data is safely and accurately transmitted between threads.',
    },
    {
      href: '/js-track/advanced-concepts/web-workers-and-multithreading/page.mdx#handling-web-worker-errors',
      title: 'Handling Web Worker Errors',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'How can you handle errors that occur in a Web Worker?',
      answer:
        "- In the main thread, set an `onerror` event handler on the worker object to catch errors thrown in the worker.\n     ```javascript\n     worker.onerror = function (error) {\n       console.error('Worker error:', error.message)\n     }\n     ```\n- In the worker, errors can be thrown as usual, and they will propagate to the main thread's `onerror` handler.\n- Alternatively, you can catch errors within the worker and send error messages back to the main thread using `postMessage`.",
    },
  ],
}

export const FRONTEND_DEVELOPMENT = {
  accessibility: [
    {
      href: '/js-track/frontend-development/accessibility-implementation/page.mdx#understanding-web-accessibility-features',
      title: 'Understanding Web Accessibility Features',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What is ARIA, and how does it improve web accessibility?',
      answer:
        '- **ARIA (Accessible Rich Internet Applications)** is a set of attributes that define ways to make web content and applications more accessible to people with disabilities.\n- **Improves Accessibility** by:\n     - Providing additional semantics to assistive technologies.\n     - Enhancing accessibility of custom widgets and complex UI components.\n     - Informing assistive technologies about dynamic content changes.',
    },
    {
      href: '/js-track/frontend-development/accessibility-implementation/page.mdx#using-aria-for-accessibility',
      title: 'Using ARIA for Accessibility',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'When should you use ARIA roles and attributes over native HTML elements?',
      answer:
        '- Use ARIA roles and attributes when native HTML elements and semantics are insufficient for accessibility needs.\n- **Prefer Native Elements** because they come with built-in accessibility features.\n- **Use ARIA** for:\n     - Custom components not available in HTML.\n     - Providing additional context or state information.\n     - Enhancing dynamic content accessibility.',
    },
    {
      href: '/js-track/frontend-development/accessibility-implementation/page.mdx#understanding-aria-attributes',
      title: 'Understanding ARIA Attributes',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Explain the difference between `aria-label`, `aria-labelledby`, and `aria-describedby`.',
      answer:
        '- **`aria-label`**:\n     - Provides an explicit, readable name for an element.\n     - Overrides any other naming mechanisms.\n- **`aria-labelledby`**:\n     - References another element that contains the label text.\n     - Preferred when the label text is visible on the screen.\n- **`aria-describedby`**:\n     - References another element that provides additional descriptive information.\n     - Used to supply supplementary information, not the primary label.',
    },
    {
      href: '/js-track/frontend-development/accessibility-implementation/page.mdx#making-accessibility-interactive',
      title: 'Making Accessibility Interactive',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'How do you make a custom interactive element accessible to keyboard users and screen readers?',
      answer:
        '- **Add Appropriate ARIA Roles**:\n     - Define the element\\\'s role (e.g., `role="button"`).\n- **Manage Keyboard Focus**:\n     - Make the element focusable using `tabindex="0"`.\n     - Handle keyboard events (e.g., `Enter`, `Space` keys).\n- **Update ARIA States**:\n     - Reflect changes in the UI using ARIA states (e.g., `aria-pressed`).\n- **Example**:\n\n     ```html\n     <div role="button" tabindex="0" aria-pressed="false">Toggle</div>\n     ```',
    },
    {
      href: '/js-track/frontend-development/accessibility-implementation/page.mdx#web-accessibility-best-practices',
      title: 'Web Accessibility Best Practices',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are some best practices for ensuring web accessibility in your projects?',
      answer:
        '- **Use Semantic HTML**:\n     - Utilize appropriate HTML elements.\n- **Implement ARIA Wisely**:\n     - Use ARIA when necessary, avoid overusing.\n- **Ensure Keyboard Accessibility**:\n     - All interactive elements should be operable via keyboard.\n- **Provide Alternative Text**:\n     - Describe images and media using `alt` attributes.\n- **Maintain Color Contrast**:\n     - Ensure sufficient contrast between text and background.\n- **Test for Accessibility**:\n     - Use automated tools and manual testing techniques.\n- **Consider All Users in Design**:\n     - Incorporate accessibility from the beginning.',
    },
  ],
  webApis: [
    {
      href: '/js-track/frontend-development/browser-apis-and-web-standards/page.mdx#understanding-the-dom-with-javascript',
      title: 'Understanding the DOM with JavaScript',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is the DOM, and how do you manipulate it using JavaScript?',
      answer:
        '- **DOM Definition**: The Document Object Model is a programming interface that represents the structure of a web page as a tree of nodes, allowing scripts to access and manipulate the content, structure, and styles.\n- **Manipulation**:\n     - **Selecting Elements**: Using methods like `getElementById`, `querySelector`.\n     - **Creating Elements**: Using `document.createElement`.\n     - **Modifying Content**: Setting `textContent`, `innerHTML`, or attributes.\n     - **Adding/Removing Elements**: Using `appendChild`, `removeChild`.\n     - **Event Handling**: Adding event listeners with `addEventListener`.',
    },
    {
      href: '/js-track/frontend-development/browser-apis-and-web-standards/page.mdx#understanding-the-fetch-api',
      title: 'Understanding The Fetch API',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain how the Fetch API works and how it differs from XMLHttpRequest.',
      answer:
        '- **Fetch API**:\n     - Provides an interface for fetching resources using Promises.\n     - Simplifies network requests with a more streamlined syntax.\n     - Supports features like streaming responses and request cancellation.\n- **Differences from XMLHttpRequest**:\n     - **Promises vs. Callbacks**: Fetch uses Promises, making code more readable.\n     - **No Built-in Progress Events**: Fetch does not support progress events for uploads/downloads.\n     - **CORS Handling**: Fetch provides better CORS handling and configuration options.\n     - **Response Handling**: Fetch treats HTTP error statuses (e.g., 404, 500) as successful requests unless explicitly checked.',
    },
    {
      href: '/js-track/frontend-development/browser-apis-and-web-standards/page.mdx#understanding-websockets-basics',
      title: 'Understanding WebSockets Basics',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What are WebSockets, and when would you use them over HTTP requests?',
      answer:
        '- **WebSockets**:\n     - A protocol providing full-duplex communication channels over a single TCP connection.\n     - Enables real-time, bi-directional communication between client and server.\n- **Use Cases Over HTTP**:\n     - **Real-time Applications**: Chat apps, live feeds, gaming.\n     - **Efficiency**: Reduces overhead compared to repeated HTTP requests (polling).\n     - **Continuous Data Streams**: Ideal for applications requiring constant data exchange.',
    },
    {
      href: '/js-track/frontend-development/browser-apis-and-web-standards/page.mdx#handling-fetch-api-errors',
      title: 'Handling Fetch API Errors',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How do you handle errors when making network requests using the Fetch API?',
      answer:
        '- **Handling Network Errors**:\n     - Use `.catch()` to handle network failures or exceptions.\n- **Handling HTTP Error Statuses**:\n     - Check `response.ok` or `response.status` to determine if the response is within the successful range (200-299).\n     - Throw an error if the status indicates a failure.\n\n     ```javascript\n     fetch(url)\n       .then((response) => {\n         if (!response.ok) {\n           throw new Error(`HTTP error! Status: ${response.status}`);\n         }\n         return response.json();\n       })\n       .then((data) => {\n         // Process data\n       })\n       .catch((error) => {\n         // Handle errors\n       });\n     ```',
    },
    {
      href: '/js-track/frontend-development/browser-apis-and-web-standards/page.mdx#differences-between-local-storage',
      title: 'Differences Between Local Storage',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Describe the differences between localStorage and sessionStorage.',
      answer:
        '- **localStorage**:\n     - **Persistence**: Data persists even after the browser is closed and reopened.\n     - **Scope**: Data is shared across all tabs and windows in the same origin.\n     - **Use Cases**: Storing user preferences, tokens, or data that needs to persist.\n- **sessionStorage**:\n     - **Persistence**: Data is cleared when the tab or window is closed.\n     - **Scope**: Data is specific to the tab or window where it was created.\n     - **Use Cases**: Temporary data storage for a single session, like form data.',
    },
  ],
  buildTools: [
    {
      href: '/js-track/frontend-development/build-tools-and-bundlers/page.mdx#understanding-webpack-basics',
      title: 'Understanding Webpack Basics',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What is Webpack, and why is it used in frontend development?',
      answer:
        '- **Webpack** is a module bundler that processes and bundles JavaScript modules along with their dependencies.\n- **Uses**:\n     - Bundles multiple modules into a few output files, reducing HTTP requests.\n     - Allows the use of modern JavaScript features by transpiling code.\n     - Supports code splitting and lazy loading for performance optimization.\n     - Manages assets like images and stylesheets through loaders.',
    },
    {
      href: '/js-track/frontend-development/build-tools-and-bundlers/page.mdx#code-splitting-with-webpack',
      title: 'Code Splitting with Webpack',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'Explain how code splitting works in Webpack and its benefits.',
      answer:
        '- **Code Splitting** is the process of splitting your code into separate bundles that can be loaded on demand.\n- **How It Works**:\n     - By defining multiple entry points or using dynamic imports (`import()`).\n     - Webpack creates separate chunks for these pieces of code.\n- **Benefits**:\n     - Reduces initial load time by loading only necessary code.\n     - Improves performance, especially for large applications.\n     - Allows for lazy loading of components and resources.',
    },
    {
      href: '/js-track/frontend-development/build-tools-and-bundlers/page.mdx#tree-shaking-with-webpack',
      title: 'Tree Shaking with Webpack',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question: 'What is tree shaking, and how does Webpack implement it?',
      answer:
        "- **Tree Shaking** is a dead-code elimination technique that removes unused code from the final bundle.\n- **Implementation in Webpack**:\n     - Relies on ES6 module syntax (`import` and `export`) for static analysis.\n     - During the build process, Webpack marks unused exports.\n     - Uses minification tools like Terser to remove the dead code.\n     - Requires setting `mode` to `'production'` and ensuring code is side-effect-free.",
    },
    {
      href: '/js-track/frontend-development/build-tools-and-bundlers/page.mdx#webpack-loaders-and-plugins',
      title: 'Webpack Loaders and Plugins',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'Describe the role of loaders and plugins in Webpack.',
      answer:
        "- **Loaders**:\n     - Transform the source code of modules during the bundling process.\n     - Enable Webpack to process files other than JavaScript (e.g., CSS, images).\n     - Examples: `babel-loader`, `css-loader`, `file-loader`.\n- **Plugins**:\n     - Extend Webpack's functionality with more complex tasks.\n     - Can optimize bundles, manage assets, inject variables, etc.\n     - Examples: `HtmlWebpackPlugin`, `CleanWebpackPlugin`, `DefinePlugin`.",
    },
    {
      href: '/js-track/frontend-development/build-tools-and-bundlers/page.mdx#optimizing-webpack-output',
      title: 'Optimizing Webpack Output',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: "How do you optimize Webpack's output for production?",
      answer:
        '- **Set Mode to Production**:\n     - Enables built-in optimizations like minification and tree shaking.\n- **Code Splitting**:\n     - Use dynamic imports and `SplitChunksPlugin` to split code.\n- **Minification**:\n     - Use tools like Terser (default in production mode) to minify code.\n- **Caching and Hashing**:\n     - Use content hashes in filenames (`[contenthash]`) to enable browser caching.\n- **Tree Shaking**:\n     - Ensure code is written in a tree-shakeable way using ES6 modules.\n- **Analyzing Bundle Size**:\n     - Use tools like `webpack-bundle-analyzer` to identify and reduce large dependencies.\n- **Loaders and Plugins**:\n     - Optimize assets with loaders (e.g., image compression).\n     - Use plugins to clean up and manage the output directory.',
    },
  ],
  deployment: [
    {
      href: '/js-track/frontend-development/building-and-deploying-applications/page.mdx#setting-up-full-stack-application',
      title: 'Setting Up Full Stack Application',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Explain how you would set up a full-stack application with a React frontend and a Node.js backend.',
      answer:
        '- **Initialize Projects**: Create separate directories for the frontend and backend.\n- **Backend Setup**:\n     - Initialize npm and install necessary packages like Express and Mongoose.\n     - Set up server, routes, and database connections.\n- **Frontend Setup**:\n     - Use `create-react-app` to bootstrap the React application.\n     - Develop components and implement API calls to the backend.\n- **Integration**:\n     - Use proxy settings during development or configure API URLs for production.\n     - Ensure CORS is configured correctly on the backend.\n- **Deployment**:\n     - Deploy the backend to a platform like Heroku.\n     - Deploy the frontend to a platform like Netlify or GitHub Pages.',
    },
    {
      href: '/js-track/frontend-development/building-and-deploying-applications/page.mdx#deploying-node-js-on-heroku',
      title: 'Deploying Node.js on Heroku',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are some considerations when deploying a Node.js application to a cloud service like Heroku?',
      answer:
        "- **Environment Variables**: Securely manage sensitive data using environment variables.\n- **Port Configuration**: Ensure the application listens on the port provided by `process.env.PORT`.\n- **Static Files**: Configure how static assets are served.\n- **Scaling**: Be aware of the application's scalability and the cloud service's limitations.\n- **Logs and Monitoring**: Use the cloud service's tools to monitor application performance and logs.\n- **Build Packs**: Specify the correct build pack or runtime environment.",
    },
    {
      href: '/js-track/frontend-development/building-and-deploying-applications/page.mdx#configuring-full-stack-applications',
      title: 'Configuring Full Stack Applications',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'How do you handle environment-specific configurations in a full-stack application?',
      answer:
        '- **Environment Variables**:\n     - Use `.env` files for development and set variables in the deployment environment.\n- **Config Files**:\n     - Create configuration files that load settings based on the environment.\n- **Build Tools**:\n     - Use build tools or scripts to replace or inject environment-specific values.\n- **Security**:\n     - Never commit sensitive information to version control.\n     - Use services like `dotenv` to manage environment variables.',
    },
    {
      href: '/js-track/frontend-development/building-and-deploying-applications/page.mdx#handling-cors-issues',
      title: 'Handling CORS Issues',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is CORS, and how do you handle it in a full-stack application?',
      answer:
        '- **CORS (Cross-Origin Resource Sharing)**:\n     - A security feature implemented by browsers that restricts web pages from making requests to a different domain than the one that served the web page.\n- **Handling CORS**:\n     - **On the Backend**:\n       - Use middleware like `cors` in Express to set appropriate headers.\n     - **Configuration**:\n       - Specify allowed origins, methods, and headers.\n     - **Security Considerations**:\n       - Be cautious about allowing all origins; restrict to specific domains when possible.',
    },
    {
      href: '/js-track/frontend-development/building-and-deploying-applications/page.mdx#setting-up-continuous-deployment',
      title: 'Setting Up Continuous Deployment',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Describe the steps to set up continuous deployment for a full-stack application.',
      answer:
        '- **Version Control Integration**:\n     - Connect your repository to the deployment platforms (Heroku, Netlify).\n- **Automated Builds**:\n     - Configure the platforms to build the application upon new commits.\n- **Deployment Scripts**:\n     - Set up scripts for building and testing before deployment.\n- **Environment Variables**:\n     - Ensure that deployment environments have the necessary variables configured.\n- **Monitoring and Rollback**:\n     - Implement monitoring to catch issues early.\n     - Set up the ability to roll back to previous versions if necessary.',
    },
  ],
  codeSplitting: [
    {
      href: '/js-track/frontend-development/code-splitting-and-lazy-loading/page.mdx#understanding-code-splitting-benefits',
      title: 'Understanding Code Splitting Benefits',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is code splitting, and how does it improve web application performance?',
      answer:
        "- **Code Splitting** is a technique that breaks down the application's code into smaller chunks that can be loaded on demand.\n- **Improves Performance** by:\n     - Reducing initial load times by loading only the necessary code.\n     - Allowing parallel loading of resources.\n     - Leveraging browser caching for shared chunks.",
    },
    {
      href: '/js-track/frontend-development/code-splitting-and-lazy-loading/page.mdx#dynamic-javascript-imports',
      title: 'Dynamic JavaScript Imports',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'Explain how dynamic imports work in JavaScript.',
      answer:
        "- **Dynamic Imports** use the `import()` function to load modules asynchronously at runtime.\n- **Syntax**:\n     ```javascript\n     import('./module').then(module => {\n       // Use the imported module\n     });\n     ```\n- **Behavior**:\n     - Returns a Promise that resolves to the module.\n     - Allows code to be split and loaded only when needed.",
    },
    {
      href: '/js-track/frontend-development/code-splitting-and-lazy-loading/page.mdx#understanding-lazy-loading-strategies',
      title: 'Understanding Lazy Loading Strategies',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is lazy loading, and when should you use it in a web application?',
      answer:
        '- **Lazy Loading** is the practice of deferring the loading of resources until they are needed.\n- **Use Cases**:\n     - Components or routes not required at initial load.\n     - Large assets like images or libraries.\n- **Benefits**:\n     - Reduces initial load time.\n     - Optimizes resource usage.\n     - Enhances user experience by loading content progressively.',
    },
    {
      href: '/js-track/frontend-development/code-splitting-and-lazy-loading/page.mdx#code-splitting-vs-lazy-loading',
      title: 'Code Splitting vs Lazy Loading',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'How does code splitting differ from lazy loading?',
      answer:
        '- **Code Splitting**:\n     - A build-time process that divides code into chunks.\n     - Focuses on how code is bundled and structured.\n- **Lazy Loading**:\n     - A runtime strategy that defers loading of code or assets.\n     - Often implemented using code splitting.\n- **Relationship**:\n     - Code splitting enables lazy loading by creating chunks that can be loaded on demand.',
    },
    {
      href: '/js-track/frontend-development/code-splitting-and-lazy-loading/page.mdx#performance-considerations-code-splitting',
      title: 'Performance Considerations Code Splitting',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are some performance considerations when implementing code splitting and lazy loading?',
      answer:
        '- **Bundle Size**:\n     - Smaller chunks can improve load times.\n     - Over-splitting can lead to too many requests.\n- **Network Overhead**:\n     - Each chunk requires an HTTP request.\n     - HTTP/2 mitigates some issues with parallel requests.\n- **Caching**:\n     - Proper caching strategies can enhance performance.\n     - Use content hashes to enable long-term caching.\n- **User Experience**:\n     - Ensure that loading indicators or placeholders are used.\n     - Avoid delays in critical interactions.\n- **Error Handling**:\n     - Handle failures in loading chunks gracefully.',
    },
  ],
  frontendInterviews: [
    {
      href: '/js-track/frontend-development/common-interview-questions-and-coding-challenges/page.mdx#reversing-linked-lists',
      title: 'Reversing Linked Lists',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How do you reverse a linked list? Describe the algorithm and its time complexity.',
      answer:
        '- **Algorithm**:\n     - Initialize three pointers: `prev = None`, `current = head`, `next = None`.\n     - Iterate through the list:\n       - Save `next = current.next`.\n       - Reverse the link: `current.next = prev`.\n       - Move `prev` and `current` one step forward.\n     - Return `prev` as the new head.\n\n- **Time Complexity**:\n     - O(n), where n is the number of nodes.',
    },
    {
      href: '/js-track/frontend-development/common-interview-questions-and-coding-challenges/page.mdx#graph-search-techniques',
      title: 'Graph Search Techniques',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain the difference between depth-first search (DFS) and breadth-first search (BFS).',
      answer:
        '- **DFS**:\n     - Explores as far as possible along each branch before backtracking.\n     - Uses a stack (can be implemented with recursion).\n     - Good for problems where you need to visit every node.\n\n- **BFS**:\n     - Explores all neighbors at the current depth before moving to nodes at the next depth level.\n     - Uses a queue.\n     - Ideal for finding the shortest path in unweighted graphs.',
    },
    {
      href: '/js-track/frontend-development/common-interview-questions-and-coding-challenges/page.mdx#understanding-hash-tables',
      title: 'Understanding Hash Tables',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What is a hash table, and how does it work?',
      answer:
        '- **Definition**:\n     - A data structure that maps keys to values using a hash function.\n- **Mechanism**:\n     - The hash function computes an index into an array of buckets.\n     - Ideally, the hash function distributes keys uniformly to minimize collisions.\n- **Operations**:\n     - **Insert**, **Delete**, **Search** operations have average time complexity of O(1).',
    },
    {
      href: '/js-track/frontend-development/common-interview-questions-and-coding-challenges/page.mdx#detecting-linked-list-cycles',
      title: 'Detecting Linked List Cycles',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'Describe how you would detect a cycle in a linked list.',
      answer:
        '- **Approach (Floyd’s Tortoise and Hare Algorithm)**:\n     - Use two pointers: `slow` and `fast`.\n     - `slow` moves one step at a time, `fast` moves two steps.\n     - If there is a cycle, `slow` and `fast` will eventually meet.\n     - If `fast` reaches the end (`null`), there is no cycle.\n\n- **Time Complexity**:\n     - O(n), where n is the number of nodes.',
    },
    {
      href: '/js-track/frontend-development/common-interview-questions-and-coding-challenges/page.mdx#memoization-in-dynamic-programming',
      title: 'Memoization in Dynamic Programming',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is memoization, and how is it used in dynamic programming?',
      answer:
        '- **Definition**:\n     - An optimization technique that stores the results of expensive function calls.\n- **Usage**:\n     - Avoids redundant calculations by caching results.\n     - Commonly used in recursive algorithms to improve efficiency.\n- **Example**:\n     - Calculating Fibonacci numbers using a cache to store previously computed values.',
    },
  ],
  componentArchitecturePatterns: [
    {
      href: '/js-track/frontend-development/component-architecture-patterns/page.mdx#mvc-vs-mvvm-patterns',
      title: 'MVC vs MVVM Patterns',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What is the main difference between MVC and MVVM patterns?',
      answer:
        '- **MVC** separates the application into Model, View, and Controller, where the Controller handles input and updates the Model.\n- **MVVM** introduces the ViewModel, which binds directly to the View through data binding, eliminating the need for the Controller to manipulate the View.',
    },
    {
      href: '/js-track/frontend-development/component-architecture-patterns/page.mdx#predictability-in-flux-architecture',
      title: 'Predictability in Flux Architecture',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How does Flux architecture ensure predictable state management?',
      answer:
        '- Flux enforces a unidirectional data flow, where data changes propagate in a single direction: from Actions to Dispatcher to Stores to Views. This structure simplifies tracing data changes and reduces the complexity associated with bidirectional data bindings.',
    },
    {
      href: '/js-track/frontend-development/component-architecture-patterns/page.mdx#benefits-of-component-based-design',
      title: 'Benefits of Component-Based Design',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Why is component-based design preferred in modern frontend development?',
      answer:
        '- Component-based design promotes reusability, modularity, and encapsulation. It allows developers to build complex UIs from simple, self-contained units, enhancing maintainability and scalability.',
    },
    {
      href: '/js-track/frontend-development/component-architecture-patterns/page.mdx#data-binding-in-mvvm',
      title: 'Data Binding in MVVM',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'Can you explain how data binding works in MVVM?',
      answer:
        "- In MVVM, data binding automatically synchronizes the View with the ViewModel. Changes in the ViewModel's properties reflect in the View, and user interactions in the View update the ViewModel, often facilitated by two-way binding mechanisms.",
    },
    {
      href: '/js-track/frontend-development/component-architecture-patterns/page.mdx#benefits-of-using-redux',
      title: 'Benefits of Using Redux',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What are the benefits of using Redux in a React application?',
      answer:
        '- Redux provides a predictable state container with a strict unidirectional data flow. It simplifies state management, makes debugging easier through tools like Redux DevTools, and enforces best practices in organizing application state.',
    },
  ],
  ciCd: [
    {
      href: '/js-track/frontend-development/continuous-integration-and-deployment/page.mdx#understanding-continuous-integration',
      title: 'Understanding Continuous Integration',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What is Continuous Integration, and why is it important?',
      answer:
        '- **Continuous Integration (CI)** is a development practice where developers integrate code into a shared repository frequently, usually several times a day.\n- **Importance**:\n     - Detects integration issues early.\n     - Reduces merge conflicts.\n     - Provides quick feedback on code changes.\n     - Improves collaboration and code quality.',
    },
    {
      href: '/js-track/frontend-development/continuous-integration-and-deployment/page.mdx#continuous-delivery-vs-deployment',
      title: 'Continuous Delivery vs Deployment',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain the difference between Continuous Delivery and Continuous Deployment.',
      answer:
        '- **Continuous Delivery**:\n     - Automates the release process up to production.\n     - Requires manual approval to deploy to production.\n- **Continuous Deployment**:\n     - Extends continuous delivery by automatically deploying to production.\n     - Every change that passes automated tests is released without manual intervention.',
    },
    {
      href: '/js-track/frontend-development/continuous-integration-and-deployment/page.mdx#integrating-automated-testing-pipelines',
      title: 'Integrating Automated Testing Pipelines',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'How do you integrate automated testing into a CI pipeline?',
      answer:
        '- **Include Test Commands**:\n     - Add test execution commands to the pipeline configuration file.\n- **Fail Builds on Test Failures**:\n     - Configure the pipeline to mark builds as failed if tests fail.\n- **Generate Reports**:\n     - Use tools to generate test reports and coverage data.\n- **Example**:\n     - In a GitHub Actions workflow, include a step like `run: npm test`.',
    },
    {
      href: '/js-track/frontend-development/continuous-integration-and-deployment/page.mdx#ci-pipeline-deployment-strategies',
      title: 'CI Pipeline Deployment Strategies',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are some deployment strategies you can implement in a CI/CD pipeline?',
      answer:
        '- **Blue-Green Deployment**:\n     - Two identical environments; traffic is switched between them for zero downtime.\n- **Canary Releases**:\n     - Deploy to a small subset of users before full rollout.\n- **Rolling Updates**:\n     - Gradually replace instances with new versions.\n- **A/B Testing**:\n     - Deploy different versions to segments of users to compare performance.',
    },
    {
      href: '/js-track/frontend-development/continuous-integration-and-deployment/page.mdx#understanding-docker-in-pipelines',
      title: 'Understanding Docker in Pipelines',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What is the purpose of Docker in a CI/CD pipeline?',
      answer:
        '- **Consistent Environments**:\n     - Ensures that applications run the same way in development, testing, and production.\n- **Isolation**:\n     - Containers isolate applications from each other and the underlying infrastructure.\n- **Portability**:\n     - Docker images can be deployed on any system that runs Docker.\n- **Efficiency**:\n     - Containers are lightweight and start quickly.',
    },
  ],
  cors: [
    {
      href: '/js-track/frontend-development/cross-origin-communication/page.mdx#same-origin-policy-basics',
      title: 'Same-Origin Policy Basics',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What is the same-origin policy, and why is it important?',
      answer:
        "- The same-origin policy is a security measure implemented in browsers that restricts scripts from interacting with resources from different origins (protocol, domain, or port).\n- It's important because it prevents malicious scripts from accessing sensitive data on another origin, protecting users from cross-site scripting (XSS) and cross-site request forgery (CSRF) attacks.",
    },
    {
      href: '/js-track/frontend-development/cross-origin-communication/page.mdx#understanding-cors-configurations',
      title: 'Understanding CORS Configurations',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Explain how CORS works and how you can configure it on the server.',
      answer:
        '- CORS allows servers to specify which origins are permitted to access their resources by sending specific HTTP headers.\n- Configuration involves setting headers like `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers` in server responses.\n- For example, to allow `https://example.com` to access resources, set `Access-Control-Allow-Origin: https://example.com` in the response headers.',
    },
    {
      href: '/js-track/frontend-development/cross-origin-communication/page.mdx#understanding-pre-flight-requests',
      title: 'Understanding Pre-Flight Requests',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What is a preflight request in CORS, and when is it used?',
      answer:
        "- A preflight request is an `OPTIONS` request sent by the browser to determine whether the actual request is safe to send.\n- It's used when the actual request uses methods other than GET, POST, or HEAD, or includes custom headers, or when the `Content-Type` is not one of the safe types.\n- The server must respond with appropriate CORS headers to proceed with the actual request.",
    },
    {
      href: '/js-track/frontend-development/cross-origin-communication/page.mdx#cross-origin-message-passing',
      title: 'Cross-Origin Message Passing',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How does the `postMessage` API help in cross-origin communication, and what are the security considerations?',
      answer:
        "- The `postMessage` API enables secure communication between Window objects across different origins.\n- It allows sending messages (data) between a parent window and an iframe or between different tabs/windows.\n- Security considerations include:\n     - Always specifying the target origin to prevent messages from being sent to unintended recipients.\n     - Validating the origin of incoming messages to ensure they're from trusted sources.\n     - Avoiding the use of `*` for `targetOrigin` unless necessary.",
    },
    {
      href: '/js-track/frontend-development/cross-origin-communication/page.mdx#cors-troubleshooting-issues',
      title: 'CORS Troubleshooting Issues',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are some common issues you might encounter with CORS, and how would you troubleshoot them?',
      answer:
        '- **Common Issues**:\n     - Missing or incorrect `Access-Control-Allow-Origin` header.\n     - Server not handling preflight `OPTIONS` requests.\n     - Using `*` with credentials, which is disallowed.\n     - Not specifying allowed methods or headers.\n- **Troubleshooting Steps**:\n     - Inspect network requests and responses using browser developer tools.\n     - Check server logs for errors.\n     - Ensure server is configured to send correct CORS headers.\n     - Verify that the client request aligns with what the server expects.',
    },
  ],
  microFrontends: [
    {
      href: '/js-track/frontend-development/micro-frontend-architecture/page.mdx#understanding-micro-frontend-architecture',
      title: 'Understanding Micro-Frontend Architecture',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'What is a micro-frontend, and how does it differ from a monolithic frontend architecture?',
      answer:
        '- **Micro-Frontend**:\n     - An architectural style where the frontend is divided into smaller, independent applications.\n     - Each micro-frontend can be developed, tested, and deployed separately.\n- **Differences from Monolithic Architecture**:\n     - **Modularity**: Micro-frontends are modular, whereas monolithic frontends are single codebases.\n     - **Team Autonomy**: Teams can work independently on micro-frontends.\n     - **Technology Diversity**: Different micro-frontends can use different technologies.\n     - **Deployment**: Micro-frontends can be deployed independently.',
    },
    {
      href: '/js-track/frontend-development/micro-frontend-architecture/page.mdx#micro-frontend-integration-patterns',
      title: 'Micro-frontend Integration Patterns',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Explain the different integration patterns used in micro-frontend architecture.',
      answer:
        '- **Client-Side Integration**:\n     - **Iframe Integration**: Embedding micro-frontends using iframes.\n     - **JavaScript Includes**: Dynamically loading scripts.\n     - **Micro Frontend Frameworks**: Using frameworks like single-spa.\n- **Server-Side Integration**:\n     - **Edge-Side Includes (ESI)**: Assembling micro-frontends at the CDN level.\n     - **Server-Side Includes (SSI)**: Server combines micro-frontends before sending.\n     - **Backend for Frontend (BFF)**: Orchestrating micro-frontends through a backend layer.\n- **Build-Time Integration**:\n     - **Monorepo Approach**: All code in one repository, built together.\n     - **Static Composition**: Combining micro-frontends during the build process.',
    },
    {
      href: '/js-track/frontend-development/micro-frontend-architecture/page.mdx#microfrontend-communication-challenges',
      title: 'Microfrontend Communication Challenges',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'How do micro-frontends communicate with each other, and what are the challenges involved?',
      answer:
        '- **Communication Methods**:\n     - **Event Bus**: Using a global event bus for decoupled communication.\n     - **Custom Events**: Leveraging browser events.\n     - **Shared APIs**: Exposing functions or services.\n- **Challenges**:\n     - **State Management**: Ensuring consistent state across micro-frontends.\n     - **Coupling**: Avoiding tight coupling that undermines independence.\n     - **Performance**: Overhead of communication mechanisms.\n     - **Security**: Preventing unauthorized access or data leaks.',
    },
    {
      href: '/js-track/frontend-development/micro-frontend-architecture/page.mdx#best-practices-for-microfrontends',
      title: 'Best Practices for Microfrontends',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are some best practices when implementing micro-frontends in terms of styling and theming?',
      answer:
        '- **Consistent Design System**:\n     - Use shared style libraries or component libraries.\n- **CSS Isolation**:\n     - Techniques like CSS Modules, Shadow DOM, or CSS-in-JS to prevent style leakage.\n- **Avoid Global Styles**:\n     - Encapsulate styles within micro-frontends.\n- **Shared Assets**:\n     - Manage shared assets carefully to avoid conflicts.',
    },
    {
      href: '/js-track/frontend-development/micro-frontend-architecture/page.mdx#handling-micro-frontend-routing',
      title: 'Handling Micro Frontend Routing',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Describe how routing is handled in a micro-frontend architecture.',
      answer:
        '- **Global Routing**:\n     - A central router controls navigation across all micro-frontends.\n     - Pros: Unified navigation, easier to manage global routes.\n     - Cons: Potential coupling between micro-frontends.\n- **Local Routing**:\n     - Each micro-frontend handles its own routing.\n     - Pros: Independence, encapsulation.\n     - Cons: Complexity in coordinating navigation between micro-frontends.\n- **Hybrid Approaches**:\n     - Combining global and local routing.\n     - Use URL patterns or query parameters to manage navigation.',
    },
  ],
  reconciliation: [
    {
      href: '/js-track/frontend-development/rendering-and-reconciliation/page.mdx#react-fiber-optimization',
      title: 'React Fiber Optimization',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is React Fiber, and how does it improve rendering performance?',
      answer:
        "- **React Fiber** is a reimplementation of React's core rendering algorithm that enables incremental rendering of the Virtual DOM.\n- **Improvements**:\n     - **Interruptible Rendering**: Rendering work can be paused to handle higher-priority tasks, improving responsiveness.\n     - **Scheduling**: Prioritizes updates based on importance, ensuring critical updates are rendered first.\n     - **Cooperative Scheduling**: Yields control back to the browser, preventing the UI from blocking.",
    },
    {
      href: '/js-track/frontend-development/rendering-and-reconciliation/page.mdx#react-fiber-phases-explained',
      title: 'React Fiber Phases Explained',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain the difference between the Render Phase and Commit Phase in React Fiber.',
      answer:
        '- **Render Phase (Reconciliation Phase)**:\n     - **Purpose**: Calculates changes by building a work-in-progress Fiber tree.\n     - **Characteristics**:\n       - **Interruptible**: Can be paused and resumed.\n       - **No Side Effects**: Does not modify the DOM or have side effects.\n- **Commit Phase**:\n     - **Purpose**: Applies the calculated changes to the DOM.\n     - **Characteristics**:\n       - **Synchronous**: Must complete without interruption.\n       - **Side Effects Applied**: Updates the DOM and calls lifecycle methods.',
    },
    {
      href: '/js-track/frontend-development/rendering-and-reconciliation/page.mdx#react-scheduling-mechanism',
      title: 'React Scheduling Mechanism',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        "How does React's scheduling mechanism prioritize updates, and why is this important?",
      answer:
        "- **Scheduling Mechanism**:\n     - Assigns priority levels to different types of updates (e.g., user input vs. background data fetching).\n     - High-priority updates can interrupt low-priority rendering tasks.\n- **Importance**:\n     - **Improves User Experience**: Ensures that critical interactions are responsive.\n     - **Efficient Resource Use**: Allocates rendering time based on task importance.\n     - **Flexibility**: Allows React to adapt to the application's needs.",
    },
    {
      href: '/js-track/frontend-development/rendering-and-reconciliation/page.mdx#benefits-of-suspense-components',
      title: 'Benefits of Suspense Components',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are the benefits of using `React.Suspense` and `React.lazy` in an application?',
      answer:
        '- **Benefits**:\n     - **Code-Splitting**: `React.lazy` enables loading components on demand, reducing initial bundle sizes.\n     - **Improved Performance**: Delays loading of non-critical components, speeding up initial render.\n     - **Better User Experience**: `React.Suspense` provides a fallback UI while data or components are loading.\n     - **Simplified Asynchronous Handling**: Manages asynchronous operations declaratively.',
    },
    {
      href: '/js-track/frontend-development/rendering-and-reconciliation/page.mdx#cooperative-scheduling-overview',
      title: 'Cooperative Scheduling Overview',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Describe how cooperative scheduling works in React Fiber and its impact on application performance.',
      answer:
        "- **Cooperative Scheduling**:\n     - React breaks down rendering work into small units.\n     - After processing each unit, React checks if it should yield control back to the browser.\n- **Impact on Performance**:\n     - **Prevents Blocking**: Allows the browser to handle user input and other high-priority tasks.\n     - **Smooth UI**: Maintains responsiveness even during intensive rendering.\n     - **Adaptive Rendering**: Adjusts rendering work based on the application's current needs.",
    },
  ],
  security: [
    {
      href: '/js-track/frontend-development/security-best-practices/page.mdx#owasp-top-web-security',
      title: 'OWASP Top Web Security',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is the OWASP Top Ten, and why is it important in web development?',
      answer:
        '- **OWASP Top Ten** is a list of the most critical web application security risks identified by the Open Web Application Security Project.\n- **Importance**:\n     - Provides a guideline for developers to understand and mitigate common vulnerabilities.\n     - Helps prioritize security efforts to address the most significant threats.',
    },
    {
      href: '/js-track/frontend-development/security-best-practices/page.mdx#preventing-sql-injection-attacks',
      title: 'Preventing SQL Injection Attacks',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'Explain how you would prevent SQL Injection attacks in a web application.',
      answer:
        '- **Use Parameterized Queries**:\n     - Utilize prepared statements to separate SQL logic from user input.\n- **Input Validation and Sanitization**:\n     - Validate user inputs for expected data types and formats.\n- **Use ORM Frameworks**:\n     - Leverage Object-Relational Mapping tools that handle query construction safely.\n- **Least Privilege Principle**:\n     - Limit database permissions to reduce the impact of a potential injection.',
    },
    {
      href: '/js-track/frontend-development/security-best-practices/page.mdx#best-practices-for-password-storage',
      title: 'Best Practices for Password Storage',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'What are the best practices for securely storing user passwords?',
      answer:
        '- **Hash Passwords**:\n     - Use strong, adaptive hashing algorithms like bcrypt, Argon2, or scrypt.\n- **Use Salts**:\n     - Add a unique, random salt to each password before hashing.\n- **Avoid Plain Text and Weak Hashing**:\n     - Never store passwords in plain text or use outdated algorithms like MD5 or SHA1.\n- **Implement Password Policies**:\n     - Enforce strong password requirements to improve overall security.',
    },
    {
      href: '/js-track/frontend-development/security-best-practices/page.mdx#preventing-cross-site-attacks',
      title: 'Preventing Cross Site Attacks',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How does Cross-Site Scripting (XSS) occur, and how can you prevent it?',
      answer:
        '- **Occurrence**:\n     - XSS happens when an application includes untrusted user input in a response without proper validation or escaping, allowing attackers to inject malicious scripts.\n- **Prevention**:\n     - **Output Encoding**:\n       - Escape user input before rendering it in the browser.\n     - **Input Validation**:\n       - Validate and sanitize inputs on the server side.\n     - **Content Security Policy (CSP)**:\n       - Implement CSP headers to restrict the execution of scripts.\n     - **Use Secure Frameworks**:\n       - Utilize frameworks that provide built-in XSS protection.',
    },
    {
      href: '/js-track/frontend-development/security-best-practices/page.mdx#principle-of-least-privilege',
      title: 'Principle of Least Privilege',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'What is the principle of least privilege, and why is it important in access control?',
      answer:
        '- **Definition**:\n     - The principle states that users and systems should have the minimum level of access necessary to perform their tasks.\n- **Importance**:\n     - Reduces the risk of misuse or exploitation of privileges.\n     - Limits the potential damage from compromised accounts.\n     - Encourages careful assignment and management of permissions.',
    },
  ],
  serverSideRendering: [
    {
      href: '/js-track/frontend-development/server-side-rendering/page.mdx#server-side-vs-client-side-rendering',
      title: 'Server-Side vs Client-Side Rendering',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is Server-Side Rendering (SSR), and how does it differ from Client-Side Rendering (CSR)?',
      answer:
        '- **SSR**:\n\n     - Rendering web pages on the server and sending fully rendered HTML to the client.\n     - The browser displays content immediately upon receiving the HTML.\n\n- **CSR**:\n\n     - The server sends minimal HTML and JavaScript files.\n     - The browser executes JavaScript to render content.\n\n- **Differences**:\n\n     - SSR improves initial load time and SEO.\n     - CSR offers richer interactivity but may have slower initial rendering.',
    },
    {
      href: '/js-track/frontend-development/server-side-rendering/page.mdx#benefits-of-server-side-rendering',
      title: 'Benefits of Server-Side Rendering',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What are the main benefits of using SSR in a web application?',
      answer:
        '- **Improved Performance**:\n\n     - Faster initial content display enhances user experience.\n\n- **Enhanced SEO**:\n\n     - Search engines can index content more effectively.\n\n- **Better User Experience**:\n\n     - Content is accessible even if JavaScript fails.\n\n- **Social Media Sharing**:\n\n     - Accurate metadata for link previews.',
    },
    {
      href: '/js-track/frontend-development/server-side-rendering/page.mdx#implementing-server-side-rendering-challenges',
      title: 'Implementing Server-Side Rendering Challenges',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What challenges might you face when implementing SSR, and how can you address them?',
      answer:
        '- **Complexity**:\n\n     - Requires additional setup and understanding of SSR concepts.\n     - **Solution**: Use frameworks like Next.js or Angular Universal to simplify.\n\n- **Performance Overhead**:\n\n     - Increased server load due to rendering.\n     - **Solution**: Implement caching strategies, optimize code.\n\n- **State Management**:\n\n     - Synchronizing server and client state.\n     - **Solution**: Use data hydration techniques.\n\n- **Third-Party Libraries Compatibility**:\n\n     - Some libraries may not support SSR.\n     - **Solution**: Use isomorphic libraries or conditionally load code.',
    },
    {
      href: '/js-track/frontend-development/server-side-rendering/page.mdx#next-js-server-side-rendering',
      title: 'Next.js Server-Side Rendering',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'How does Next.js facilitate SSR in React applications?',
      answer:
        '- **Out-of-the-Box SSR**:\n\n     - Provides automatic server rendering without manual setup.\n\n- **Page-Based Routing**:\n\n     - Simplifies routing through the file system.\n\n- **Data Fetching Methods**:\n\n     - Offers `getServerSideProps` and `getStaticProps` for data fetching.\n\n- **Code Splitting**:\n\n     - Automatically splits code to optimize performance.',
    },
    {
      href: '/js-track/frontend-development/server-side-rendering/page.mdx#handling-server-side-data-fetching',
      title: 'Handling Server-Side Data Fetching',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain how you would handle data fetching and state synchronization in an SSR application.',
      answer:
        '- **Data Fetching on the Server**:\n\n     - Fetch data during server rendering.\n\n- **Passing Data to Client**:\n\n     - Embed serialized data in the HTML.\n\n- **State Hydration**:\n\n     - On the client, initialize state with the data from the server.\n\n- **Avoid Duplicate Requests**:\n\n     - Use techniques like `TransferState` in Angular or data hydration in React to prevent re-fetching data on the client.',
    },
  ],
  stateManagement: [
    {
      href: '/js-track/frontend-development/state-management-solutions/page.mdx#redux-core-principles',
      title: 'Redux Core Principles',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What are the core principles of Redux, and how do they help in state management?',
      answer: '- The core principles of Redux are:',
    },
    {
      href: '/js-track/frontend-development/state-management-solutions/page.mdx#react-context-api-benefits',
      title: 'React Context API Benefits',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How does the Context API in React help avoid prop drilling, and what are its limitations?',
      answer:
        '- The Context API allows components to share data without passing props through every level of the component tree, effectively avoiding prop drilling.\n- **Limitations**:\n     - Frequent updates to context can lead to performance issues due to re-rendering of all consuming components.\n     - Overuse can lead to tightly coupled components and difficulty in tracking data flow.',
    },
    {
      href: '/js-track/frontend-development/state-management-solutions/page.mdx#state-management-frameworks-compared',
      title: 'State Management Frameworks Compared',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Compare and contrast MobX and Redux in terms of their approach to state management.',
      answer:
        '- **MobX**:\n     - Uses observables to automatically track and update state changes.\n     - Emphasizes minimal boilerplate and reactive programming.\n     - Allows mutable state and implicit data flow.\n- **Redux**:\n     - Enforces a strict unidirectional data flow.\n     - Requires immutable state updates and explicit actions.\n     - Has more boilerplate but offers predictability and easier debugging.',
    },
    {
      href: '/js-track/frontend-development/state-management-solutions/page.mdx#choosing-between-redux-and-context',
      title: 'Choosing Between Redux and Context',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'When would you choose Redux over the Context API for state management in a React application?',
      answer:
        '- **Choose Redux**:\n     - For large applications with complex state that needs to be shared across many components.\n     - When you need middleware for handling side effects or asynchronous actions.\n     - If you require advanced debugging tools and predictable state transitions.\n- **Context API** is more suitable for smaller applications or for sharing simple, static data.',
    },
    {
      href: '/js-track/frontend-development/state-management-solutions/page.mdx#middleware-in-redux',
      title: 'Middleware in Redux',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain the role of middleware in Redux and provide an example of its use.',
      answer:
        '- Middleware in Redux provides an extension point between dispatching an action and the moment it reaches the reducer.\n- It can intercept actions to perform side effects, such as logging, crash reporting, or handling asynchronous operations.\n- **Example**: The Redux Thunk middleware allows writing action creators that return a function instead of an action, enabling asynchronous dispatching.',
    },
  ],
  testing: [
    {
      href: '/js-track/frontend-development/testing-strategies/page.mdx#unit-vs-integration-testing',
      title: 'Unit vs Integration Testing',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is the difference between unit tests and integration tests?',
      answer:
        '- **Unit Tests**:\n     - Test individual units of code in isolation.\n     - Focus on the correctness of a single function or component.\n- **Integration Tests**:\n     - Test the interaction between multiple units or components.\n     - Ensure that combined units work together as expected.',
    },
    {
      href: '/js-track/frontend-development/testing-strategies/page.mdx#jest-testing-framework-overview',
      title: 'Jest Testing Framework Overview',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'How does Jest differ from other testing frameworks, and what are its advantages?',
      answer:
        '- **Differences**:\n     - Jest is an all-in-one testing framework with built-in assertion library, mocking, and coverage reporting.\n     - It requires minimal configuration and is optimized for React applications.\n- **Advantages**:\n     - **Ease of Use**: Zero configuration setup.\n     - **Performance**: Runs tests in parallel, intelligent test watching.\n     - **Mocking**: Powerful mocking capabilities for functions and modules.\n     - **Snapshot Testing**: Useful for testing UI components.',
    },
    {
      href: '/js-track/frontend-development/testing-strategies/page.mdx#mocking-in-testing-basics',
      title: 'Mocking in Testing Basics',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'Explain the concept of mocking in testing and provide an example of how to mock a module in Jest.',
      answer:
        "- **Concept**:\n     - Mocking involves replacing a function or module with a mock implementation to isolate the code under test.\n     - Helps in testing components that rely on external dependencies.\n- **Example**:\n\n     ```javascript\n     // api.js\n     export const fetchData = () => {\n       return fetch('/data').then((response) => response.json());\n     };\n     ```\n\n     ```javascript\n     // api.test.js\n     import { fetchData } from './api';\n\n     jest.mock('./api');\n\n     test('fetchData returns mock data', async () => {\n       api.fetchData.mockResolvedValue({ data: 'Mock Data' });\n       const data = await fetchData();\n       expect(data).toEqual({ data: 'Mock Data' });\n     });\n     ```",
    },
    {
      href: '/js-track/frontend-development/testing-strategies/page.mdx#writing-tests-with-react',
      title: 'Writing Tests with React',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are some best practices when writing tests with React Testing Library?',
      answer:
        "- **Test Behavior, Not Implementation**: Focus on how the user interacts with the component.\n- **Use Accessible Queries**: Prefer queries like `getByRole`, `getByLabelText`.\n- **Avoid Testing Internal State**: Don't rely on component internals or state variables.\n- **Cleanup After Tests**: Ensure the DOM is clean after each test.\n- **Handle Asynchronous Code Properly**: Use `waitFor`, `findBy` queries for async operations.",
    },
    {
      href: '/js-track/frontend-development/testing-strategies/page.mdx#testing-asynchronous-code-in-jest',
      title: 'Testing Asynchronous Code in Jest',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'How can you test asynchronous code in Jest?',
      answer:
        "- **Using `async/await`**:\n\n     ```javascript\n     test('fetches data asynchronously', async () => {\n       const data = await fetchData();\n       expect(data).toBeDefined();\n     });\n     ```\n\n- **Using Promises**:\n\n     ```javascript\n     test('fetches data using promises', () => {\n       return fetchData().then((data) => {\n         expect(data).toBeDefined();\n       });\n     });\n     ```\n\n- **Using `done` Callback**:\n\n     ```javascript\n     test('fetches data with done callback', (done) => {\n       fetchData().then((data) => {\n         expect(data).toBeDefined();\n         done();\n       });\n     });\n     ```",
    },
  ],
  git: [
    {
      href: '/js-track/frontend-development/version-control-and-collaboration/page.mdx#git-merge-vs-rebase',
      title: 'Git Merge vs Rebase',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'What is the difference between `git merge` and `git rebase`?',
      answer:
        '- **`git merge`**:\n     - Combines the histories of two branches.\n     - Creates a new merge commit.\n     - Preserves the complete history with all commits.\n- **`git rebase`**:\n     - Moves a branch to a new base commit.\n     - Reapplies commits on top of another branch.\n     - Results in a linear history.\n- **When to Use**:\n     - Use `merge` when you want to preserve the full history.\n     - Use `rebase` to clean up history before merging or when you prefer a linear history.',
    },
    {
      href: '/js-track/frontend-development/version-control-and-collaboration/page.mdx#resolving-git-merge-conflicts',
      title: 'Resolving Git Merge Conflicts',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'Explain how you would resolve a merge conflict in Git.',
      answer:
        "- **Process**:\n     - Attempt to merge branches.\n     - Git indicates a conflict and marks conflicting files.\n     - Open the files and look for conflict markers.\n     - Manually edit the files to resolve conflicts.\n     - After resolving, add the files to staging with `git add`.\n     - Commit the merge with `git commit`.\n- **Tools**:\n     - Use Git's built-in mergetool or IDEs to help visualize conflicts.",
    },
    {
      href: '/js-track/frontend-development/version-control-and-collaboration/page.mdx#understanding-pull-requests',
      title: 'Understanding Pull Requests',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'What is a pull request, and how does it facilitate collaboration?',
      answer:
        "- **Definition**:\n     - A pull request is a method for developers to notify team members about changes they've pushed to a branch in a repository.\n- **Facilitation**:\n     - Allows others to review code before merging.\n     - Enables discussion and feedback.\n     - Helps maintain code quality and consistency.\n     - Integrates seamlessly with code review tools and CI pipelines.",
    },
    {
      href: '/js-track/frontend-development/version-control-and-collaboration/page.mdx#reverting-a-remote-commit',
      title: 'Reverting a Remote Commit',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'How do you revert a commit that has already been pushed to a remote repository?',
      answer:
        "- **Using `git revert`**:\n     - Creates a new commit that undoes the changes introduced by the target commit.\n     - Safe for shared repositories because it doesn't rewrite history.\n     - **Command**:\n\n       ```bash\n       git revert <commit-hash>\n       ```\n\n- **Alternative Methods** (Use with caution):\n     - **Force Push After Reset**:\n       - **Not recommended** for public/shared repositories.\n       - Can cause issues for other collaborators.",
    },
    {
      href: '/js-track/frontend-development/version-control-and-collaboration/page.mdx#best-practices-for-commits',
      title: 'Best Practices for Commits',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What are some best practices when writing commit messages?',
      answer:
        '- **Format**:\n     - **Subject Line**:\n       - Brief summary (50 characters or less).\n       - Use imperative mood (e.g., "Fix bug" not "Fixed bug").\n     - **Body**:\n       - Detailed explanation if necessary.\n       - Explain the "what" and "why", not the "how".\n     - **Separate Subject and Body with a Blank Line**.\n- **Consistency**:\n     - Follow team or project guidelines.\n- **Clarity**:\n     - Be clear and concise.\n- **Avoid**:\n     - Vague messages like "Misc updates" or "Fix stuff".',
    },
  ],
  virtualDom: [
    {
      href: '/js-track/frontend-development/virtual-dom-and-rendering/page.mdx#virtual-dom-performance-benefits',
      title: 'Virtual DOM Performance Benefits',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What is the Virtual DOM, and how does it improve performance in frontend frameworks like React?',
      answer:
        '- The Virtual DOM is an in-memory representation of the real DOM, implemented as a lightweight JavaScript object.\n- It improves performance by minimizing direct DOM manipulations, which are expensive operations.\n- When the state changes, a new Virtual DOM is created, and the framework uses a diffing algorithm to compare it with the previous one.\n- Only the necessary changes are applied to the real DOM, reducing the number of DOM operations and enhancing performance.',
    },
    {
      href: '/js-track/frontend-development/virtual-dom-and-rendering/page.mdx#react-reconciliation-process',
      title: 'React Reconciliation Process',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'Explain the reconciliation process in React. How does React determine which parts of the DOM need to be updated?',
      answer:
        "- Reconciliation is React's process of updating the UI by comparing the new Virtual DOM with the previous one.\n- React uses a diffing algorithm that compares elements based on their type and keys.\n     - If elements are of the same type, React recursively compares their attributes and children.\n     - If elements are of different types, React replaces the old node with the new one.\n- For lists, keys are used to identify elements across renders.\n- This process determines the minimal set of changes required, and only those changes are applied to the real DOM.",
    },
    {
      href: '/js-track/frontend-development/virtual-dom-and-rendering/page.mdx#key-management-in-react',
      title: 'Key Management in React',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        "Why are keys important in lists, and what can happen if you don't use them correctly in React?",
      answer:
        '- Keys help React identify which items have changed, been added, or removed in a list.\n- They provide a way for React to keep track of elements between renders.\n- If keys are not used or used incorrectly (e.g., using array indices), it can lead to:\n     - Incorrect UI updates.\n     - Loss of component state.\n     - Unnecessary re-renders and performance issues.\n- Proper keys ensure that React can efficiently update the DOM and maintain component state.',
    },
    {
      href: '/js-track/frontend-development/virtual-dom-and-rendering/page.mdx#optimizing-react-render-performance',
      title: 'Optimizing React Render Performance',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        "How does React's `shouldComponentUpdate` method or `React.memo` help optimize rendering performance?",
      answer:
        "- `shouldComponentUpdate` and `React.memo` allow developers to prevent unnecessary re-renders.\n- **`shouldComponentUpdate`**:\n     - Used in class components.\n     - Can be overridden to return `false` if the component doesn't need to re-render.\n     - Helps avoid the rendering and diffing process for that component.\n- **`React.memo`**:\n     - Used for functional components.\n     - Memoizes the component, re-rendering it only when its props change.\n- Both optimize performance by reducing the number of Virtual DOM comparisons and DOM updates.",
    },
    {
      href: '/js-track/frontend-development/virtual-dom-and-rendering/page.mdx#optimizing-virtual-dom-rendering',
      title: 'Optimizing Virtual DOM Rendering',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question:
        'What are some best practices for optimizing the Virtual DOM rendering process in a React application?',
      answer:
        "- **Use Keys Properly**: Assign unique and stable keys to list items.\n- **Avoid Inline Functions in Render**: Define functions outside of the render method to prevent new function references.\n- **Optimize Component Updates**:\n     - Use `React.memo` or `PureComponent` to prevent unnecessary re-renders.\n     - Implement `shouldComponentUpdate` for fine-grained control.\n- **Minimize State and Props Changes**: Only update state when necessary.\n- **Split Components**: Break down large components into smaller, manageable pieces.\n- **Avoid Deeply Nested Objects in State**: Use immutable data structures or libraries like Immutable.js.\n- **Batch Updates**: Leverage React's batching mechanism to group state updates.",
    },
  ],
  performance: [
    {
      href: '/js-track/frontend-development/web-performance-metrics/page.mdx#understanding-core-web-vitals',
      title: 'Understanding Core Web Vitals',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question: 'What are Core Web Vitals, and why are they important?',
      answer:
        '- **Core Web Vitals** are a set of performance metrics defined by Google focusing on user experience aspects like loading, interactivity, and visual stability.\n- **Importance**:\n     - Impact search rankings as Google uses them in its ranking algorithm.\n     - Provide a standardized way to measure user-centric performance.',
    },
    {
      href: '/js-track/frontend-development/web-performance-metrics/page.mdx#lighthouse-performance-metrics',
      title: 'Lighthouse Performance Metrics',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.EASY,
      question:
        'How does Lighthouse measure performance, and what are some key metrics it reports?',
      answer:
        '- **Measurement**:\n     - Lighthouse simulates page loads and audits various performance aspects.\n- **Key Metrics**:\n     - **First Contentful Paint (FCP)**\n     - **Largest Contentful Paint (LCP)**\n     - **Time to Interactive (TTI)**\n     - **Speed Index**\n     - **Total Blocking Time (TBT)**\n     - **Cumulative Layout Shift (CLS)**',
    },
    {
      href: '/js-track/frontend-development/web-performance-metrics/page.mdx#optimizing-website-load-times',
      title: 'Optimizing Website Load Times',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: "Explain how you would optimize a website's load time.",
      answer:
        '- **Minimize HTTP Requests**:\n     - Combine files, reduce third-party scripts.\n- **Optimize Images**:\n     - Compress, use appropriate formats, implement lazy loading.\n- **Minify and Compress Assets**:\n     - Minify code, enable Gzip compression.\n- **Implement Code Splitting**:\n     - Use dynamic imports, lazy load non-critical code.\n- **Optimize Critical Rendering Path**:\n     - Inline critical CSS, defer non-critical resources.\n- **Use CDN**:\n     - Serve content from geographically closer servers.',
    },
    {
      href: '/js-track/frontend-development/web-performance-metrics/page.mdx#optimizing-the-critical-path',
      title: 'Optimizing the Critical Path',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.HARD,
      question:
        'What is the Critical Rendering Path, and how can you optimize it?',
      answer:
        '- **Critical Rendering Path**:\n     - The sequence of steps the browser takes to convert HTML, CSS, and JavaScript into pixels.\n- **Optimization Strategies**:\n     - Minimize critical resources.\n     - Inline critical CSS.\n     - Defer or async load JavaScript.\n     - Remove render-blocking resources.',
    },
    {
      href: '/js-track/frontend-development/web-performance-metrics/page.mdx#improving-web-performance',
      title: 'Improving Web Performance',
      type: ProblemType.THEORY,
      difficulty: ProblemDifficulty.MEDIUM,
      question: 'How do you use service workers to improve web performance?',
      answer:
        '- **Caching Resources**:\n     - Service workers can cache assets and serve them from cache.\n- **Offline Support**:\n     - Enable the app to function without a network connection.\n- **Implementing Caching Strategies**:\n     - Use cache-first or network-first strategies based on resource type.\n- **Use Workbox**:\n     - Simplify service worker setup and caching strategies.',
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
  ...Object.values(CORE_FUNDAMENTALS).flatMap((lesson) =>
    lesson.map((item) => item.href),
  ),
  ...Object.values(TYPESCRIPT_INTRODUCTION).flatMap((lesson) =>
    lesson.map((item) => item.href),
  ),
  ...Object.values(ADVANCED_CONCEPTS).flatMap((lesson) =>
    lesson.map((item) => item.href),
  ),
  ...Object.values(FRONTEND_DEVELOPMENT).flatMap((lesson) =>
    lesson.map((item) => item.href),
  ),
]
