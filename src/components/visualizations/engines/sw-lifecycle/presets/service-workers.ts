import type { Checkpoint, Step } from '../../../step-log/types'
import { buildLog, type PresetSpec, type StepWords } from '../build'
import type { SwState } from '../model'
import type { SwRecording } from '../programs/scenarios'
import recording from '../recordings/service-workers.json'

/**
 * Service Workers (R4 `update-and-reload`, `skipWaiting`,
 * `first-install-claim`): three recorded runs of the visual's own worker in
 * Chromium, one step per recorded snapshot. The words are the visual's;
 * every value they name (who controls a tab, which slot a worker is in, the
 * cache names) is read from the state the step draws, and the truth test
 * checks each sentence's claim against the recording.
 */

export const SW_RECORDING = recording as unknown as SwRecording

const w = (event: string, why: string, narration: string): StepWords => ({ event, why, narration })
const ctl = (s: SwState, t: 'A' | 'B') => s.tabs[t].controller ?? 'nothing'
const at = (names: readonly string[], as: string) => {
  const i = names.indexOf(as)
  if (i < 1) throw new Error(`sw-lifecycle: no step ${as}`)
  return i
}

const START = (s: SwState) =>
  w(
    `${ctl(s, 'A')} controls A and B`,
    `Both pages loaded after ${ctl(s, 'A')} activated, so it handles their requests; ${s.caches.join(', ')} holds its precache.`,
    `${ctl(s, 'A')} is active and controls tabs A and B. Cache Storage holds ${s.caches.join(', ')}.`,
  )

export const updateSpec: PresetSpec = {
  id: 'sw-lifecycle/update-and-reload',
  scenario: 'update-and-reload',
  recording: SW_RECORDING,
  words: {
    start: START,
    installing: (s) =>
      w(
        `Deploy: ${s.slots.installing[0].v} installs`,
        `The reload re-fetched the worker script and its bytes differ, so ${s.slots.installing[0].v} installs beside ${s.slots.active[0].v}, which still controls both tabs.`,
        `Tab B reloads and the browser fetches the new worker script. ${s.slots.installing[0].v} is installing.`,
      ),
    waiting: (s) =>
      w(
        `${s.slots.waiting[0].v} installed, waits`,
        `Its install filled ${s.caches[s.caches.length - 1]}, but ${s.slots.active[0].v} still controls open tabs, so ${s.slots.waiting[0].v} waits instead of activating.`,
        `${s.slots.waiting[0].v} is installed and waiting. ${s.slots.active[0].v} still controls both tabs.`,
      ),
    'reload-a': (s) =>
      w(
        `A reloads: still ${ctl(s, 'A')}`,
        `The old page stays alive until the new one arrives, so ${ctl(s, 'A')} never loses its client and keeps control.`,
        `Tab A reloaded and is controlled by ${ctl(s, 'A')}. ${s.slots.waiting[0].v} is still waiting.`,
      ),
    'close-a': (s) =>
      w(
        `A closes: ${s.slots.waiting[0].v} waits`,
        `Tab B still uses ${ctl(s, 'B')}, so ${ctl(s, 'B')} keeps a client and ${s.slots.waiting[0].v} cannot activate yet.`,
        `Tab A is closed. Tab B is controlled by ${ctl(s, 'B')}; ${s.slots.waiting[0].v} waits.`,
      ),
    'reload-b': (s) =>
      w(
        `B reloads: still ${ctl(s, 'B')}`,
        `Even the last tab's reload does not hand over: that page is never gone, so ${ctl(s, 'B')} keeps control.`,
        `Tab B, the only open tab, reloaded and is still controlled by ${ctl(s, 'B')}. ${s.slots.waiting[0].v} waits.`,
      ),
    'close-b': (s) =>
      w(
        `No tabs: ${s.slots.active[0].v} activates`,
        `No page uses ${s.redundant[0].v} any more, so ${s.redundant[0].v} becomes redundant and ${s.slots.active[0].v} starts activating.`,
        `Both tabs are closed. ${s.redundant[0].v} is redundant; ${s.slots.active[0].v} is activating.`,
      ),
    'reopen-a': (s) =>
      w(
        `New tab: ${ctl(s, 'A')} controls`,
        `${ctl(s, 'A')}'s activate deleted the old cache, so only ${s.caches.join(', ')} is left, and a page that loads now gets ${ctl(s, 'A')}.`,
        `Tab A opens and is controlled by ${ctl(s, 'A')}. Cache Storage holds ${s.caches.join(', ')}.`,
      ),
  },
  checkpoints: (_steps, names): Checkpoint[] => [
    {
      beforeStep: at(names, 'reload-a'),
      prompt: 'Reload tab A. Who controls it then?',
      choices: [
        { id: 'v1', label: 'v1' },
        { id: 'v2', label: 'v2' },
        { id: 'none', label: 'None' },
      ],
      answer: 'v1',
      feedback: {
        correct: 'A reload keeps the old page alive until the new one arrives, so v1 never loses its client.',
        byChoice: {
          v2: 'v2 is waiting: tab B uses v1, and a reload never frees tab A either, so v1 keeps control.',
          none: 'v1 is active and tab A is in its scope, so the reloaded page is controlled, by v1.',
        },
      },
      recap: { right: 'Tab A stayed with v1', wrongLead: 'Tab A stayed with v1, not {pick}' },
    },
  ],
}

