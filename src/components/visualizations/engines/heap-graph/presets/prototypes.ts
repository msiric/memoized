import type { TreeRecording } from '../../annotated-tree/programs/types'
import type { HashedProgram, StaticPreset } from '../../../shell/static-types'
import { buildProtoPanel, type ProtoPanelSpec } from '../proto-build'
import type { ProtoDiagram } from '../proto-model'
import { constructorAfterProgram, constructorBeforeProgram, personProgram, shadowProgram, type ProtoProgram } from '../proto-programs'
import recording from '../recordings/prototypes.json'

/**
 * Prototypes (R4 row js-track/core-fundamentals/prototypes, shared visual
 * `prototype-object-graph`, presets `lookup-and-shadowing` and
 * `constructor-fix`). Every panel is built from the committed recording
 * (`../proto-build.ts`); a preset adds the title, the caption, the panel
 * headings and which recorded rows to draw. The truth test rebuilds `data`
 * from a fresh run.
 */

export const PROTO_RECORDINGS = recording as unknown as Record<string, TreeRecording>

/** The recorded run as the preset lists it: its output, never its code. */
export const verifiedProto = (p: ProtoProgram, rec: TreeRecording): HashedProgram => ({
  id: p.id,
  runtime: 'node@24.x',
  sha256: rec.sha256,
  observed: rec.stdout,
})

export const lookupPanels: ProtoPanelSpec[] = [
  {
    program: personProgram,
    id: 'inherited',
    heading: 'alice.toString: inherited, 2 links up',
    show: { alice: 'all', 'Person.prototype': 'all', 'Object.prototype': ['toString'], Person: ['prototype'] },
    count: ['Object.prototype'],
    lookup: ['alice', 'toString'],
    results: [['alice.toString()', 1]],
  },
  {
    program: shadowProgram,
    id: 'shadowed',
    heading: 'dog.sound: an own property shadows',
    show: { dog: 'all', animal: 'all', 'Object.prototype': [] },
    count: ['Object.prototype'],
    lookup: ['dog', 'sound'],
    results: [
      ['dog.sound', 0],
      ['after delete', 1],
    ],
    note: "animal's sound is never reached",
  },
]

const CHILD_SHOW = { child: 'all', 'Child.prototype': 'all', 'Parent.prototype': 'all', 'Object.prototype': [], Child: ['prototype'], Parent: ['prototype'] } as const

export const constructorPanels: ProtoPanelSpec[] = [
  {
    program: constructorBeforeProgram,
    id: 'before',
    heading: 'before: Child.prototype replaced',
    show: CHILD_SHOW,
    count: ['Object.prototype'],
    lookup: ['child', 'constructor'],
    results: [['child.constructor === Child', 0]],
  },
  {
    program: constructorAfterProgram,
    id: 'after',
    heading: 'after: constructor restored',
    show: CHILD_SHOW,
    count: ['Object.prototype'],
    lookup: ['child', 'constructor'],
    results: [['child.constructor === Child', 0]],
  },
]

export const lookupData = (rec: Record<string, TreeRecording>): ProtoDiagram => ({ panels: lookupPanels.map((s) => buildProtoPanel(s, rec)) })
export const constructorData = (rec: Record<string, TreeRecording>): ProtoDiagram => ({
  panels: constructorPanels.map((s) => buildProtoPanel(s, rec)),
})

export const lookupAndShadowing: StaticPreset<ProtoDiagram, HashedProgram> = {
  id: 'lookup-and-shadowing',
  label: 'Lookup, shadowing',
  title: 'Lookup walks [[Prototype]] links',
  caption: 'A lookup checks the object itself, then each [[Prototype]] in turn, and stops at the first own property: an own key shadows the rest.',
  programs: [personProgram, shadowProgram].map((p) => verifiedProto(p, PROTO_RECORDINGS[p.id])),
  claims: [],
  data: lookupData(PROTO_RECORDINGS),
}

export const constructorFix: StaticPreset<ProtoDiagram, HashedProgram> = {
  id: 'constructor-fix',
  label: 'Constructor fix',
  title: 'Replacing .prototype loses constructor',
  caption: 'Object.create(Parent.prototype) has no own constructor, so child.constructor is found on Parent.prototype until the fix restores it.',
  programs: [constructorBeforeProgram, constructorAfterProgram].map((p) => verifiedProto(p, PROTO_RECORDINGS[p.id])),
  claims: [],
  data: constructorData(PROTO_RECORDINGS),
}
