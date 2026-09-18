# Controlled in-place content publishing

`yarn publish:content` is a narrow operator tool, not a general curriculum
migration or a security boundary against privileged maintainers.

## Supported classes

`independent-in-place-text-v1` permits shape-preserving text/code repairs in
existing lesson/resource bodies and existing problem answers. It preserves
identity, order, access, question contracts, resource associations, counts,
headings, links, imports/exports, expressions, JSX attributes/components and
code-panel structure. Course/section introductions and the resource hub are not
editable through this class.

`existing-entity-structural-text-v1` is an opt-in minimum structural profile for
one lesson only:

```text
--change-class existing-entity-structural-text-v1
--lesson js-track/typescript-introduction/ts-basics
```

Without `--change-class`, the publisher defaults to
`independent-in-place-text-v1`; `--lesson` is rejected for that default class.
The structural class currently rejects every other lesson UID and every unknown
class value. It may change only
`content/js-track/typescript-introduction/ts-basics/page.mdx` and the answer
fields of the existing five TS Basics problem records in
`content/js-track/typescript-introduction/_lessons.json`.

The structural profile freezes lesson/problem/resource metadata, question text,
IDs, titles, types, difficulties, hrefs, relationships, ordering, payload
inventory and the lesson metadata export bytes. It rejects new imports/exports,
MDX expressions, unsupported JSX/HTML/fragments/images/embeds/scripts, component
props/spreads and code-fence metadata. Allowed authoring forms are the explicit
Markdown subset used by the profile, plus bare `<Note>` and bare `<CodeGroup>`
with nonempty allowlisted-language code panels.

Use components as multiline Markdown blocks. An inline `<Note>text</Note>` is
not the supported block form. ESM is allowed only for the byte-frozen root
metadata export, never inside a Note, list, blockquote or another nested node.
CodeGroups must have distinct rendered tab labels. Repeated languages,
`ts`/`typescript` aliases and two fallback `Code` labels are rejected because
the existing reader cannot select those panels independently.

The structural plan records the class, profile, source lesson UID, allowed
fields, headings/anchors, links, code/group surface, external HTTPS destinations
and a pairwise anchor-conflict proof across base/candidate body and answers
with fixed problem-card anchors. This is eligibility/compatibility evidence
only; it is not correctness, pedagogy, independence, owner approval or
production readiness.

Each selected surface must generate nonempty unique H2 IDs before its IDs enter
the conflict proof. The reader's fixed practice-section heading and unchanged
question headings are reserved alongside the five problem-card anchors.

Local fragment links are deliberately conservative in this first profile: every
fragment target must already resolve in both the base and candidate source
catalogs. A new link cannot depend on a newly introduced heading in another
field, and links to newly introduced local anchors are rejected even if the
same candidate adds the target. Same-field generated section navigation and
reader hash behavior still need real reader evidence outside this source check.

Structural eligibility does not establish pedagogical or code correctness.
An independent review must establish that edits are semantically independent
and that every intermediate old/new row combination is acceptable. Coordinated
breaking changes, identity moves, new entities and schema changes are unsupported.

## Inputs and planning

Use clean app code at an approved full commit SHA. The publisher exports content
and resources directly from immutable Git commits, not mutable working files.
It prepares the entire base/candidate content and resource pair before writes.

An independently reviewed environment descriptor identifies targets without
containing credentials:

```json
{
  "label": "isolated-example",
  "mode": "rehearsal",
  "database": {
    "host": "localhost:5433",
    "name": "memoized_g0_example",
    "schema": "public"
  },
  "search": {
    "endpoint": "http://127.0.0.1:7707"
  }
}
```

Targets are checked against the configured URLs. Rehearsal requires loopback
services; the operator must still establish actual isolation. A production mode
or a GitHub Actions environment variable is not authorization or proof of safety.

Run without `--apply` first:

```text
yarn publish:content --repository <content-git-repository>
  --base <full-published-content-sha>
  --candidate <full-candidate-content-sha>
  --app <full-approved-app-sha>
  [--change-class independent-in-place-text-v1]
  --environment <reviewed-target-descriptor.json>
  --report <new-private-journal.json>
```

For the TS Basics structural profile, add both `--change-class` and `--lesson`
as shown above. The lesson value is the source path without a leading slash;
database content IDs remain the canonical IDs prepared from source and may have
a leading slash.

The journal records source/target fingerprints, changed identities and the plan
SHA256, without copying full authored bodies or user data. Review the complete
plan against the accepted goal scope.

Application additionally requires `--apply --independent --approval <reference>`
and `--expected-plan <reviewed-plan-sha256>`. It recomputes the plan and rejects
a mismatch. Production application is restricted to the reviewed workflow.
Do not generate the expected hash inside the same unreviewed publish action.

## Persistence and recovery

The database must have the expected complete identity/metadata inventory and
authored content matching the base or candidate states. The tool updates only
changed body/serialized-body or answer/serialized-answer pairs. Conditional
updates match the observed authored state, including metadata and serialization;
they do not rely solely on timestamps.

