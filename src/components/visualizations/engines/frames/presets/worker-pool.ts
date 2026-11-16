import type { DisplayRow } from '../../../step-log/lesson-source'
import type { Checkpoint } from '../../../step-log/types'
import { assemble, fmt, Walk, type Draft, type FramesSpec } from '../build'
import { statusId, varId, type FChip, type FLane, type FState } from '../model'
import type { FramesRecording, Pause } from '../program'
import { BATCHES_CODE, batchesProgram, failureProgram, refillProgram } from '../programs/async-await'
import recordings from '../recordings/async-await.json'

/**
 * Async/Await, mapLimit (R4 `refill-on-settle`, `fixed-batches-contrast`,
 * `failure-stops-claims`): one lane per worker (or, for the contrast, per
 * batch position) holding the operation it has in flight, the shared cursor
 * `next` over them, and the results array as a lane of slots by index. A step
 * is one event: a worker claims an index and starts its operation, or an
 * operation settles (the harness releases it) and its result is written to
 * its own slot.
 *
 * Which worker resumes after a release is the one awaiting that index: a
 * resumed async frame no longer reports the argument that numbered it, so
 * the builder follows the index it claimed (an awaited operation resumes
 * only the frame that awaits it). The truth test checks every claim and
 * write against the recording.
 */

const rec = recordings as unknown as Record<string, FramesRecording>
const ITEMS = ['a', 'b', 'c', 'd']

/** A results slot: its index and value (the strings unquoted, so four fit one row on a phone), `_` while empty. */
const slot = (i: number, v: unknown) => ({ id: `slot-${i}`, label: `${i}: ${v === undefined || (v && typeof v === 'object' && '$u' in v) ? '_' : String(v)}` })
const op = (i: number, label = ITEMS[i]) => ({ id: `op-${i}`, label: `${i}: ${label}` })

export const POOL_DISPLAY: DisplayRow[] = [
  { src: 1, wrap: [0, 0, 30] },
  { src: 1, wrap: [2, 31, 48] },
  { src: 2, wrap: [2, 0, 28] },
  { src: 2, wrap: [4, 29, 47] },
  { src: 2, wrap: [4, 48, 61] },
  { src: 3, wrap: [4, 0, 29] },
  { src: 3, wrap: [6, 30, 55] },
  { src: 4, wrap: [2, 0, 1] },
  { src: 5, wrap: [2, 0, 32] },
  { src: 5, wrap: [4, 33, 48] },
  { src: 6, wrap: [4, 0, 27] },
  { src: 6, wrap: [6, 28, 51] },
  { src: 6, wrap: [6, 52, 61] },
  { src: 7, wrap: [2, 0, 1] },
  { src: 8, wrap: [2, 0, 15] },
  { src: 8, wrap: [4, 16, 39] },
  { src: 9, wrap: [2, 0, 12] },
  { src: 10, wrap: [2, 0, 19] },
  { src: 11, text: '' },
  { src: 12, wrap: [2, 0, 25] },
  { src: 13, wrap: [4, 0, 18] },
  { src: 13, wrap: [6, 19, 41] },
  { src: 14, wrap: [6, 0, 20] },
  { src: 15, wrap: [6, 0, 5] },
  { src: 16, wrap: [8, 0, 22] },
  { src: 16, wrap: [10, 23, 44] },
  { src: 16, wrap: [10, 45, 51] },
  { src: 17, wrap: [6, 0, 17] },
  { src: 18, wrap: [8, 0, 14] },
  { src: 19, wrap: [8, 0, 11] },
  { src: 20, wrap: [6, 0, 1] },
  { src: 21, wrap: [4, 0, 1] },
  { src: 22, wrap: [2, 0, 1] },
  { src: 23, text: '' },
  { src: 24, wrap: [2, 0, 30] },
  { src: 24, wrap: [4, 31, 54] },
  { src: 24, wrap: [4, 55, 80] },
  { src: 25, wrap: [2, 0, 14] },
  { src: 26, wrap: [0, 0, 1] },
]

type Worker = { status: string; op?: number }

