/**
 * What the ssr-stream recorder writes (values only). React-free and
 * Node-free: the builder, the recorder and the truth test share it.
 */
import type { Slot } from './app'

export type { Slot }

/** One write of the server's response, ms after the request (rounded to 10). */
export type WireChunk = { ms: number; html: string }

/** What a slot shows in the browser: nothing yet, its fallback, or its content. */
export type SlotView = 'none' | 'fallback' | 'content'

/** A change of what the screen shows, ms after navigation (rounded to 10). */
export type ScreenEntry = { ms: number } & Record<Slot, SlotView>

/** `press`: the click's pointerdown reached the page (a native capture listener, before React saw it). */
export type HydrationEvent = { e: 'hydrate-start' } | { e: 'press' } | { e: 'hydrated'; name: Slot } | { e: 'click'; name: Slot }

export type HydrationRun = {
  /** Whether a trusted click on Reviews' button was sent just after hydration began. */
  click: boolean
  events: HydrationEvent[]
  /** The boundaries whose effects ran in one commit, in commit order. */
  commits: Slot[][]
}

export type Scenario = {
  wire: WireChunk[]
  screen: ScreenEntry[]
  hydration: { idle: HydrationRun; click: HydrationRun }
}

export type SsrRecording = {
  generator: string
  /** React's version (react-dom/server and react-dom/client). */
  react: string
  browser: string
  /** sha256 of the visual's app and client entry (`app.ts`, `client.ts`), as run. */
  sha256: string
  /** The client render cost per boundary (the busy loop), ms. */
  busyMs: number
  /** `renderToPipeableStream` with two Suspense boundaries. */
  stream: Scenario
  /** `renderToString` after both fetches, no boundaries. */
  string: Scenario
}

export const SSR_GENERATOR = 'react-stream-chromium@1'
