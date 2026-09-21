# Practice presentation

Problem type describes the requested response, not the course or the amount of
code in an answer. THEORY asks for explanation or reasoning. CODING asks for a
substantive implementation. A coding task can also require an explanation.

`groupPracticeProblems` and `PracticeProblemGroups` apply the same rule to full
lessons and free premium-lesson previews:

- Show Theory questions before Coding practice when both exist.
- Preserve the existing order within each group and render each problem once.
- Hide empty groups. Do not add content to force a mixture.
- Keep the existing practice and question anchors.
- Preserve the preview's initially expanded questions and the full reader's
  initially collapsed cards. Neither reveals the answer automatically.

The groups are named regions with visible category labels. They do not add a
heading level between the existing practice H2 and question H3s. This avoids
relevelling the authored question and answer sections merely to group by type.
The guided TS Basics view still uses its accepted question heading and sequence.
Groups do not introduce new fragment IDs.

Readers and source tools use `contentSlug` for the same explicit slash rule.
Canonical stored URLs do not change. Older slash-stripped card fragments still
open the canonical card when there is no existing element with that legacy ID.
An existing body destination is not taken over by that fallback.

The problem bank remains a searchable, sortable table. Its type filter and
badges use the same stored type as the lesson card. A bank sort or guided path
does not have to imitate the generic lesson group order.

## Optionality and completion

Neither type implies required or optional. Follow the authored task and route
guidance. Cloning and structural equality remain advanced extensions, not a
requirement for completing the foundational first pass.

Existing checkmarks are self-reports, not graded results. Course problem
progress includes every attached problem, including optional work. Lesson
completion is stored separately. The TS Basics first-pass counter still counts
only its four accepted questions.

Grouping changes no IDs, ownership, difficulty, access, links, stored marks or
counter denominators. Retyping an unchanged task changes filter membership,
not its identity. Materially changing an assessment requires separate review of
its contract and historical completion meaning.

Native coding is not a hosted judge. Follow the task's stated Node, compiler or
browser setup. Existing external coding links keep their original destination.
The shared instruction says to implement and check the solution, not to execute
every task as a JavaScript program. Type-level exercises require compiler checks.

## Content and release

`PRACTICE_GROUPING_ENABLED` is a server-only release flag. It defaults off and
accepts `true` or `false`. An unset or empty value is off. The lesson route passes
its value into both
reader paths; clients do not read an unexposed environment variable.

Deploy compatible publisher/reader support with grouping off. Publish and
verify the complete reviewed assessment batch before activating grouping for
both courses together. Turning it off keeps the original flat order, free
answer reveal and existing marks available. It does not reverse content or
reset progress. The independent TS Basics first-pass flag is unchanged.

This renderer does not authorize bulk metadata edits or certify task readiness.
The reviewed task changes must use the supported controlled publication scope.
Keep source-contract, reader compatibility, access, progress and recovery
acceptance separate from merely rendering two groups.