/** One step per event of a mapLimit run, every value read from its pauses (see the module comment). */
function poolDrafts(r: FramesRecording, failure: boolean): Draft[] {
  const w = new Walk(r.pauses)
  const workers: Worker[] = [{ status: 'not started' }, { status: 'not started' }]
  let results: unknown[] = ITEMS.map(() => undefined)
  let next = 0
  let stopped = false
  let printed = 0
  const st = (): FState => ({
    vars: [
      { id: varId('next'), name: 'next', value: String(next) },
      ...(failure ? [{ id: varId('stopped'), name: 'stopped', value: String(stopped) }] : []),
    ],
    lanes: [
      ...workers.map(
        (wk, k): FLane => ({
          id: `worker-${k}`,
          label: `worker ${k}`,
          kind: 'task',
          chips: [{ id: statusId(`worker-${k}`), label: wk.status }, ...(wk.op !== undefined ? [op(wk.op)] : [])],
        }),
      ),
      { id: 'results', label: 'results', kind: 'micro', chips: results.map((v, i): FChip => slot(i, v)) },
    ],
    output: r.observed.slice(0, printed),
  })
  const sync = (p: Pause) => {
    results = (p.vars.results as unknown[]) ?? results
    next = (p.vars.next as number) ?? next
    stopped = (p.vars.stopped as boolean) ?? stopped
  }
  const drafts: Draft[] = []
  sync(w.peek()!)
  drafts.push({
    state: st(),
    focus: [],
    event: 'mapLimit, limit 2',
    why: 'Array.from calls worker twice, so two loops share one cursor and one results array.',
    narration: 'Two workers, next is 0, results has four empty slots.',
  })
  const ownerOf = new Map<number, number>()
  let current: number | null = null
  while (!w.done) {
    const p = w.take(w.peek()!.probe)
    if (p.probe === 'check' || p.probe === 'claim') {
      const id = p.stack[0]?.vars?.worker
      if (typeof id === 'number') current = id
      if (p.probe === 'check') {
        sync(p)
        // A pass that will not claim: the loop condition fails, so this worker exits.
        if (stopped || next >= ITEMS.length) {
          const k = current!
          const written = workers[k].op
          workers[k] = { status: 'exited' }
          const i = written
          drafts.push(
            i !== undefined
              ? {
                  state: st(),
                  src: 16,
                  focus: [`slot-${i}`, statusId(`worker-${k}`)],
                  event: `worker ${k} exits`,
                  why: stopped
                    ? `The result still lands in slot ${i}, but stopped is true, so the loop ends.`
                    : `The result goes to slot ${i}; next is ${next}, past the last index, so the loop ends.`,
                  narration: `results[${i}] is ${fmt(results[i])}. worker ${k} has exited.`,
                }
              : {
                  state: st(),
                  src: 13,
                  focus: [statusId(`worker-${k}`)],
                  event: `worker ${k} exits`,
                  why: 'The loop condition fails, so the worker returns.',
                  narration: `worker ${k} has exited.`,
                },
          )
        } else if (workers[current!].op !== undefined) {
          // Resumed after its operation settled: the write, before the next claim.
          const k = current!
          const i = workers[k].op!
          workers[k] = { status: 'running' }
          drafts.push({
            state: st(),
            src: 16,
            focus: [`slot-${i}`, statusId(`worker-${k}`)],
            event: `${ITEMS[i]} lands in [${i}]`,
            why: `worker ${k} resumes and writes to the index it claimed, not to the end, so order is kept.`,
            narration: `results[${i}] is ${fmt(results[i])}. worker ${k} is free.`,
          })
        }
      }
      continue
    }
    if (p.probe === 'call') {
      sync(p)
      const i = p.vars.index as number
      const k = current!
      ownerOf.set(i, k)
      workers[k] = { status: 'awaiting', op: i }
      drafts.push({
        state: st(),
        src: [14, 16],
        focus: [varId('next'), `op-${i}`],
        event: `worker ${k} claims ${i}`,
        why: `It reads next (${i}) and adds 1 before its first await, so no other worker can claim ${i}.`,
        narration: `worker ${k} awaits ${ITEMS[i]} (index ${i}); next is ${next}.`,
      })
      continue
    }
    if (p.probe === 'release') {
      // The harness releases index i: the frame awaiting it resumes next.
      current = ownerOf.get(p.vars.i as number)!
      if (r.observed.length && p.out > printed) {
        printed = p.out
        drafts.push({
          state: st(),
          src: 24,
          focus: ['output'],
          event: 'mapLimit rejects',
          why: 'Promise.all rejects as soon as one worker throws, so mapLimit rejects while worker 0 still runs.',
          narration: `Printed: ${r.observed[printed - 1]}. worker 0 is still awaiting ${ITEMS[workers[0].op ?? 0]}.`,
        })
      }
      continue
    }
    if (p.probe === 'catch') {
      const k = current!
      const i = p.vars.index as number
      // stopped is set on the line this pause stands before; the next pause that reads it sees true.
      stopped = true
      workers[k] = { status: 'threw' }
      drafts.push({
        state: st(),
        src: [18, 19],
        focus: [varId('stopped'), statusId(`worker-${k}`)],
        event: `${ITEMS[i]} rejects`,
        why: `worker ${k} catches it, sets stopped so no worker claims again, and rethrows, ending its loop.`,
        narration: `worker ${k} threw; stopped is true; slot ${i} stays empty.`,
      })
      continue
    }
    if (p.probe === 'return') {
      sync(p)
      continue
    }
    if (p.probe === 'exit') {
      if (p.out > printed) {
        printed = p.out
        drafts.push({
          state: st(),
          src: 25,
          focus: ['output'],
          event: 'Return results',
          why: 'Promise.all waited for both loops, so results is complete and in input order.',
          narration: `Printed: ${r.observed[printed - 1]}.`,
        })
      }
    }
  }
  return drafts
}