export const skipWaitingSpec: PresetSpec = {
  id: 'sw-lifecycle/skipWaiting',
  scenario: 'skip-waiting',
  recording: SW_RECORDING,
  words: {
    start: START,
    installing: (s) =>
      w(
        `Deploy: ${s.slots.installing[0].v} installs`,
        `update() re-fetched the worker script, so ${s.slots.installing[0].v} installs while ${s.slots.active[0].v} still controls both tabs, as without skipWaiting.`,
        `${s.slots.installing[0].v} is installing. Its install handler calls skipWaiting().`,
      ),
    activating: (s) =>
      w(
        `Both tabs move to ${s.slots.active[0].v}`,
        `skipWaiting() let ${s.slots.active[0].v} activate over ${s.redundant[0].v}, so tabs A and B switch now and each fires controllerchange, with no reload.`,
        `${s.slots.active[0].v} is activating and controls tabs A and B. ${s.redundant[0].v} is redundant.`,
      ),
    activated: (s) =>
      w(
        `${s.slots.active[0].v} activated`,
        `activate finished its cleanup, so only ${s.caches.join(', ')} is left; the tabs had already switched at activation.`,
        `${s.slots.active[0].v} is activated. Cache Storage holds ${s.caches.join(', ')}.`,
      ),
  },
  checkpoints: (_steps, names): Checkpoint[] => [
    {
      beforeStep: at(names, 'activating'),
      prompt: 'v2 skips waiting. Who controls tab B?',
      choices: [
        { id: 'v1', label: 'v1' },
        { id: 'v2', label: 'v2' },
      ],
      answer: 'v2',
      feedback: {
        correct: 'At activation every tab v1 controlled switches to v2, and each fires controllerchange.',
        byChoice: { v1: 'skipWaiting reaches open tabs too: B switches to v2 at activation, with no reload.' },
      },
      recap: { right: 'Tab B moved to v2', wrongLead: 'Tab B moved to v2, not v1' },
    },
  ],
}

export const firstInstallSpec: PresetSpec = {
  id: 'sw-lifecycle/first-install-claim',
  scenario: 'first-install',
  recording: SW_RECORDING,
  words: {
    installing: (s) =>
      w(
        `${s.slots.installing[0].v} installs`,
        `Tab A loaded before any worker existed and register() started ${s.slots.installing[0].v}'s install, so A has no controller.`,
        `Tab A is open with no controller. ${s.slots.installing[0].v} is installing.`,
      ),
    activating: (s) =>
      w(
        `${s.slots.active[0].v} activates at once`,
        `No worker controls a page in scope, so ${s.slots.active[0].v} has nothing to wait for and goes straight to activating.`,
        `${s.slots.active[0].v} is activating. Tab A still has no controller.`,
      ),
    activated: (s) =>
      w(
        `A stays uncontrolled`,
        `A loaded before ${s.slots.active[0].v} was active, so it stays uncontrolled until it reloads, unless activate calls clients.claim().`,
        `${s.slots.active[0].v} is activated. Tab A is not controlled.`,
      ),
    'reload-a': (s) =>
      w(
        `A reloads under ${ctl(s, 'A')}`,
        `A fresh load finds ${ctl(s, 'A')} active, so the page is controlled. With clients.claim() in activate, A is taken at activation instead.`,
        `Tab A reloaded and is controlled by ${ctl(s, 'A')}.`,
      ),
  },
  checkpoints: (_steps, names): Checkpoint[] => [
    {
      beforeStep: at(names, 'activated'),
      prompt: 'v1 is active now. Who controls tab A?',
      choices: [
        { id: 'v1', label: 'v1' },
        { id: 'none', label: 'None' },
      ],
      answer: 'none',
      feedback: {
        correct: 'A loaded with no worker, so it stays uncontrolled until a reload or clients.claim().',
        byChoice: { v1: 'Not yet: A loaded with no worker and stays uncontrolled until a reload or clients.claim().' },
      },
      recap: { right: 'Tab A stayed uncontrolled', wrongLead: 'Tab A stayed uncontrolled, not v1' },
    },
  ],
}

export const updateLog = buildLog(updateSpec)
export const skipWaitingLog = buildLog(skipWaitingSpec)
export const firstInstallLog = buildLog(firstInstallSpec)

/** The checkpoint's answer as the reveal step draws it (the truth test checks every preset with it). */
export function revealed(step: Step<SwState>, tab: 'A' | 'B') {
  return step.state.tabs[tab].controller ?? 'none'
}
