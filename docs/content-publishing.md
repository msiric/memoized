# Controlled in-place content publishing

`yarn publish:content` is a narrow operator tool, not a general curriculum
migration or a security boundary against privileged maintainers.

## Supported class

`independent-in-place-text-v1` permits shape-preserving text/code repairs in
existing lesson/resource bodies and existing problem answers. It preserves
identity, order, access, question contracts, resource associations, counts,
headings, links, imports/exports, expressions, JSX attributes/components and
code-panel structure. Course/section introductions and the resource hub are not
editable through this class.

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
  --environment <reviewed-target-descriptor.json>
  --report <new-private-journal.json>
```

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
