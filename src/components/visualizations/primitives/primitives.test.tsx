// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Button, buttonClasses } from './Button'
import { Caption } from './Caption'
import { ChoiceRow } from './ChoiceRow'
import { Disclosure } from './Disclosure'
import { Frame } from './Frame'
import { Provenance, provenanceText } from './Provenance'
import { SegmentedControl } from './SegmentedControl'
import { segmentedWidth } from '../step-log/validate'
import { Tag } from './Tag'
import { focusRing, frameCls } from './tokens-v3'

const classOf = (html: string, tag: string) => new RegExp(`<${tag}[^>]*class="([^"]*)"`).exec(html)?.[1] ?? ''

describe('VDS primitives', () => {
  it('Frame: one class string, polymorphic, overridable', () => {
    for (const as of ['section', 'figure', 'div'] as const) {
      const html = renderToStaticMarkup(<Frame as={as}>x</Frame>)
      expect(classOf(html, as)).toBe(frameCls)
    }
    const html = renderToStaticMarkup(<Frame className="p-0">x</Frame>)
    expect(classOf(html, 'section')).toContain('p-0')
    expect(classOf(html, 'section')).not.toMatch(/\bp-4\b/)
  })

  it('Button: platform variants, 44 px pill, focus ring, press and hover-capable hover', () => {
    const primary = buttonClasses({ variant: 'primary' })
    expect(primary).toMatch(/\bbg-lime-500\b/)
    expect(primary).toContain('can-hover:bg-lime-600')
    // R13: press is one step past hover, on its own variant so it wins over hover.
    expect(primary).toContain('press:bg-lime-700')
    expect(primary).toMatch(/\bh-11\b/)
    expect(primary).toMatch(/\brounded-full\b/)
    expect(primary).toContain(focusRing)
    expect(primary).not.toMatch(/(^|\s)hover:/)
    const secondary = buttonClasses({ variant: 'secondary' })
    // The platform outline variant (WS1 ruling 1).
    expect(secondary).toContain('ring-white/10')
    expect(secondary).not.toMatch(/(^| )bg-/)
    expect(secondary).toContain('can-hover:bg-white/5')
    expect(secondary).toContain('press:bg-white/10')
    // R4: the text button is muted (Skip), never lime.
    expect(buttonClasses({ variant: 'text' })).toContain('text-zinc-400')
    expect(buttonClasses({ variant: 'text' })).not.toMatch(/(^| )text-lime/)
    expect(buttonClasses({ size: 'icon' })).toMatch(/\bw-11\b/)
  })

  it('Button: unavailable is aria-disabled (never disabled), faded, without hover or press', () => {
    const html = renderToStaticMarkup(<Button unavailable>Next</Button>)
    expect(html).toContain('aria-disabled="true"')
    expect(html).not.toMatch(/\sdisabled=/)
    const cls = classOf(html, 'button')
    expect(cls).toContain('opacity-50')
    expect(cls).not.toContain('can-hover:')
    expect(cls).not.toContain('active:')
    expect(cls).not.toContain('press:')
  })

  it('Button: waiting is aria-disabled and inert but not faded (R4)', () => {
    const html = renderToStaticMarkup(
      <Button waiting variant="secondary">
        Next
      </Button>,
    )
    expect(html).toContain('aria-disabled="true"')
    const cls = classOf(html, 'button')
    expect(cls).not.toContain('opacity-50')
    expect(cls).not.toContain('can-hover:')
    expect(cls).toContain('ring-white/10')
  })

  it('Button: a className override wins (drift D08)', () => {
    const cls = classOf(renderToStaticMarkup(<Button className="px-0 text-xs">x</Button>), 'button')
    expect(cls).toMatch(/\bpx-0\b/)
    expect(cls).toMatch(/\btext-xs\b/)
    expect(cls).not.toMatch(/\bpx-4\b|\btext-sm\b/)
  })

  it('SegmentedControl: a radiogroup with one tab stop, 44 px targets, no weight jump', () => {
    const html = renderToStaticMarkup(
      <SegmentedControl
        label="Example"
        options={[
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ]}
        value={1}
        onChange={() => {}}
      />,
    )
    expect(html).toContain('role="radiogroup"')
    expect(html).toContain('aria-label="Example"')
    expect(html.match(/role="radio"/g)).toHaveLength(2)
    expect(html.match(/tabindex="0"/g)).toHaveLength(1)
    expect(html).toMatch(/aria-checked="true"[^>]*tabindex="0"/)
    expect(html).toContain('h-11')
    expect(html).toContain('bg-zinc-600 text-zinc-200')
    expect(html).not.toContain('font-semibold')
  })

  it('SegmentedControl: four or more options fall back to a native select', () => {
    const options = ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id }))
    const html = renderToStaticMarkup(<SegmentedControl label="x" options={options} value={0} onChange={() => {}} />)
    expect(html).toContain('<select')
    expect(html).not.toContain('role="radiogroup"')
  })

  it('SegmentedControl: maxSegments keeps four options as segments where they fit, with per-option and select attributes', () => {
    const options = ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id }))
    const html = renderToStaticMarkup(
      <SegmentedControl
        label="x"
        options={options}
        value={0}
        onChange={() => {}}
        maxSegments={4}
        optionProps={(o) => ({ 'data-viz-focus': `action-${o.id}` })}
        selectProps={{ 'data-viz-part': 'segments-select' }}
      />,
    )
    expect(html.match(/role="radio"/g)).toHaveLength(4)
    expect(html).toContain('data-viz-focus="action-d"')
    expect(html).toContain('data-viz-part="segments-select"')
    expect(html).toContain('@container (min-width:')
  })

  it('SegmentedControl: segments wider than their room fall back to a select, by container query in rem (A2)', () => {
    const options = [
      { id: 'a', label: 'Basics' },
      { id: 'b', label: 'Drain' },
    ]
    const html = renderToStaticMarkup(<SegmentedControl label="x" options={options} value={0} onChange={() => {}} />)
    const fit = segmentedWidth(options.map((o) => o.label)) / 16
    expect(html).toContain('role="radiogroup"')
    expect(html).toContain('<select')
    expect(html).toContain('container-type:inline-size')
    expect(html).toContain(`@container (min-width:${fit}rem)`)
    expect(html).toContain(`@container (max-width:${fit - 0.001}rem)`)
  })

  it('ChoiceRow: number slot, then ✓ or × in the same slot; never amber', () => {
    const ask = renderToStaticMarkup(<ChoiceRow index={1} label="B" tag="last time" />)
    expect(ask).toContain('role="radio"')
    expect(ask).toContain('data-choice-slot="key"')
    expect(ask).toMatch(/>2</)
    expect(ask).toContain('last time')
    const right = renderToStaticMarkup(<ChoiceRow index={0} label="A" state="resolved" picked mark="right" />)
    expect(right).toContain('data-choice-slot="right"')
    expect(right).toContain('✓')
    expect(right).toContain('aria-checked="true"')
    expect(right).toContain('aria-disabled="true"')
    expect(right).not.toContain('opacity-50')
    const wrong = renderToStaticMarkup(<ChoiceRow index={0} label="A" state="resolved" picked mark="wrong" />)
    expect(wrong).toContain('×')
    for (const html of [ask, right, wrong]) expect(html).not.toMatch(/amber/)
    expect(ask).toMatch(/rounded-lg/)
    expect(ask).toMatch(/\bh-11\b/)
  })

  it('Disclosure: a native details with a 44 px summary and a rotating chevron', () => {
    const html = renderToStaticMarkup(
      <Disclosure summary="Steps as text" summaryProps={{ 'data-viz-focus': 'text-alternative' }}>
        body
      </Disclosure>,
    )
    expect(html).toContain('<details')
    expect(html).toContain('data-viz-focus="text-alternative"')
    expect(classOf(html, 'summary')).toMatch(/\bh-11\b/)
    expect(html).toContain('group-open:rotate-180')
    expect(html).not.toMatch(/amber/)
  })

  it('Tag: in flow, never positioned on a border', () => {
    const html = renderToStaticMarkup(<Tag tone="removed">unmounted</Tag>)
    expect(html).not.toMatch(/absolute|-top-/)
    expect(html).toContain('text-rose-400')
  })

  it('Caption: UI type, 14/24 zinc-300 with pretty wrapping (R3)', () => {
    const html = renderToStaticMarkup(<Caption as="figcaption">why</Caption>)
    const cls = classOf(html, 'figcaption')
    for (const c of ['text-sm', 'leading-6', 'text-zinc-300', 'text-pretty']) expect(cls).toContain(c)
    expect(cls).not.toContain('leading-7')
  })

  it('Provenance: one wording template for every visual', () => {
    expect(provenanceText(['Node 24.x'])).toBe('Recorded from a real run in Node 24.x')
    expect(provenanceText(['React 18.3.1', '19.3.1'])).toBe('Recorded from real runs in React 18.3.1 and 19.3.1')
    expect(renderToStaticMarkup(<Provenance runtimes={['Node 24.x']} />)).toContain('text-2xs')
  })
})
