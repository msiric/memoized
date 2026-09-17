import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CodeGroup } from './Code'

function Panel({ code }: { language: string; code: string }) {
  return <code>{code}</code>
}

describe('CodeGroup labels', () => {
  beforeEach(() => { vi.spyOn(window, 'scrollBy').mockImplementation(() => {}) })
  afterEach(() => { cleanup(); vi.restoreAllMocks() })
  it('keeps JSX and TSX alternatives separately reachable instead of two Code tabs', async () => {
    render(
      <CodeGroup title="">
        <Panel language="jsx" code="JSX starter" />
        <Panel language="tsx" code="TSX starter" />
      </CodeGroup>,
    )
    const js = screen.getByRole('tab', { name: 'JavaScript (JSX)' })
    const ts = screen.getByRole('tab', { name: 'TypeScript (TSX)' })
    fireEvent.click(ts)
    await waitFor(() => expect(screen.getByRole('tabpanel')).toHaveTextContent('TSX starter'))
    fireEvent.click(js)
    await waitFor(() => expect(screen.getByRole('tabpanel')).toHaveTextContent('JSX starter'))
  })

  it('keeps both distinct JS/TS panels reachable with the shared label helper', async () => {
    render(
      <CodeGroup title="">
        <Panel language="javascript" code="JavaScript example" />
        <Panel language="typescript" code="TypeScript example" />
      </CodeGroup>,
    )
    const js = screen.getByRole('tab', { name: /^JavaScript$/ })
    const ts = screen.getByRole('tab', { name: /^TypeScript$/ })
    fireEvent.click(js)
    await waitFor(() => expect(js).toHaveAttribute('aria-selected', 'true'))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('JavaScript example')
    fireEvent.click(ts)
    await waitFor(() => expect(ts).toHaveAttribute('aria-selected', 'true'))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('TypeScript example')
  })
})