export const refillSpec: FramesSpec = {
  id: 'frames/refill-on-settle',
  program: refillProgram,
  recording: rec[refillProgram.id],
  display: POOL_DISPLAY,
  checkpoints: (steps): Checkpoint[] => {
    const settle = steps.findIndex((s) => s.event.startsWith('b lands'))
    return [
      {
        beforeStep: settle + 1,
        // The register's checkpoint, after index 1 settles (B is already in slot 1): what starts now?
        prompt: 'b settled. When does c start?',
        choices: [
          { id: 'now', label: 'Now' },
          { id: 'later', label: 'After a' },
        ],
        answer: 'now',
        feedback: {
          correct: 'The freed worker loops and claims the next index at once.',
          byChoice: { later: 'Workers do not wait for a batch: the free one claims index 2 now.' },
        },
        recap: { right: 'c started {answer}', wrong: 'c started at once: the free worker claims the next index.' },
      },
    ]
  },
}

export const failureSpec: FramesSpec = {
  id: 'frames/failure-stops-claims',
  program: failureProgram,
  recording: rec[failureProgram.id],
  display: POOL_DISPLAY,
  checkpoints: (steps): Checkpoint[] => [
    {
      beforeStep: steps.findIndex((s) => s.event.startsWith('worker 0 exits')),
      prompt: 'a settles. Does worker 0 claim c?',
      choices: [
        { id: 'no', label: 'No' },
        { id: 'yes', label: 'Yes' },
      ],
      answer: 'no',
      feedback: {
        correct: 'stopped is true, so its loop ends after writing results[0].',
        byChoice: { yes: 'worker 1 set stopped, and the loop checks it before every claim.' },
      },
      recap: { right: 'No claim after the failure', wrongLead: 'No claim after the failure' },
    },
  ],
}

// ---------------------------------------------------------------------------
// The contrast: fixed batches (the visual's own code, committed as text)
// ---------------------------------------------------------------------------

export const BATCHES_DISPLAY: DisplayRow[] = BATCHES_CODE.map((text, i) => ({ src: i + 1, text }))

