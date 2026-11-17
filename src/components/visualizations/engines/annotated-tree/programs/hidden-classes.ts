import type { MapProgram } from '../truth/record-maps'

/**
 * Engine and Runtime (js-track/core-fundamentals/engine-and-runtime, FREE):
 * Example 1's problem and solution blocks as written, and the practice
 * answer on hidden classes (its literals, values only), by locator and
 * sha256. Each runs under `--allow-natives-syntax` (`../truth/record-maps.ts`):
 * probes print the map of `this` inside the constructor and of each object
 * between statements; one harness line at the end (`void 0`) is the last
 * pause, where `%HaveSameMap` is read.
 */
const PAGE = 'content/js-track/core-fundamentals/engine-and-runtime/page.mdx'
const EXAMPLE = { path: PAGE, heading: '#### **Example 1: Hidden Classes Optimization**', lang: 'javascript' } as const
const END = { code: 'void 0' } as const

/** Problem: lines 1-4 the constructor (a then b), 6-7 obj1 and its c, 9-10 obj2 and its d; 11 the pause. */
export const lateProgram: MapProgram = {
  id: 'late-properties',
  source: [{ block: EXAMPLE, lessonSha256: '3099f0a4c73156edd967bf2d71f84878e301745ea6a90341b809c50c172b0764' }, END],
  probes: [
    { line: 2, as: 'ctor-empty', maps: ['this'] },
    { line: 3, as: 'ctor-a', maps: ['this'] },
    { line: 7, as: 'obj1-ab', maps: ['obj1'] },
    { line: 10, as: 'obj2-ab', maps: ['obj2'] },
    { line: 11, as: 'end', maps: ['obj1', 'obj2'], read: ['same'] },
  ],
  watch: { same: '%HaveSameMap(obj1, obj2)' },
}

/** Solution: lines 1-6 the constructor (a, b, c, d), 8-9 obj1 and c = 3, 11-12 obj2 and d = 4; 13 the pause. */
export const fixedProgram: MapProgram = {
  id: 'constructor-fixed',
  source: [{ block: { ...EXAMPLE, nth: 2 }, lessonSha256: 'd40b9203809734cf8f1113fe955bfc133f74de6c0e9bad24ed8ca6efaf4d3c8f' }, END],
  probes: [
    { line: 2, as: 'ctor-empty', maps: ['this'] },
    { line: 3, as: 'ctor-a', maps: ['this'] },
    { line: 4, as: 'ctor-ab', maps: ['this'] },
    { line: 5, as: 'ctor-abc', maps: ['this'] },
    { line: 9, as: 'obj1-before', maps: ['obj1'] },
    { line: 11, as: 'obj1-after', maps: ['obj1'] },
    { line: 13, as: 'end', maps: ['obj1', 'obj2'], read: ['same'] },
  ],
  watch: { same: '%HaveSameMap(obj1, obj2)' },
}

/** The practice answer's literals: lines 1-2 a and b ({x, y}), 4 c ({y, x}); 6 the pause. */
export const orderProgram: MapProgram = {
  id: 'property-order',
  source: [
    {
      block: { path: 'content/js-track/core-fundamentals/_lessons.json', lesson: '/engine-and-runtime', problem: 'hidden-classes-explained', lang: 'javascript' },
      lessonSha256: '6bb1b515011f5e30e28492486b4aabe0180c8fe83379a3334b793c6fa12e237b',
    },
    END,
  ],
  probes: [{ line: 6, as: 'end', maps: ['a', 'b', 'c'], read: ['ab', 'ac'] }],
  watch: { ab: '%HaveSameMap(a, b)', ac: '%HaveSameMap(a, c)' },
}

export const HIDDEN_CLASS_PROGRAMS = [lateProgram, fixedProgram, orderProgram]
