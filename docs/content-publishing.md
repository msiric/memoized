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
