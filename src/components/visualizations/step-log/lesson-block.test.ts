// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { compile } from '@mdx-js/mdx'
import { afterAll, describe, expect, it } from 'vitest'
import { VIZ_DESCRIPTORS } from '../registry'
import { loadProgram, readBlock } from './lesson-block'
import { composeProgram, displayProblems, displayText, placeholderText, toWrapRows, type ProgramSource } from './lesson-source'
import { remarkVizCode } from './remark-viz-code'
import { resolveVizCode } from './resolve-code'
import { sha256 } from './truth'

/**
 * The premium-code helpers (the policy: the public repo holds locators,
 * hashes and rows without text, never a lesson's full block or an answer's
 * text). Runs everywhere on a synthetic content checkout, so CI checks the
 * extraction, the hash check and the resolution too; nothing here is
 * premium text.
 */

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'viz-content-'))
afterAll(() => fs.rmSync(root, { recursive: true, force: true }))

const MDX = 'content/js-track/x/demo/page.mdx'
const JSON_PATH = 'content/js-track/x/_lessons.json'
const LESSON_BLOCK = "function add(a, b) {\n  return a + b\n}\n\nconsole.log(add(1, 2))"
const ANSWER_BLOCK = '/**\n * class Box {\n *   v: number\n * }\n */\n\nfunction twice(n: number): number {\n    return n * 2\n}'
function write(rel: string, text: string) {
  const file = path.join(root, rel.replace(/^content\//, ''))
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text)
}
write(MDX, `# Demo\n\n## **Adding**\n\nText.\n\n\`\`\`typescript\nconst ignored = 1\n\`\`\`\n\n<CodeGroup>\n\n\`\`\`javascript\n${LESSON_BLOCK}\n\`\`\`\n\n</CodeGroup>\n`)
write(JSON_PATH, JSON.stringify({ lessons: [{ id: '/demo', problems: [{ id: 'twice', answer: `Intro.\n\n\`\`\`typescript\n${ANSWER_BLOCK}\n\`\`\`\n` }] }] }))

const lessonRef = { path: MDX, heading: '## **Adding**', lang: 'javascript' }
const answerRef = { path: JSON_PATH, lesson: '/demo', problem: 'twice', lang: 'typescript' }

describe('readBlock', () => {
  it('reads the first fence of the language after a heading, and a practice answer’s fence', () => {
    expect(readBlock(lessonRef, root)).toBe(LESSON_BLOCK)
    expect(readBlock(answerRef, root)).toBe(ANSWER_BLOCK)
  })

  it('is null when the file is not in the checkout (CI), and throws when the lesson moved', () => {
    expect(readBlock({ ...lessonRef, path: 'content/dsa-track/none/page.mdx' }, root)).toBeNull()
    expect(() => readBlock({ ...lessonRef, heading: '## **Gone**' }, root)).toThrow(/no heading/)
    expect(() => readBlock({ ...answerRef, problem: 'other' }, root)).toThrow(/no typescript block/)
  })
})

describe('loadProgram', () => {
  const source: ProgramSource = [
    { block: answerRef, lessonSha256: sha256(ANSWER_BLOCK), lines: [2, 4], uncomment: true },
    { code: '' },
    { block: answerRef, lessonSha256: sha256(ANSWER_BLOCK), lines: [7] },
    { code: 'console.log(twice(4))' },
  ]

  it('composes the program as run: parts in order, a commented declaration uncommented', () => {
    const loaded = loadProgram(source, root)
    expect(loaded).toEqual({ ok: true, text: 'class Box {\n  v: number\n}\n\nfunction twice(n: number): number {\n    return n * 2\n}\nconsole.log(twice(4))' })
  })

  it('fails the hash check when the block was tampered with', () => {
    write(JSON_PATH, JSON.stringify({ lessons: [{ id: '/demo', problems: [{ id: 'twice', answer: `\`\`\`typescript\n${ANSWER_BLOCK.replace('n * 2', 'n + n')}\n\`\`\`` }] }] }))
    try {
      expect(() => loadProgram(source, root)).toThrow(/changed \(sha256 [0-9a-f]{64}, committed [0-9a-f]{64}\): re-record/)
    } finally {
      write(JSON_PATH, JSON.stringify({ lessons: [{ id: '/demo', problems: [{ id: 'twice', answer: `\`\`\`typescript\n${ANSWER_BLOCK}\n\`\`\`` }] }] }))
    }
    expect(loadProgram(source, root).ok).toBe(true)
  })

  it('says which block is missing instead of guessing (CI)', () => {
    const absent: ProgramSource = [{ block: { ...lessonRef, path: 'content/dsa-track/none/page.mdx' }, lessonSha256: '0' }]
    expect(loadProgram(absent, root)).toEqual({ ok: false, missing: 'content/dsa-track/none/page.mdx ## **Adding** (javascript)' })
  })
})

describe('display rows', () => {
  const lines = composeProgram([{ block: answerRef, lessonSha256: '' }], (b) => readBlock(b, root)!).split('\n')
  const text = [
    { src: 7, text: 'function twice(' },
    { src: 7, text: '  n: number' },
    { src: 7, text: '): number {' },
    { src: 8, text: '  return n * 2' },
    { src: 9, text: '}' },
  ]

  it('writes an answer’s rows without text, and cuts the same text back from the program', () => {
    const rows = toWrapRows(lines, text)
    expect(rows[1]).toEqual({ src: 7, wrap: [2, 15, 24] })
    expect(displayText(lines, rows)).toEqual(text.map((r) => r.text))
    expect(displayProblems(lines, rows, { maxCols: 35, blankRows: false })).toEqual([])
    // The committed placeholders have the real widths and none of the text.
    const held = placeholderText(rows)
    expect(held.map((l) => [...l].length)).toEqual(text.map((r) => r.text.length))
    expect(held.join('')).not.toMatch(/[a-z]/)
  })

  it('fails a row that skips, rewrites or reorders the line', () => {
    expect(displayProblems(lines, [{ src: 7, text: 'function twice(n: number): number {' }, { src: 8, text: '  return n * 3' }, { src: 9, text: '}' }], { maxCols: 40, blankRows: false }).join('\n')).toMatch(/line 8/)
    expect(displayProblems(lines, [{ src: 7, wrap: [0, 0, 8] }, { src: 8, wrap: [2, 0, 12] }, { src: 9, wrap: [0, 0, 1] }], { maxCols: 40, blankRows: false }).join('\n')).toMatch(/line 7: " twice\(n: number\): number \{" is not shown/)
  })
})

describe('resolving a practice answer’s pane for a page', () => {
  it('has nothing to resolve for a frame without one', async () => {
    expect(await resolveVizCode('event-loop', 'basic-ordering', root)).toEqual({ kind: 'none' })
    expect(await resolveVizCode('linked-list-pointer-rewiring', 'reverse-between-m2-n4', root)).toEqual({ kind: 'none' })
  })

  it('renders nothing rather than guess when the answer is not in the checkout', async () => {
    const r = await resolveVizCode('linked-list-pointer-rewiring', 'palindrome-1221', root)
    expect(r.kind).toBe('missing')
  })

  it('every premium preset’s rows are its placeholders’ widths (the reserve never depends on the text)', () => {
    for (const d of Object.values(VIZ_DESCRIPTORS))
      if (d.form === 'step')
        for (const p of d.presets) {
          const c = p.log.code
          if (!c?.premium) continue
          expect(c.lines, p.id).toEqual(placeholderText(c.premium.rows))
          expect(c.tokens, p.id).toBeUndefined()
        }
  })

  it('the MDX plugin leaves an unresolvable <Viz> alone (it renders nothing) and says why', async () => {
    const why: string[] = []
    const out = String(
      await compile('<Viz id="bfs-dfs-frontier" preset="bst-iterator-stack" />\n\n<Viz id="event-loop" />', {
        remarkPlugins: [[remarkVizCode, { root, onMissing: (w: string) => why.push(w) }]],
      }),
    )
    expect(out).not.toMatch(/code:/)
    expect(why).toHaveLength(1)
    expect(why[0]).toMatch(/^bfs-dfs-frontier\/bst-iterator-stack: /)
  })
})

/** With the local content checkout (never on CI): the real answers resolve, the panes spell their rows. */
describe('with the local content checkout', () => {
  const present = fs.existsSync(path.join(process.cwd(), 'src', 'content', 'dsa-track', 'user-defined-data-structures', '_lessons.json'))
  const name = (n: string) => (present ? n : `${n} (skipped: needs the premium answers from a local content checkout, src/content; CI has free samples only)`)

  it.skipIf(!present)(name('resolves every practice-answer preset to text of the committed widths, tokenized'), async () => {
    for (const [id, preset] of [
      ['bfs-dfs-frontier', 'bfs-levels'],
      ['bfs-dfs-frontier', 'dijkstra-lazy-heap'],
      ['bfs-dfs-frontier', 'bst-iterator-stack'],
      ['linked-list-pointer-rewiring', 'palindrome-1231'],
    ] as const) {
      const r = await resolveVizCode(id, preset)
      expect(r.kind, `${id}/${preset}`).toBe('resolved')
      if (r.kind !== 'resolved') continue
      for (const c of Object.values(r.code)) {
        expect(c.lines.join('')).not.toContain('·')
        c.tokens!.forEach((t, i) => expect(t.map((x) => x.text).join('')).toBe(c.lines[i]))
      }
    }
  })

  it.skipIf(!present)(name('the MDX plugin puts the pane on the <Viz> element'), async () => {
    const out = String(await compile('<Viz id="linked-list-pointer-rewiring" preset="palindrome-1221" />', { remarkPlugins: [remarkVizCode] }))
    expect(out).toMatch(/code: "\{\\"palindrome-split-reverse-compare\\":\{\\"lines\\":/)
  })
})
