# Native local practice

Coding tasks with an empty external `href` use a plain title and the existing
question, reveal and completion controls. They do not open a blank provider
link or claim an in-site editor, Run, Submit or automatic judge.

G3B's accepted task has a small optional setup beside its question, before
answer reveal. `G3bLocalPractice` requires its exact canonical `contentId`,
CODING type and native empty destination. Other tasks get no G3B scaffold.
Older loaded problem DTOs may omit `contentId`; their normal question and
answer remain usable without the optional setup.

The starter and command strings live in `src/lib/g3b-local-practice.ts`.
They use the existing `CodeGroup` copy, language preference and scrolling
behavior. React renders the strings as text, never executes them. The function
is explicitly unimplemented and its sample call throws until the learner
replaces the placeholder. A successful TypeScript compilation is not a passing
solution. The commands assume Node24 and, for TypeScript, version5.9.2 available
as `tsc`. No installer, saved code or attempt state is added.

The curriculum question and answer remain in CONTENT. This APP-owned setup
does not extend the frozen three-paragraph question or add a content entity,
database field or general exercise framework. Changing that task's meaning
still needs its own accepted publishing scope.

The free preview also identifies the native task as the primary substring
attempt and the old three tasks as optional comparisons. This link appears
only for the exact complete four-ID set in the accepted lesson. It uses the
existing card fragment without changing card order or promising automatic
answer reveal. The preview action is below the title. Callers must pass a real
`null` when absent, not a component element that later renders nothing, so
ordinary previews do not acquire an empty spacing block.

Completion still means the existing self-reported mark. Setup visibility,
copying, compilation and sample execution do not create completion or mastery
evidence. No old mark is transferred to the new task.
