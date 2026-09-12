import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CodeGroup } from './Code'

function Panel({ code }: { language: string; code: string }) {
  return <code>{code}</code>
}

describe('CodeGroup labels', () => {
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
