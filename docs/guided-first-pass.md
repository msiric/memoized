# TypeScript first pass

This is an opt-in view of existing TS Basics questions, not a new lesson or
database entity. The four core definitions live in
`src/lib/typescript-first-pass.ts`. P5, the full lesson and its reference remain
available through their existing URLs.

## Flag and route

`G4_TS_FIRST_PASS_ENABLED` is server-only and defaults off. Only `true` enables
the view; unset, empty or `false` leaves it inactive. Other values fail clearly
as configuration errors.

The active query is:

```text
/courses/js-track/typescript-introduction/ts-basics?path=typescript-first-pass
```

An explicit `step` must be one of the four definition IDs. Generated links pair
it with the existing question fragment. A valid step wins over a conflicting
fragment with a visible notice. Without a step, a valid core fragment is honored;
otherwise the first unmarked question is selected. Invalid or duplicate steps
are explained and do not shrink the core set.

Explicit navigation preserves the current question in browser history. Marking a
question does not navigate or close its answer. A fresh URL without selection
derives the next unmarked question again. No scroll position, editor buffer or
review queue is stored.

The normal lesson URL is unchanged. An inactive flag returns the normal reader
and free questions. The previous app also ignores the query and retains the
fragment, so rollback does not introduce a new missing pathname.

## Rendering policy

The lesson route explicitly uses `dynamic = 'force-dynamic'` and does not export
`generateStaticParams`. Its response depends on the current session and query,
so it is rendered at request time rather than enumerated for static generation.
This policy applies to the lesson route template, not to the whole site.
It controls server rendering and caching, not Next's client Router Cache. A
fresh server request or reload must receive current content; browser Back or
client navigation alone is not a guarantee of a new server read.

Do not rely on the position of `getServerSession` or a later query-parameter read
to stop static generation after database work has already begun. Authentication,
access checks and question progress retain their existing runtime behavior.
The sitemap still derives lesson URLs from the catalog independently of static
path generation. Public metadata caching, if added later, needs its own explicit
review rather than weakening this personalized response boundary.

## Data and progress

The server resolves canonical content IDs to existing row IDs and validates
ownership, slug, title, type, difficulty, question contract and compiled feedback.
It projects only public lesson metadata and already-free Q/A. The paid lesson
body is never included in guided props, including for premium users.

`N/4 marked complete` is the intersection of the four row IDs with the current
user's confirmed marks. It is not the global percentage, a mastery score or
verification of the local compiler exercise. Lesson/P5/unrelated marks do not
contribute. Historical marks retain their meaning.

Shared progress state is bound to a session owner and an in-memory revision.
Headers bootstrap it without overwriting an already-ready owner with undated
RSC data. Explicit refreshes use a captured revision. Pending saves prevent a
conflicting snapshot; old-owner and stale responses are discarded.

Question saves use an explicit desired boolean, an optional server-side expected
user precondition and a confirmation response. Cards and the problem bank share
pending/error handling. A failed save retains the last confirmed mark. These
guards do not change the database's existing last-write-wins semantics or add a
new history schema.

Known user-progress failures remain unavailable rather than successful empty
marks. Content/curriculum failures and unexpected server errors still surface.
The guided view keeps public Q/A available when its progress read fails.

## Release checks

The normal reader geometry fixture includes a synthetic TS lesson and public
question contracts with synthetic answers. `check-guided-path.ts on/off`
exercises the actual built app and ephemeral CI database across anonymous, free,
premium and revoked states at 320, 375, 768, 1024, 1440, 2560 and 3840px. It covers persisted marks,
duplicate/failing saves, progress refresh failure, account changes, code focus/
scrolling, public projection, malformed queries and disabled fallback.

`check-lesson-rendering.ts on/off` adds 15 cases per mode for the rendering
contract. It inspects the actual build manifests, checks unknown catalog paths
for real 404/noindex responses and checks document/Flight cache headers. It
changes only known synthetic description/body/feedback markers in the disposable
CI database, reloads the exact same URLs with normal browser caching enabled and
requires fresh metadata and feedback with the same access boundaries. Every
modified fixture field and timestamp is restored, and all progress rows must
remain identical. Reports are `lesson-rendering-on.json` and
`lesson-rendering-off.json` in the existing reader-layout artifact.

### Extended hosted state coverage

`node --import tsx src/scripts/check-guided-path-state.ts on` adds **14 cases**
against the same actual production build and disposable `memoized_ci` database:

- Empty/full free, empty premium, optional-only free and lesson-only premium histories (five
  cases across 320/375/768/1024px). P5 and lesson self-reports remain `0/4`.