There is no catalog-wide write transaction and no prune operation. A write
failure can leave a mixture of independent base/candidate rows; the release is
then incomplete, not successful. Unexpected authored drift blocks overwrite.
User progress and account/subscription data are not updated by this tool.

For a known content-write failure, inspect the journal and database before
retrying. Already-applied rows can be skipped. Selective recovery uses a newly
reviewed reverse-source plan, preserving user writes rather than restoring an
entire old database. Recheck the pinned app's compatibility with both sources.

Structural recovery is also anchor-preserving. If a published structural source
added H2 anchors, a literal candidate-to-original-base reversal that removes
those anchors fails closed. Use a separately reviewed compatible recovery source
that retains all already-published anchors, or use exact reverse-source
restoration only when the anchor sets allow it. There is no force or recovery
bypass.

## Search activation is a separate boundary

The indexer builds a unique staging index, preserves active settings and access
filtering, waits for terminal task success, verifies the staging dataset, and
activates it through an atomic index swap. It never deletes the active index
as a rebuild step.

Progress events record staging and task identity before/after mutations. A
pre-activation failure retains the old active index. Confirmed activation with
failed cleanup is different from an unknown swap outcome.

**Never blindly repeat or reverse an uncertain swap.** Inspect its exact task
and index state first. Retained staging indexes require deliberate cleanup after
their role is known; do not delete them by a broad prefix.

Index swaps also rewrite index names in completed task history. A historical
task can therefore mention the new staging name without being a second execution
of the current swap. If the receipt was lost, use the current staging generation's
preparation task IDs and timing alongside the active/staging contents. Do not
identify the operation by an unbounded name match alone.

During a compatible content repair, search may briefly serve the previous valid
text snapshot. Access/identity/URLs do not change in this class. If search
activation fails, publication is incomplete until the required search state is
reconciled. A successful CLI result is still `published-awaiting-live-acceptance`,
not a substitute for live checks.

## Release discipline

Use a single production release coordinator. Serialize app and content
promotions operationally; equal concurrency names in different repositories do
not form a cross-repository lock. Record the exact app revision used by content
publication and require its accepted deployment/compatibility evidence.

App rollback, authored-content restoration, search activation/cleanup and
provider disaster recovery are different operations. Verify applicable
permissions, targets and retention rather than assuming an app rollback also
rewinds data.

No production bootstrap or broad publishing capability is authorized merely by
adding this tool. Unsupported change classes remain blocked.

Unit tests must not contact production. The email-logo test checks the declared
URL and repository PNG; the release rehearsal/live smoke probes separately check
HTTP availability and content type at `/images/brand/logo-dark.png`.

## G7-01 existing-assessment capability (inactive)

```text
--change-class existing-assessment-update-v1
--lesson js-track/core-fundamentals/data-types
profile: g7-values-coercion-minimum
```

The only other admitted lesson selector is
`js-track/core-fundamentals/type-coercion`, for a later separately accepted
candidate. One lesson is selected per publication. This is capability code,
not candidate acceptance or authorization to deploy/publish. The active control
configuration remains the existing enabled G3C selection and app pin.

`src/lib/g7-contracts.ts` freezes canonical lesson metadata, ordered problem
metadata and all original question/answer/body hashes from immutable content
`a1c613747ff260a2d9fb1d8c7c2932057da9ab7c`. Canonical lesson descriptions
come from `_lessons.json`, not body exports. Both bodies are FREE and have no
resources. No identities, titles, order, slugs, hrefs, links, difficulty,
ownership or access change. The source baseline remains 506; this profile
requires the complete retained G3B/G3C catalog at 508 and freezes both native
tasks' entire raw and compiled payloads.

All six answers and the selected body may change. Only these questions may
change, always as a complete existing assessment:

| Lesson | Existing problem | Approved type |
| --- | --- | --- |
| Data Types | `modern-array-methods-at-findlast-findlastindex` | THEORY unchanged |
| Data Types | `implement-deepclone-structural-deep-copy` | THEORY → CODING, HARD retained |
| Type Coercion | `implement-deepequal-structural-equality` | THEORY → CODING, HARD retained |

Data Types alone retains 508 problems with 340 THEORY / 168 CODING. Other
implementation prompts are not reclassified.

### Binding handoff

`G7_REVIEWED_BINDINGS` binds only the complete local Data Types review candidate
`558790ecb3d3820c0a5294fa4ea89ab17a02b9b4`. The Type Coercion entry remains
absent. This is not owner acceptance of the finished candidate or production
activation: the active control still selects G3C. Planning, preparation,
state inspection and application fail closed without a complete binding.
There is no source-supplied, environment, CLI or request override.
Synthetic test mocks do not activate the profile. The binding fields are:

- `sourceLessonSha256`: `g7ValueHash(selectedLessonObject)` for the complete
  accepted `_lessons.json` lesson object, including all six full pairs. Never
  hash the whole shared configuration as the selected checkpoint.
