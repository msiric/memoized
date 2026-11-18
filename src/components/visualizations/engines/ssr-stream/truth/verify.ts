/**
 * The ssr-stream claims, checked against a recording (spec P6). Pure: the
 * truth test runs it on the committed recording, on a fresh one, and on
 * tampered copies that must fail.
 */
import { cutChunk, lineProblems } from '../build'
import type { Scenario, SsrRecording } from './types'

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** The streaming run's claims (the register's verification and what the visual draws). */
export function streamClaims(rec: SsrRecording): string[] {
  const e: string[] = []
  const s = rec.stream
  const [shell, ...rest] = s.wire
  if (!shell || shell.ms > 20) e.push(`the shell is not flushed at once (${shell?.ms} ms)`)
  for (const m of ['<header>Shop</header>', '<!--$?--><template id="B:0"></template><p>Loading product</p>', '<!--$?--><template id="B:1"></template><p>Loading reviews</p>'])
    if (!shell?.html.includes(m)) e.push(`the shell lacks ${m}`)
  const segOf = (html: string) => html.match(/<div hidden id="(S:\d+)"><section id="(\w+)">/)
  const segs = rest.map((c) => ({ ms: c.ms, seg: segOf(c.html), rc: c.html.match(/\$RC\("(B:\d+)","(S:\d+)"\)/) }))
  if (!same(segs.map((x) => x.seg?.[2]), ['reviews', 'product'])) e.push(`segments arrive as ${segs.map((x) => x.seg?.[2])}, not reviews then product`)
  if (!same(segs.map((x) => x.rc?.slice(1)), [['B:1', 'S:1'], ['B:0', 'S:0']])) e.push(`the $RC calls are ${segs.map((x) => x.rc?.[0])}`)
  for (const [x, want] of [[segs[0], 80], [segs[1], 120]] as const) if (!x || Math.abs(x.ms - want) > 30) e.push(`a segment at ${x?.ms} ms, not about ${want}`)
  // The reveal: both slots change in one screen entry, after the last segment arrived (React 19's batched reveal).
  const views = s.screen.map((x) => `${x.product},${x.reviews}`)
  if (views.includes('content,fallback') || views.includes('fallback,content')) e.push('one slot filled alone')
  const reveal = s.screen.find((x) => x.product === 'content' && x.reviews === 'content')
  if (!reveal) e.push('the slots never filled')
  else if (reveal.ms < (segs[1]?.ms ?? 0)) e.push(`the reveal (${reveal.ms} ms) is before Product's segment`)
  e.push(...hydrationClaims(s, 'stream'))
  return e
}

export function stringClaims(rec: SsrRecording): string[] {
  const e: string[] = []
  const s = rec.string
  if (s.wire.length !== 1) e.push(`renderToString wrote ${s.wire.length} times, not once`)
  const w = s.wire[0]
  if (!w || w.ms < 110) e.push(`the page left at ${w?.ms} ms, before the slowest fetch`)
  if (w && /<!--\$|<template|\$RC/.test(w.html)) e.push('the page carries streaming markers')
  const views = s.screen.map((x) => `${x.product},${x.reviews}`)
  if (!same(views, ['none,none', 'content,content'])) e.push(`the screen went ${views.join(' -> ')}`)
  e.push(...hydrationClaims(s, 'string'))
  return e
}

function hydrationClaims(s: Scenario, mode: 'stream' | 'string'): string[] {
  const e: string[] = []
  const { idle, click } = s.hydration
  if (!same(idle.commits, [['product', 'reviews']])) e.push(`${mode}: untouched, hydration commits ${JSON.stringify(idle.commits)}`)
  if (idle.events.some((x) => x.e === 'click')) e.push(`${mode}: a click ran without one`)
  const clicks = click.events.filter((x) => x.e === 'click')
  if (clicks.length !== 1) e.push(`${mode}: the handler ran ${clicks.length} times, not once`)
  const order = click.events.map((x) => (x.e === 'hydrate-start' ? 'start' : x.e === 'press' ? 'press' : `${x.e}:${x.name}`))
  const want =
    mode === 'stream'
      ? ['start', 'press', 'hydrated:reviews', 'click:reviews', 'hydrated:product']
      : ['start', 'hydrated:product', 'hydrated:reviews', 'click:reviews']
  if (!same(order, want)) e.push(`${mode}: with a click, ${order.join(', ')}`)
  const commits = mode === 'stream' ? [['reviews'], ['product']] : [['product', 'reviews']]
  if (!same(click.commits, commits)) e.push(`${mode}: with a click, commits ${JSON.stringify(click.commits)}`)
  return e
}

/** Every wire line is cut from its write, and every protocol marker has a line. */
export function wireClaims(rec: SsrRecording): string[] {
  const e: string[] = []
  for (const mode of ['stream', 'string'] as const)
    rec[mode].wire.forEach((c, k) => {
      const lines = cutChunk(c.html, k)
      for (const l of lines) e.push(...lineProblems(l, c.html))
      for (const m of c.html.match(/<template id="B:\d+">|<div hidden id="S:\d+">|\$RC\("B:\d+","S:\d+"\)/g) ?? [])
        if (!lines.some((l) => l.text.includes(m))) e.push(`${mode} write ${k}: ${m} has no wire line`)
    })
  return e
}

/** A fresh recording against the committed one: the HTML and orders exactly, times within a tolerance. */
export function recordingDiffs(committed: SsrRecording, fresh: SsrRecording): string[] {
  const e: string[] = []
  for (const k of ['generator', 'react', 'sha256', 'busyMs'] as const) if (committed[k] !== fresh[k]) e.push(`${k}: committed ${committed[k]}, fresh ${fresh[k]}`)
  for (const mode of ['stream', 'string'] as const) {
    const a = committed[mode]
    const b = fresh[mode]
    if (!same(a.wire.map((c) => c.html), b.wire.map((c) => c.html))) e.push(`${mode}: the writes differ`)
    a.wire.forEach((c, i) => b.wire[i] && Math.abs(c.ms - b.wire[i].ms) > 60 && e.push(`${mode} write ${i}: ${c.ms} ms vs ${b.wire[i].ms} ms`))
    const views = (s: Scenario) => s.screen.map((x) => `${x.product},${x.reviews}`)
    if (!same(views(a), views(b))) e.push(`${mode}: the screen went ${views(b).join(' -> ')}, committed ${views(a).join(' -> ')}`)
    a.screen.forEach((x, i) => b.screen[i] && Math.abs(x.ms - b.screen[i].ms) > 250 && e.push(`${mode} screen ${i}: ${x.ms} ms vs ${b.screen[i].ms} ms`))
    if (!same(a.hydration, b.hydration)) e.push(`${mode}: hydration ${JSON.stringify(b.hydration)} vs committed ${JSON.stringify(a.hydration)}`)
  }
  return e
}
