import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CodePane, HANG, NARROW_CODE_COLS, codeRows, wrappedRows } from './CodePane'

describe('CodePane soft wrap (A4)', () => {
  it('a line that fits is one row', () => {
    expect(wrappedRows('x'.repeat(30), 30)).toBe(1)
    expect(wrappedRows('', 30)).toBe(1)
  })

  it('continuation rows hang past the line indent', () => {
    // 30 columns, no indent: continuation rows hold 30 - HANG.
    expect(wrappedRows('x'.repeat(31), 30)).toBe(2)
    expect(wrappedRows('x'.repeat(30 + 2 * (30 - HANG)), 30)).toBe(3)
    // Indent 4: continuation rows hold 30 - 4 - HANG.
    const line = '    ' + 'x'.repeat(26 + 24)
    expect(wrappedRows(line, 30)).toBe(2)
    expect(wrappedRows(line + 'x', 30)).toBe(3)
  })

  it('wide characters count by their advance', () => {
    // CJK is 1 em, about 1.64 mono columns: 18 fit in 30, 20 do not.
    expect(wrappedRows('漢'.repeat(18), 30)).toBe(1)
    expect(wrappedRows('漢'.repeat(20), 30)).toBe(2)
  })

  it('a listing counts every visual row; the narrow slot is the lint width', () => {
    expect(codeRows(['a', 'x'.repeat(NARROW_CODE_COLS + 1)], NARROW_CODE_COLS)).toBe(3)
    expect(NARROW_CODE_COLS).toBeGreaterThanOrEqual(35)
  })

  it('renders wrapping code with a hanging indent and a whole-row window', () => {
    const html = renderToStaticMarkup(
      <CodePane lines={['  const a = 1', 'b()']} line={1} anchor={1} rows={{ narrow: 5, wide: 2 }} animate={false} />,
    )
    expect(html).toContain('whitespace-pre-wrap')
    expect(html).toContain('--vz-hang:4ch')
    expect(html).toContain('--vz-h-n:7.5rem')
  })
})
