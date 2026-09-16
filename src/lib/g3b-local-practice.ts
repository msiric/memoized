export const G3B_LOCAL_STARTERS = [
  {
    language: 'javascript',
    filename: 'substring.js',
    code: [
      'function findLongestCommonSubstring(s1, s2) {',
      '    throw new Error("Not implemented: write your solution here.");',
      '}',
      '',
      'console.log(findLongestCommonSubstring("abcdxyz", "xyzabcd"));',
    ].join('\n'),
    commands: 'node --version\nnode substring.js',
  },
  {
    language: 'typescript',
    filename: 'substring.ts',
    code: [
      'function findLongestCommonSubstring(s1: string, s2: string): string {',
      '    throw new Error("Not implemented: write your solution here.");',
      '}',
      '',
      'console.log(findLongestCommonSubstring("abcdxyz", "xyzabcd"));',
    ].join('\n'),
    commands: [
      'tsc --version',
      'tsc substring.ts --strict --target ES2022 --module commonjs --outDir starter-output',
      'node starter-output/substring.js',
    ].join('\n'),
  },
] as const
