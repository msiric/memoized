/**
 * Reads a visual's code blocks from a local content checkout (spec P6 with
 * the premium-code policy): `src/content/{js-track,dsa-track}`, gitignored,
 * copied or linked from the private content repo by
 * `src/scripts/setup-content.ts`. CI has only the free samples, so a premium
 * block is absent there: callers skip what needs its text and say so.
 *
 * Node-only: truth tests, recorders and the server-side code resolver import
 * this; client code never does.
 */
import fs from 'node:fs'
import path from 'node:path'
import { sha256 } from './truth'
import { composeProgram, isAnswerRef, refLabel, type BlockRef, type ProgramSource } from './lesson-source'

/** The content checkout the app reads (`src/content`). */
export const contentRoot = (): string => path.join(process.cwd(), 'src', 'content')

const fileOf = (b: BlockRef, root: string) => path.join(root, b.path.replace(/^content\//, ''))

function fences(text: string, lang: string): { at: number; body: string }[] {
  const re = new RegExp('^```' + lang + '\\n([\\s\\S]*?)\\n```', 'gm')
  return [...text.matchAll(re)].map((m) => ({ at: m.index ?? 0, body: m[1] }))
}

/**
 * The block's exact text (the fence's contents, no final newline), or null
 * when its file is not in the checkout (CI, a free-only checkout). Throws
 * when the file is there but the locator finds nothing: the lesson moved.
 */
export function readBlock(b: BlockRef, root = contentRoot()): string | null {
  const file = fileOf(b, root)
  if (!fs.existsSync(file)) return null
  const text = fs.readFileSync(file, 'utf8')
  if (isAnswerRef(b)) {
    const lessons = (JSON.parse(text) as { lessons: { id: string; problems?: { id: string; answer?: string; question?: string }[] }[] }).lessons
    const problem = lessons.find((l) => l.id === b.lesson)?.problems?.find((q) => q.id === b.problem)
    const body = b.field === 'question' ? problem?.question : problem?.answer
    const block = body ? fences(body, b.lang)[(b.nth ?? 1) - 1] : undefined
    if (!block) throw new Error(`no ${b.lang} block in ${refLabel(b)}`)
    return block.body
  }
  const heading = text.search(new RegExp(`^${b.heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[ \\t]*$`, 'm'))
  if (heading < 0) throw new Error(`no heading in ${refLabel(b)}`)
  const block = fences(text, b.lang).filter((f) => f.at > heading)[(b.nth ?? 1) - 1]
  if (!block) throw new Error(`no ${b.lang} block after ${refLabel(b)}`)
  return block.body
}

export type LoadedProgram =
  | { ok: true; text: string }
  /** A block's file is not in the checkout: skip what needs the text. */
  | { ok: false; missing: string }

/**
 * The program as run, composed from the checkout, with every block's sha256
 * checked against the committed `lessonSha256` (a drifted lesson throws:
 * re-record). `missing` names the first block whose file is absent.
 */
export function loadProgram(source: ProgramSource, root = contentRoot()): LoadedProgram {
  const texts = new Map<BlockRef, string>()
  for (const part of source) {
    if (!('block' in part)) continue
    const text = readBlock(part.block, root)
    if (text === null) return { ok: false, missing: refLabel(part.block) }
    const hash = sha256(text)
    if (hash !== part.lessonSha256)
      throw new Error(`${refLabel(part.block)} changed (sha256 ${hash}, committed ${part.lessonSha256}): re-record the program`)
    texts.set(part.block, text)
  }
  return { ok: true, text: composeProgram(source, (b) => texts.get(b)!) }
}

/** Why a test or recorder skipped a program: its block is not in this checkout. */
export const skipNote = (missing: string) =>
  `needs the premium block ${missing} from a local content checkout (src/content); absent here (CI has free samples only)`
