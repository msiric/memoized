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
premium and revoked states at 320, 1440 and 3840px. It covers persisted marks,
duplicate/failing saves, progress refresh failure, account changes, code focus/
scrolling, public projection, malformed queries and disabled fallback.

Before activation, independently review the exact diff and confirm ordinary
reading/progress behavior as well as the guided view. Deploy support inactive,
then enable the production-scoped flag only for a separately observed deployment.
Environment changes apply to a new deployment, not the already-serving one.
Keep the publisher's app pin aligned with the observed release.

Disabling or rolling back the app must not reset any user marks. There are no
content or database migrations to reverse for this view.
