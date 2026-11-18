import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { validateDescriptor, validateStepLog } from '../../step-log/validate'
import { buildLog, cutChunk, lineProblems } from './build'
import { ssrDescriptor } from './descriptor'
import { ssrIntrospection } from './model'
import { streamLog, streamSpec, stringLog, stringSpec } from './presets/ssr'
import recording from './recordings/server-side-rendering.json'
import { hasChromium, recordSsr } from './truth/record'
import type { SsrRecording } from './truth/types'
import { recordingDiffs, streamClaims, stringClaims, wireClaims } from './truth/verify'

/**
 * The ssr-stream truth test (spec P6). The app is the visual's own
 * (`truth/app.ts`), so nothing needs a content checkout: with Playwright's
 * Chromium installed the run is recorded afresh (React 19 on Node 24, the
 * page in Chromium) and must equal the committed recording, HTML and orders
 * exactly, times within a tolerance (60 ms on the wire, 250 ms on screen; the claims
 * below hold the orders). A browser run on a loaded machine can still miss a
 * timer, so the fresh run gets one retry. Everywhere: the register's claims on
 * the committed recording, every drawn step rebuilt from it, and lies that
 * must fail.
 */

const rec = recording as unknown as SsrRecording
const clone = (): SsrRecording => JSON.parse(JSON.stringify(rec))

describe('ssr-stream recording', () => {
  it('the app as run is the committed one (sha256 of app.ts and client.ts)', () => {
    const text = ['app.ts', 'client.ts'].map((f) => fs.readFileSync(path.join(__dirname, 'truth', f), 'utf8')).join('\n')
    expect(createHash('sha256').update(text).digest('hex')).toBe(rec.sha256)
    expect(rec.react).toMatch(/^19\./)
  })

  it.skipIf(!hasChromium())('a fresh run (React 19 on Node 24, the page in Chromium) equals the committed recording', () => {
    const { runtime, ...fresh } = recordSsr()
    expect(runtime).toMatch(/^node@24\./)
    expect(fresh.browser).toMatch(/^chromium@/)
    expect(recordingDiffs(rec, fresh)).toEqual([])
    // The drawing from the fresh run is the committed drawing (times aside).
    const strip = (log: typeof streamLog) => log.steps.map((s) => ({ ...s, event: '', state: { ...s.state, at: '', chunks: s.state.chunks.length } }))
    expect(strip(buildLog({ ...streamSpec, recording: fresh }))).toEqual(strip(streamLog))
    expect(strip(buildLog({ ...stringSpec, recording: fresh }))).toEqual(strip(stringLog))
  }, { timeout: 180_000, retry: 1 })
})

describe('two-boundary-stream: the register on the recorded run', () => {
  it('shell at once with B:0 and B:1 placeholders; Reviews (S:1) then Product (S:0), each with its $RC', () => {
    expect(streamClaims(rec)).toEqual([])
  })
  it('both slots fill in one reveal, after Product arrived: React 19 batches reveals (the register expected Reviews first)', () => {
    const reveal = rec.stream.screen.find((x) => x.product === 'content')!
    expect(reveal.reviews).toBe('content')
    expect(reveal.ms).toBeGreaterThanOrEqual(rec.stream.wire[2].ms)
    // React 19's reveal script: $RC queues into $RB, $RV swaps the batch.
    expect(rec.stream.wire[1].html).toContain('$RB=[]')
    expect(rec.stream.wire[1].html).toContain('$RV=function')
  })
  it('a click on Reviews mid-hydration: Reviews hydrates first, the handler runs once, then Product; untouched, one pass', () => {
    expect(rec.stream.hydration.click.commits).toEqual([['reviews'], ['product']])
    expect(rec.stream.hydration.idle.commits).toEqual([['product', 'reviews']])
  })
  it('the checkpoints are the recorded answers', () => {
    const [fill, click] = streamLog.checkpoints
    expect(fill.answer).toBe('both')
    expect(streamLog.steps[fill.beforeStep].state.slots.reviews).toEqual({ view: 'fallback', badge: 'hidden' })
    expect(click.answer).toBe('first')
    const reveal = streamLog.steps[click.beforeStep].state
    expect([reveal.slots.reviews.badge, reveal.slots.product.badge, reveal.output.length]).toEqual(['interactive', 'hydrating', 1])
  })
})

describe('renderToString-contrast: the register on the recorded run', () => {
  it('one write after the slowest fetch, no markers; everything paints at once; one hydration pass, the click after it', () => {
    expect(stringClaims(rec)).toEqual([])
    expect(stringLog.checkpoints[0].answer).toBe('120')
    expect(stringLog.steps[1].state.chunks[0].ms).toBe(rec.string.wire[0].ms)
  })
})

describe('ssr-stream drawing', () => {
  it('every wire line is cut from its write, every marker has a line', () => {
    expect(wireClaims(rec)).toEqual([])
  })
  it('every preset is its recording, rebuilt, and passes the authoring lint', () => {
    expect(buildLog(streamSpec)).toEqual(streamLog)
    expect(buildLog(stringSpec)).toEqual(stringLog)
    expect(validateDescriptor(ssrDescriptor)).toEqual([])
    for (const log of [streamLog, stringLog]) expect(validateStepLog(log, ssrIntrospection)).toEqual([])
  })
  it('wire lines fit a 320 px phone (31 columns) and never carry lesson text', () => {
    for (const log of [streamLog, stringLog]) for (const l of log.steps[log.steps.length - 1].state.wire) expect([...l.text].length).toBeLessThanOrEqual(31)
  })
})

describe('lies fail', () => {
  it('a recording where Reviews fills alone first', () => {
    const r = clone()
    r.stream.screen.splice(2, 0, { ms: 200, product: 'fallback', reviews: 'content' })
    expect(streamClaims(r).join()).toMatch(/one slot filled alone/)
  })
  it('a click handled twice, or lost', () => {
    const r = clone()
    r.stream.hydration.click.events.push({ e: 'click', name: 'reviews' })
    expect(streamClaims(r).join()).toMatch(/ran 2 times/)
    const l = clone()
    l.stream.hydration.click.events = l.stream.hydration.click.events.filter((x) => x.e !== 'click')
    expect(streamClaims(l).join()).toMatch(/ran 0 times/)
  })
  it('Product hydrating first despite the click', () => {
    const r = clone()
    r.stream.hydration.click.commits = [['product'], ['reviews']]
    expect(streamClaims(r).join()).toMatch(/commits/)
  })
  it('segments in document order, or an invented marker', () => {
    const r = clone()
    ;[r.stream.wire[1], r.stream.wire[2]] = [r.stream.wire[2], r.stream.wire[1]]
    expect(streamClaims(r).join()).toMatch(/not reviews then product/)
    const line = cutChunk(rec.stream.wire[0].html, 0)[1]
    expect(lineProblems({ ...line, text: '<div data-suspense-id="0">', pieces: ['<div data-suspense-id="0">'] }, rec.stream.wire[0].html)).not.toEqual([])
  })
  it('a renderToString page that streams, or leaves before the slowest fetch', () => {
    const r = clone()
    r.string.wire[0] = { ms: 80, html: `<!--$?-->${r.string.wire[0].html}` }
    const errs = stringClaims(r).join()
    expect(errs).toMatch(/before the slowest fetch/)
    expect(errs).toMatch(/streaming markers/)
  })
  it('a fresh run that differs from the committed one', () => {
    const r = clone()
    r.stream.wire[1].ms += 100
    r.stream.hydration.idle.commits = [['product'], ['reviews']]
    expect(recordingDiffs(rec, r).length).toBe(2)
  })
})
