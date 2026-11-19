import type { SwRecording, SwSnap } from '../programs/scenarios'

/**
 * The claims the visual and its captions make, checked against a recording
 * (pure: the truth test runs it on the committed recording, on a fresh one
 * where Chromium is installed, and on tampered copies that must fail). Each
 * claim is a lesson fact the register and the Service Workers lesson state:
 * a new worker waits while an old one controls an open tab, a reload (even of
 * the only tab) does not hand over, closing every tab activates the waiting
 * worker, skipWaiting moves open tabs at activation with controllerchange,
 * clients.claim adds nothing for tabs already controlled, and a first visit
 * stays uncontrolled until a reload or clients.claim.
 */
export function claimProblems(rec: SwRecording): string[] {
  const out: string[] = []
  const get = (scenario: string, as: string): SwSnap | null => {
    const s = rec.scenarios[scenario]?.find((x) => x.as === as)?.snap
    if (!s) out.push(`${scenario}: no ${as} snapshot`)
    return s ?? null
  }
  const expect = (ok: boolean, msg: string) => {
    if (!ok) out.push(msg)
  }
  const both = (s: SwSnap | null, v: string | null) => !!s && s.tabs.A.controller === v && s.tabs.B.controller === v

  // update-and-reload
  const start = get('update-and-reload', 'start')
  expect(both(start, 'v1') && start?.slots.active?.v === 'v1' && start.slots.active.state === 'activated', 'update: v1 does not control A and B at the start')
  const inst = get('update-and-reload', 'installing')
  expect(inst?.slots.installing?.v === 'v2' && both(inst, 'v1'), 'update: v2 is not installing beside v1 after the deploy and reload')
  const wait = get('update-and-reload', 'waiting')
  expect(wait?.slots.waiting?.v === 'v2' && wait.slots.active?.v === 'v1' && both(wait, 'v1'), 'update: v2 does not wait while v1 controls both tabs')
  expect(!!wait?.caches.includes('v2-static') && !!wait?.caches.includes('v1-static'), 'update: the waiting worker has not filled v2-static beside v1-static')
  const ra = get('update-and-reload', 'reload-a')
  expect(ra?.tabs.A.controller === 'v1' && ra.slots.waiting?.v === 'v2', 'update: a reload of tab A handed it to v2 (it must stay with v1)')
  const ca = get('update-and-reload', 'close-a')
  expect(!ca?.tabs.A.open && ca?.tabs.B.controller === 'v1' && ca.slots.waiting?.v === 'v2', 'update: closing A alone activated v2 while B used v1')
  const rb = get('update-and-reload', 'reload-b')
  expect(rb?.tabs.B.controller === 'v1' && rb.slots.waiting?.v === 'v2' && !rb.tabs.A.open, 'update: reloading the only open tab handed it to v2 (it must not)')
  const cb = get('update-and-reload', 'close-b')
  expect(!!cb && !cb.tabs.A.open && !cb.tabs.B.open && cb.slots.active?.v === 'v2' && !cb.slots.waiting && cb.redundant.includes('v1'), 'update: closing every tab did not activate v2 and retire v1')
  const re = get('update-and-reload', 'reopen-a')
  expect(re?.tabs.A.controller === 'v2' && re.slots.active?.state === 'activated' && JSON.stringify(re.caches) === '["v2-static"]', 'update: a new tab is not controlled by v2 with only v2-static left')

  // skipWaiting
  const sa = get('skip-waiting', 'activating')
  expect(
    both(sa, 'v2') && sa?.tabs.A.changes === 1 && sa.tabs.B.changes === 1 && sa.slots.active?.v === 'v2' && sa.slots.active.state === 'activating' && !sa.slots.waiting,
    'skipWaiting: the open tabs did not switch to v2 at activation, with one controllerchange each',
  )
  const sd = get('skip-waiting', 'activated')
  expect(both(sd, 'v2') && sd?.slots.active?.state === 'activated' && JSON.stringify(sd.caches) === '["v2-static"]', 'skipWaiting: v2 did not finish activating with only v2-static left')
  const plain = rec.scenarios['skip-waiting'] ?? []
  const claim = rec.scenarios['skip-waiting-claim'] ?? []
  for (const c of claim) {
    const p = plain.find((x) => x.as === c.as)
    if (p) expect(JSON.stringify(p.snap.tabs) === JSON.stringify(c.snap.tabs), `skipWaiting: clients.claim changed the tabs at ${c.as} (it adds nothing for tabs v1 controlled)`)
  }

  // First visit
  const fi = get('first-install', 'installing')
  expect(fi?.tabs.A.open === true && fi.tabs.A.controller === null && fi.slots.installing?.v === 'v1', 'first visit: the registering page is controlled while v1 installs')
  const fa = get('first-install', 'activating')
  expect(fa?.slots.active?.state === 'activating' && fa.tabs.A.controller === null, 'first visit: v1 does not go straight to activating, or controls A already')
  const fd = get('first-install', 'activated')
  expect(fd?.slots.active?.state === 'activated' && fd.tabs.A.controller === null && fd.tabs.A.changes === 0, 'first visit: without clients.claim, A is controlled after activation')
  const fr = get('first-install', 'reload-a')
  expect(fr?.tabs.A.controller === 'v1', 'first visit: A is not controlled after a reload')
  const fc = get('first-install-claim', 'claimed')
  expect(fc?.tabs.A.controller === 'v1' && fc.tabs.A.changes === 1, 'first visit: clients.claim did not take A at activation with a controllerchange')
  const fca = get('first-install-claim', 'activating')
  expect(fca?.tabs.A.controller === null, 'first visit: A is controlled before activate claims it')

  // The probe (not drawn): which worker answers a fetch while v2 is activating.
  const pf = get('activating-fetch', 'fetch')
  expect(pf?.slots.active?.state === 'activating' && pf.tabs.A.fetched === 'v2', 'probe: the fetch during activating was not answered by v2 while it was still activating')
  return out
}
