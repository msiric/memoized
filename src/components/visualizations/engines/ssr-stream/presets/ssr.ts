import type { Checkpoint, Step } from '../../../step-log/types'
import { CLICK_TEXT, buildLog, type PresetSpec, type StepWords } from '../build'
import { SLOT_TITLE, type SSRState, type Slot } from '../model'
import recording from '../recordings/server-side-rendering.json'
import type { SsrRecording } from '../truth/types'

/**
 * Server-Side Rendering (R4 `two-boundary-stream`, `renderToString-contrast`):
 * the visual's own app (Header, Product behind Suspense with data at 120
 * ms, Reviews behind Suspense with data at 80 ms) through React 19's real
 * `renderToPipeableStream`, and the same page through `renderToString`
 * after both fetches. Every write, screen change and hydration order is
 * recorded (`truth/run.ts`); these presets add words and checkpoints only.
 *
 * What the run shows, against the register's assumption: Reviews' HTML is
 * on the wire first, but React 19 does not reveal it at once. `$RC` queues
 * the swap and `$RV` runs it about 300 ms after the shell painted (`$RT`),
 * so Product's HTML, arriving 40 ms later, joins the same reveal: both
 * slots fill together.
 */

const rec = recording as unknown as SsrRecording

const names = (s: readonly Slot[]) => s.map((x) => SLOT_TITLE[x]).join(' and ')
/** "Reviews'", "Product's". */
const poss = (s: Slot) => (SLOT_TITLE[s].endsWith('s') ? `${SLOT_TITLE[s]}'` : `${SLOT_TITLE[s]}'s`)

const START: StepWords = {
  event: 'Request sent',
  why: 'Nothing is on the wire yet: the server must render first.',
  narration: 'The request is sent. The wire is empty and the screen is blank.',
}

export const streamSpec: PresetSpec = {
  id: 'ssr-stream/two-boundary-stream',
  mode: 'stream',
  recording: rec,
  start: START,
  chunk: ({ ms, slot, last }) => {
    if (!slot)
      return {
        event: `${ms} ms: the shell flushes`,
        why: 'Header renders now; each boundary sends its fallback in a B: placeholder, so the page paints before any data.',
        narration: 'The shell arrives: Header and two fallbacks, each in a B: placeholder. The response stays open.',
      }
    return {
      event: `${ms} ms: ${poss(slot)} HTML`,
      why: last
        ? `Hidden in an S: div again; $RC queues it with ${slot === 'product' ? 'Reviews' : 'Product'}, then the response ends.`
        : `It is hidden in an S: div, and $RC only queues the swap, so the fallback stays.`,
      narration: `${poss(slot)} HTML arrives in a hidden S: div with an $RC call.${last ? ' The response ends.' : ''}`,
    }
  },
  screen: ({ ms, changed }) => ({
    event: `${ms} ms: ${changed.length > 1 ? 'both fill at once' : `${names(changed)} fills`}`,
    why: 'React 19 batches reveals: $RV swaps every queued boundary about 300 ms after the shell painted.',
    narration: `${names(changed)} replace their fallbacks in one swap. They are static HTML: nothing is hydrated yet.`,
  }),
  js: {
    event: 'Hydration starts',
    why: 'Painted is not interactive: until a boundary hydrates, its button has no handler.',
    narration: 'The client bundle runs hydrateRoot. Both boundaries are still static HTML. You click Helpful.',
  },
  commit: ({ slots, clicked }) =>
    clicked
      ? {
          event: `${names(slots)} hydrates first`,
          why: 'The press landed on an unhydrated boundary, so React hydrated it ahead of Product; then the click ran once.',
          narration: `${names(slots)} hydrates before Product, and the click runs once: Helpful clicked.`,
        }
      : {
          event: `${names(slots)} hydrates`,
          why: 'Only then: the rest hydrates in order behind the clicked boundary.',
          narration: `${names(slots)} hydrates last. Every boundary is interactive.`,
        },
  click: { event: 'The click runs', why: 'It waited for hydration.', narration: 'The click runs.' },
  checkpoints: (steps): Checkpoint[] => [
    {
      beforeStep: 2,
      prompt: 'Which slot fills first?',
      choices: [
        { id: 'reviews', label: 'Reviews' },
        { id: 'both', label: 'Both at once' },
      ],
      answer: 'both',
      feedback: {
        correct: "Reviews' HTML is first, but it waits for Product's.",
        byChoice: {
          reviews: 'Its HTML is first, but React 19 reveals both together.',
        },
      },
      recap: { right: 'Both filled at once', wrongLead: 'Both filled at once, not {pick}' },
    },
    {
      beforeStep: steps.findIndex((s) => s.state.output.length > 0),
      prompt: 'You click Helpful now. What happens?',
      choices: [
        { id: 'lost', label: "It's lost" },
        { id: 'first', label: 'Reviews first', value: CLICK_TEXT },
      ],
      answer: 'first',
      feedback: {
        correct: 'Reviews hydrates first; then the click runs once.',
        byChoice: {
          lost: 'It is not lost: Reviews hydrates first, then it runs.',
        },
      },
      recap: { right: 'Reviews hydrated first', wrongLead: 'the click ran after Reviews hydrated', wrong: 'The click was kept: Reviews hydrated first.' },
    },
  ],
}

export const stringSpec: PresetSpec = {
  id: 'ssr-stream/renderToString-contrast',
  mode: 'string',
  recording: rec,
  start: START,
  chunk: ({ ms }) => ({
    event: `${ms} ms: the whole page`,
    why: 'renderToString cannot wait for data, so both fetches finish first: the slowest decides.',
    narration: 'One write carries the whole page, then the response ends. No placeholders, no S: divs.',
  }),
  screen: ({ ms }) => ({
    event: `${ms} ms: everything paints`,
    why: 'Nothing painted before: there was no shell to send while the server waited.',
    narration: 'Header, Product and Reviews paint together, as static HTML.',
  }),
  js: {
    event: 'Hydration starts',
    why: 'Without Suspense boundaries the tree hydrates as one unit, so nothing works until all of it does.',
    narration: 'The client bundle runs hydrateRoot. You click Helpful.',
  },
  commit: ({ slots }) => ({
    event: 'One hydration pass',
    why: `${names(slots)} commit together: one tree, no boundary for React to hydrate first.`,
    narration: `${names(slots)} hydrate in one commit.`,
  }),
  click: {
    event: 'Now the click runs',
    why: 'No boundary could hydrate ahead of the rest, so the click ran only after the whole tree had hydrated.',
    narration: 'The click runs once: Helpful clicked.',
  },
  checkpoints: (): Checkpoint[] => [
    {
      beforeStep: 1,
      prompt: "When does Reviews' HTML leave?",
      choices: [
        { id: '80', label: 'At 80 ms' },
        { id: '120', label: 'At 120 ms' },
      ],
      answer: '120',
      feedback: {
        correct: 'renderToString waits for Product’s 120 ms.',
        byChoice: { '80': 'Reviews is ready, but nothing leaves before Product.' },
      },
      recap: { right: 'It left at 120 ms', wrongLead: 'It left at 120 ms, not 80' },
    },
  ],
}

export const streamLog = buildLog(streamSpec)
export const stringLog = buildLog(stringSpec)

/** The step a checkpoint reveals, by kind (tests). */
export const outputStep = (steps: readonly Step<SSRState>[]) => steps.findIndex((s) => s.state.output.length > 0)
