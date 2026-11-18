import type { TreeRecording } from '../../annotated-tree/programs/types'
import type { HashedProgram, StaticPreset } from '../../../shell/static-types'
import { buildProtoPanel, type ProtoPanelSpec } from '../proto-build'
import type { ProtoDiagram } from '../proto-model'
import { extendsProgram, manualProgram } from '../proto-programs'
import recording from '../recordings/classes.json'
import { verifiedProto } from './prototypes'

/**
 * Objects and Classes (R4 row js-track/core-fundamentals/objects-and-classes,
 * shared visual `prototype-object-graph`, preset `extends-two-chains`; the
 * register's `manual-object-create` is its second panel). `extends` links two
 * chains: the instances' (rex → Dog.prototype → Animal.prototype) and the
 * constructors' own (Dog → Animal → Function.prototype); the manual
 * Object.create pattern builds only the first (Car → Function.prototype).
 * Every object, link and lookup is recorded under the inspector
 * (`yarn viz:prototypes`), and `this === rex` is read inside the parent's
 * speak while `super.speak()` runs it. The register's `Dog.create()` static
 * lookup is not drawn: no lesson code defines it (triage correction).
 */

export const CLASS_RECORDINGS = recording as unknown as Record<string, TreeRecording>

/** `this === rex`, read in the paused parent method during `super.speak()`. */
export const superThisIsRex = (rec: Record<string, TreeRecording>) =>
  rec.extends.pauses.find((p) => p.probe === 'super')?.vars.thisIsRex === true

export const classPanels: ProtoPanelSpec[] = [
  {
    program: extendsProgram,
    id: 'extends',
    heading: 'with extends: two chains',
    show: {
      rex: ['name'],
      'Dog.prototype': ['speak'],
      'Animal.prototype': ['speak'],
      'Object.prototype': [],
      Dog: ['prototype'],
      Animal: ['prototype'],
      'Function.prototype': [],
    },
    count: ['rex', 'Dog.prototype', 'Animal.prototype', 'Object.prototype', 'Function.prototype'],
    lookup: ['Animal.prototype', 'speak'],
    start: 'Dog.prototype',
    chains: true,
    note: 'marked: super.speak(), this = rex',
  },
  {
    program: manualProgram,
    id: 'manual',
    heading: 'by hand: one chain',
    show: {
      myCar: ['make'],
      'Car.prototype': ['honk'],
      'Vehicle.prototype': ['drive'],
      'Object.prototype': [],
      Car: ['prototype'],
      'Function.prototype': [],
    },
    count: ['myCar', 'Car.prototype', 'Vehicle.prototype', 'Object.prototype', 'Function.prototype'],
    lookup: ['myCar', 'drive'],
    chains: true,
    results: [['myCar.drive()', 0]],
    note: 'Car does not inherit from Vehicle',
  },
]

export const classData = (rec: Record<string, TreeRecording>): ProtoDiagram => {
  if (!superThisIsRex(rec)) throw new Error('extends: the recording does not show this === rex inside super.speak()')
  return { panels: classPanels.map((s) => buildProtoPanel(s, rec)) }
}

export const extendsTwoChains: StaticPreset<ProtoDiagram, HashedProgram> = {
  id: 'extends-two-chains',
  label: 'extends two chains',
  title: 'What extends links',
  caption: 'extends links Dog.prototype to Animal.prototype for instance methods and Dog to Animal for statics; the manual pattern links only the first.',
  programs: [extendsProgram, manualProgram].map((p) => verifiedProto(p, CLASS_RECORDINGS[p.id])),
  claims: [],
  data: classData(CLASS_RECORDINGS),
}
