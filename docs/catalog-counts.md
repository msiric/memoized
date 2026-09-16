# Learner-visible catalog counts

Exact counts describe a loaded, committed database snapshot, not a proposed
source revision. `CONTENT_STATS` remains the ordinary publisher/source baseline
at **2 courses, 8 sections, 120 lessons, 506 problems and 33 resources**.
It is not a UI fallback. Additive publishing validates its explicit manifests
independently.

## Public read contract

`GET /api/catalog-stats` is unauthenticated and read-only. The route is
`force-dynamic`; both successful and failed responses send
`Cache-Control: no-store`.

Successful response (numbers shown are the old catalog, not defaults):

```json
{
  "status": "available",
  "stats": {
    "courses": 2,
    "sections": 8,
    "lessons": 120,
    "problems": 506,
    "resources": 33
  }
}
```

Failed or invalid read: **HTTP 503**, with no counts:

```json
{ "status": "unavailable", "code": "CATALOG_STATS_UNAVAILABLE" }
```

Server failures also use the existing centralized error reporter. Public
responses do not include the underlying error.

The service uses scalar counts in one PostgreSQL `RepeatableRead` transaction.
Courses must be active. Sections, lessons and problems must belong to an active
course. Resources include those belonging to active courses and standalone
resources, including the intro. No IDs, identities, questions, answers, bodies,
progress, subscriptions or source files are read or returned. Counting does not
invoke a Source API, publish content, reindex search or mutate data.

The DTO accepts finite, nonnegative safe integer counts and validates the
parent/child shape. It copies only the public fields. A real empty catalog can
have zero counts; an exception or malformed response cannot become successful
zeros.

## Rendering and refresh behavior

| Surface | Snapshot and supported refresh |
| --- | --- |
| Root layout, inherited metadata and JSON-LD | Evergreen descriptions with the existing interview-preparation intent. No catalog read and no whole-site dynamic setting. |
| Homepage | Existing hourly ISR, banner invalidation, Stripe handling and evergreen metadata remain. One homepage-scoped `CatalogStatsProvider` makes one uncached public read shared by ContentOverview, SolveProblems and FreeOfferingHighlight. |
| Homepage loading/failure | No seeded ISR count, compiled count or invented zero. The overview names the loading/unavailable state. The other widgets use the same snapshot and evergreen wording while no count is available. |
| Homepage return | Refresh on provider mount, document becoming visible and a persisted `pageshow` (browser back/forward cache restoration). Hide the old exact claim while refreshing. Abort the previous read and reject late responses/body parses by revision. Unmount aborts and removes listeners. |
| Premium | Page and `generateMetadata` share one no-argument React request-cached scalar snapshot. A failed read gives explicit unavailable UI and evergreen metadata. |
| Courses | Page/cards and `generateMetadata` share one no-argument request-cached `getActiveCoursesWithProgress()` result. Global course, lesson and problem totals are derived from this result, never an independent count that could race the cards. Failures show unavailable UI and evergreen metadata. |
| Problem bank | Layout metadata and `@table/page` share one no-argument request-cached `getProblems()` result, preserving the existing user-aware service scope. Filtering/sorting runs on the same loaded unfiltered array. The parent-owned `ProblemList` heading must use `allProblems.length`, not the filtered array or a scalar count API. A failed read stays a page error, not an empty successful bank. |

The courses index route group, problem bank and premium layouts explicitly use
`force-dynamic`. These entry points already depend on the request's session.
Their metadata reads must not run against a build-time catalog or let an
availability boundary consume Next's static-generation bailout. The Root
layout and homepage keep their existing static/ISR contracts.

The wrappers live in the RSC-only consumer module `src/lib/catalog-request.ts`.
They are not Server Actions or a persistent/global cache and must not be imported
by client code or Node publishing scripts. Existing service APIs remain unchanged.
The bank still uses its existing all-record service scope; this change does not
introduce new course activation/filtering rules into that service.

**A database commit does not invalidate a browser's existing Next.js Router
Cache.** Fresh server requests, full reloads and new API reads see the committed
state at their read snapshot. Already loaded views, prefetches and soft/back
navigation can retain their earlier coherent snapshot. There is no promise that
every Back or soft navigation is fresh. Reload the bank/courses/premium page
when a fresh snapshot is required. A bank `router.refresh()` control, if added
by its owner, refreshes that loaded view rather than substituting an independent
headline count. Homepage visibility/mount refresh applies only to its provider.
A continuously visible homepage is not live-polled.

## Activation and recovery

Before complete-record commit, current reads remain at 506 problems. Creation
must atomically expose the complete native record; current reads then return
507. Body/answer source preparation is not activation. Restoring old authored
fields while retaining the legitimate new task and its progress keeps 507.
This count work creates no task, link, progress target or authored content.

Unit tests cover 506/507, retained reads, DTO/privacy failures, no-zero
presentation, mount/visibility refresh, aborts and out-of-order responses.
Request-consumer tests exercise metadata and pages together using an explicit
request-cache harness because Vitest's client React has no RSC dispatcher.
They are not a substitute for the coordinator's full-catalog atomic creation,
real Next.js/browser Router Cache, access and retained-progress rehearsals.

## Implementation files

- Public contract/validation: `src/types/catalog-stats.ts` and its test.
- Scalar database read: `src/services/catalog-stats.ts` and its test.
- HTTP boundary: `src/app/api/catalog-stats/route.ts` and its test.
- Request-scoped RSC wrappers: `src/lib/catalog-request.ts` and
  `src/lib/catalog-request.test.tsx`.
- Homepage client scope: `src/components/CatalogStatsProvider.tsx`,
  `CatalogStatsProvider.test.tsx` and `CatalogProblemStat.tsx`.
- Consumers: `ContentOverview.tsx`, `SolveProblems.tsx`,
  `FreeOfferingHighlight.tsx`, homepage/root, premium page/layout,
  courses `(courses)` page/layout and problems layout/`@table/page.tsx`
  (including its existing test).
- Source baseline clarification: `src/constants/content-stats.ts`.
- Architecture/baseline guards: `src/lib/catalog-boundaries.test.ts`.

`ProblemList` uses **`allProblems.length`** and describes the problems loaded
in that view. Do not fetch the public count endpoint from the bank or substitute
`filteredProblems.length`. The table page supplies the shared snapshot's
`allProblems` and filtered result.