- Real hash-only entry, conflicting step/hash, Next, browser Back/Forward,
  reload and focus refresh after an external fixture mark (320 and 768px).
- Normal lesson/optional-question links and cross-route Back/Forward (768px).
- Normal Problems table and slide-over mark/unmark, shared confirmation,
  reload and guided-reader persistence, with unrelated full-user problem and
  lesson history preserved (375 and 1024px).
- Reactive Incomplete filtering with three questions (375px) and two questions
  (1024px): marking the open question removes its table row but preserves the
  same drawer, original sequence/count, and revealed feedback. Next must open
  the original next question without skipping it or becoming disabled.
  Closing/reopening must use the newly filtered one-question sequence; reload
  confirms the saved marks and filter URL. Public history updates let Next
  manage its own history markers so a save cannot restore a stale unfiltered URL.
- One actual owner's ACTIVE → EXPIRED subscription transition with identical
  read-only progress history and normal-reader paid-body protection (768px).
- A real successful old-owner save, committed in PostgreSQL while CDP holds
  its response, followed by signed-cookie/session switching without navigation.
  The new owner's read may queue behind that save, so loading remains distinct
  from confirmed marks. Releasing the response must never apply the old owner's
  count or remove their legitimate mark. While B remains active, A's disposable history
  changes again; returning A → B → A without navigation must read A's current
  `4/4`, not reuse its original `1/4` bootstrap snapshot (375px).

Fixtures require explicit opt-in and asserted loopback `/memoized_ci` URLs.
The browser blocks every non-loopback/data request, reserves at most 70
middleware-counted requests per minute, honors bounded read `Retry-After`, and
never retries a write. Reports contain phase/stack diagnostics, DOM snapshots,
screenshots, HTTP status metadata (not API bodies/cookies/tokens), and exact
synthetic before/after/restored progress rows. Each case restores only its
specific fixture rows in `finally`; it never truncates tables.
Native pointer targets are scrolled clear of the fixed header and checked for
stable bounds and hit-testing before clicks. Original action responses are read
through CDP Fetch while paused, then continued unchanged. This avoids relying
on a separate Network session's response-body cache; owner, question and desired
value confirmations are still required.

**Pinned old-reader compatibility is an explicit opt-in gate**, not part of an
ordinary PR's build cost. Add the `g4-old-reader` label **before pushing a new PR
revision** targeting `master` (this workflow has no `workflow_dispatch` and does
not trigger merely from adding a label). Its bounded 20-minute stage checks out
`bb5d8143d289f3e835e58628be30c4345da2db2b` outside the source tree under
`RUNNER_TEMP`, asserts identical `yarn.lock` and Prisma schema, reuses the locked
dependencies, and builds Next directly without migrations or curriculum sync.
It starts the new writer on 3014 and pinned old reader on 3015 using only dummy
CI configuration and the same fresh database.

`node --import tsx src/scripts/check-guided-path-state.ts compat` then performs
one mixed-version scenario: two actual new-writer desired-value saves, five
old-reader observations (free/premium/anonymous query+fragment fallback and
free/premium problem banks), and exact unchanged-history assertions after every
old-reader visit. `G4_OLD_READER_SHA` must match the pin. The command restores the
pre-write synthetic rows in `finally`. Run it only in the prepared hosted job;
do not point it at production, real accounts, or a shared local database.

The `reader-layout` artifact includes `guided-state-on.json`,
`guided-state-compat.json` when opted in, screenshots, and server/build logs.
Every phase is printed and appended immediately to the corresponding
`guided-state-*.jsonl`; the JSON report is atomically refreshed before each
phase, on HTTP responses, and after DOM capture. A 20-second console heartbeat
identifies the current case/phase during waits. Before/after/restored fixture
snapshots are persisted at their boundaries, not deferred until the suite ends.
Implementation or type/lint success is **not** hosted acceptance: the required
reports must show `complete: true` and every restoration must match before
claiming runtime coverage or mixed-version compatibility.

Before activation, independently review the exact diff and confirm ordinary
reading/progress behavior as well as the guided view. Deploy support inactive,
then enable the production-scoped flag only for a separately observed deployment.
Also build the exact candidate against an isolated complete catalog under
production-like pooling constraints and controlled response latency. Small
synthetic reader fixtures do not establish full-catalog build viability. Keep
those diagnostics away from production data services and do not change live
connection limits to obtain a passing result.
Environment changes apply to a new deployment, not the already-serving one.
Keep the publisher's app pin aligned with the observed release.

Disabling or rolling back the app must not reset any user marks. There are no
content or database migrations to reverse for this view.