- `bodySha256`: `g7Digest(exactBodyText)`.
- `serializedBodySha256`: `g7ValueHash(completeSerializedBody)`.
- `problems`: six entries in the original source order, each with `id`, exact
  after `type`, raw `questionSha256` / `answerSha256` from `g7Digest`, and
  `serializedQuestionSha256` / `serializedAnswerSha256` from `g7ValueHash`.
  Bind the entire serialized object, not just its `compiledSource`.

`g7ValueHash` hashes UTF-8 JSON with recursively sorted object keys; array order
is preserved. Raw text hashing does not normalize whitespace. Compile using
the exact reviewed app through `prepareSnapshot`; review the entire source,
question, answer, local preparation/check instructions and type before copying
hashes into code. Binding an unapproved question/type is rejected even when
all checksums are well formed. The three changed questions must each have new
question and feedback hashes, not a new question with its old feedback.

### Surfaces and fragments

The approved G7 `HEADINGS.json` contracts are in `G7_CONTRACTS`: exact body H1,
static `metadata` title/description and eight Data Types / nine Coercion H2
ID/title pairs. Literal H2s reuse the deployed `staticHeading` parser. Supported
authoring is Markdown, standalone plain literal H2, bare `CodeGroup` with
plain JS/TS/text/bash/json fences and optional bare `Note`. CodeGroup labels
must be distinct. No imports, arbitrary expressions, events, runtime HTML,
widgets, assets, file disclosures, new components or fence metadata are
authorized. H3+ is simplest for answer subsections; H2s remain subject to
whole-lesson mixed-state collision checks.

Only exact frozen legacy bodies may keep their old export/H1 pair and
unlabelled fences. The exact frozen Coercion body additionally retains its two
existing Questions/Answers fence annotations. New candidates cannot use those
exceptions. The body/card collision exception applies only to Coercion body
SHA256 `6d172b53bb2f6f81d24d35395ef2de28df4aa330c8178b3fb5c0a171b7bb8a1d`,
and exactly `truthy-and-falsy-values` and `the-operators-dual-nature`.
No other collision or near-hash is admitted. The revised body uses
`boolean-contexts` and `addition-and-coercion`; the old shared fragments then
uniquely target the unchanged cards. Exact legacy recovery restores the old
ambiguity, not two simultaneously preserved destinations. Every other
pairwise anchor, uniqueness and both-catalog link check remains enabled.

### Atomic persistence, retries and recovery

`InPlaceChange` is discriminated by `field`. Existing body/answer changes retain
their old shape; `field: 'assessment'` carries before/after `AssessmentPayload`
objects with question, answer, type and both complete serialized values.
`prepareContentRelease`, `describeInPlacePlan`, `checkReleaseState` and
`applyContentRelease` retain their existing entry points.

Each assessment uses **one conditional `problem.updateMany`**, matching its
observed UUID, owner, unchanged metadata, both raw texts and both serialized
values. It sets question, answer, serializedQuestion, serializedAnswer and type
together. No create, upsert, UUID replacement or catalog-wide write transaction
is used. A coupled row must match the complete before state or complete after
state; arbitrary cross-products are rejected. The remaining answers and body
may be independently before or after.

A zero-write race or recognized uncertain receipt triggers one complete-row
inspection by both observed UUID and canonical content identity. Only the exact
same-UUID/same-owner complete candidate is accepted as `already-applied`.
Missing, ambiguous, still-before or foreign receipts fail closed without
another write. Unclassified errors also stop; a subsequent deliberate retry
rechecks the entire catalog. Journals record `field: assessment` and the
existing UUID, and plan descriptions bind both raw/compiled hashes and types.
Final verification checks complete payloads and unchanged UUIDs.

Recovery is a separately reviewed reverse-source plan: retain the same 508
identities and both native tasks, and restore only the selected lesson's
approved records. Each of the six source assessments may independently be its
complete frozen-before or reviewed-after question/answer/type state. A hybrid
within one assessment is never permitted. The body independently uses either
bound state, admitting exactly the 128 body-plus-six-assessment combinations
when all six assessments differ. Metadata, ordering and identities remain
frozen. `sourceLessonSha256` still binds the complete reviewed candidate, not a
mixed recovery source; the full checksum is verified whenever all six
assessments are after. The complete-before checksum is also verified.

Selective recovery can restore one assessment or one independent answer while
retaining the other candidate records and body. It also recovers a partially
applied database without restoring a database backup or touching legitimate
user progress. Reuse the original reviewed publication plan after inspecting an
index failure; a new no-op plan does not repair search.

Focused tests use explicitly synthetic bindings and mocked services. They do
not establish actual PostgreSQL atomicity, search/cache behavior, browser
fragments, historical progress preservation, rollback compatibility or final
candidate correctness. Those remain coordinator-owned isolated integrations
and independent acceptance gates before any activation.