function batchesDrafts(r: FramesRecording): Draft[] {
  const w = new Walk(r.pauses)
  const slots: ({ i: number; settled: boolean } | null)[] = [null, null]
  let results: string[] = []
  let at: number | null = null
  let printed = 0
  const st = (): FState => ({
    vars: [{ id: varId('i'), name: 'i', value: at === null ? '–' : String(at) }],
    lanes: [
      ...slots.map(
        (s, j): FLane => ({
          id: `slot-lane-${j}`,
          label: `batch[${j}]`,
          kind: 'task',
          chips: [{ id: statusId(`slot-lane-${j}`), label: s ? (s.settled ? 'settled' : 'awaiting') : 'empty' }, ...(s ? [op(s.i, s.settled ? fmt(ITEMS[s.i].toUpperCase()) : ITEMS[s.i])] : [])],
        }),
      ),
      { id: 'results', label: 'results', kind: 'micro', chips: results.map((v, i) => ({ id: `res-${i}`, label: `${i}: ${v}` })) },
    ],
    output: r.observed.slice(0, printed),
  })
  const drafts: Draft[] = [
    {
      state: st(),
      focus: [],
      event: 'mapBatches, size 2',
      why: 'This contrast awaits each batch with Promise.all before it starts the next one.',
      narration: 'No batch has started; results is empty.',
    },
  ]
  while (!w.done) {
    const p = w.take(w.peek()!.probe)
    if (p.probe === 'batch') {
      at = p.vars.i as number
      results = (p.vars.results as string[]) ?? results
      const a = w.take('start')
      const b = w.take('start')
      slots[0] = { i: a.vars.index as number, settled: false }
      slots[1] = { i: b.vars.index as number, settled: false }
      drafts.push({
        state: st(),
        src: [6, 10],
        focus: [`op-${slots[0].i}`, `op-${slots[1].i}`],
        event: `Batch ${ITEMS[slots[0].i]}, ${ITEMS[slots[1].i]} starts`,
        why: 'batch.map starts both operations, then the loop waits for Promise.all of the whole batch.',
        narration: `${ITEMS[slots[0].i]} and ${ITEMS[slots[1].i]} are in flight; i is ${at}.`,
      })
      continue
    }
    if (p.probe === 'release') {
      const i = p.vars.i as number
      const j = slots.findIndex((s) => s?.i === i)
      const other = slots[1 - j]
      if (other && !other.settled) {
        slots[j] = { i, settled: true }
        drafts.push({
          state: st(),
          src: [6, 10],
          focus: [`op-${i}`, statusId(`slot-lane-${j}`)],
          event: `${ITEMS[i]} done, slot idle`,
          why: `Promise.all still waits for ${ITEMS[other.i]}, so batch[${j}] sits idle and the next batch cannot start.`,
          narration: `${ITEMS[i]} is done but batch[${j}] waits for ${ITEMS[other.i]}.`,
        })
        continue
      }
      // The batch's last operation: Promise.all fulfils and the loop pushes both results.
      const push = w.to('push')
      results = [...results, ...(push.vars.done as string[])]
      slots[0] = slots[1] = null
      drafts.push({
        state: st(),
        src: 11,
        focus: [`res-${results.length - 2}`, `res-${results.length - 1}`],
        event: `push ${(push.vars.done as string[]).map(fmt).join(', ')}`,
        why: 'Only now has every operation of the batch settled, so Promise.all fulfils and the loop pushes both.',
        narration: `results is ${fmt(results)}.`,
      })
      continue
    }
    if (p.probe === 'exit' && p.out > printed) {
      printed = p.out
      drafts.push({
        state: st(),
        src: 13,
        focus: ['output'],
        event: 'Return results',
        why: 'The same release order took two full waits: c could not start until a settled.',
        narration: `Printed: ${r.observed[printed - 1]}.`,
      })
    }
  }
  return drafts
}

export const batchesSpec: FramesSpec = {
  id: 'frames/fixed-batches-contrast',
  program: batchesProgram,
  recording: rec[batchesProgram.id],
  display: BATCHES_DISPLAY,
  checkpoints: (steps): Checkpoint[] => [
    {
      beforeStep: steps.findIndex((s) => s.event.startsWith('b done')),
      prompt: 'b settles first. Does c start now?',
      choices: [
        { id: 'no', label: 'No' },
        { id: 'yes', label: 'Yes' },
      ],
      answer: 'no',
      feedback: {
        correct: 'A fixed batch waits for all of its operations, so batch[1] idles.',
        byChoice: { yes: 'Promise.all still waits for a, so nothing new starts.' },
      },
      recap: { right: 'c waited for a', wrongLead: 'c waited for a' },
    },
  ],
}

export const refillLog = assemble(refillSpec, poolDrafts(refillSpec.recording, false))
export const failureLog = assemble(failureSpec, poolDrafts(failureSpec.recording, true))
export const batchesLog = assemble(batchesSpec, batchesDrafts(batchesSpec.recording))

export const POOL_BUILDERS = {
  'refill-on-settle': (r: FramesRecording) => assemble({ ...refillSpec, recording: r }, poolDrafts(r, false)),
  'failure-stops-claims': (r: FramesRecording) => assemble({ ...failureSpec, recording: r }, poolDrafts(r, true)),
  'fixed-batches-contrast': (r: FramesRecording) => assemble({ ...batchesSpec, recording: r }, batchesDrafts(r)),
}
