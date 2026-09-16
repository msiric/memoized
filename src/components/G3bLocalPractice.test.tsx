import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { G3B_TASK } from '@/lib/g3b-task'
import { G3B_LOCAL_STARTERS } from '@/lib/g3b-local-practice'
import { G3bLocalPractice } from './G3bLocalPractice'

afterEach(cleanup)

describe('free local G3B setup', () => {
  it('offers an optional unimplemented starter and commands without executing or revealing a solution', async () => {
    render(<G3bLocalPractice problem={G3B_TASK} />)
    const summary = screen.getByText('Starter and local commands')
    const details = summary.closest('details')!
    expect(details).not.toHaveAttribute('open')
    fireEvent.click(summary)
    details.open = true
    expect(screen.getByText(/This task has no in-site editor, Run button or automatic judge/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^(Run|Submit)$/ })).not.toBeInTheDocument()
    const starter = screen.getByRole('region', { name: 'Starter code' })
    const commands = screen.getByRole('region', { name: 'Local commands' })
    for (const language of ['JavaScript', 'TypeScript']) {
      fireEvent.click(within(starter).getByRole('tab', { name: language }))
      const source = G3B_LOCAL_STARTERS[language === 'JavaScript' ? 0 : 1]
      await waitFor(() => expect(within(starter).getByRole('tabpanel').querySelector('code')?.textContent).toBe(source.code))
      expect(within(commands).getByRole('tabpanel').querySelector('code')?.textContent).toBe(source.commands)
      expect(within(starter).getByRole('tabpanel').querySelector('code')).toHaveAttribute('tabindex', '0')
    }
  })

  it.each([
    { type: 'CODING', href: '', contentId: '/another/task' },
    { type: 'CODING', href: '' },
    { ...G3B_TASK, href: 'https://leetcode.com/problems/example' },
    { ...G3B_TASK, type: 'THEORY' },
  ])('never attaches this function to another or non-native task', problem => {
    const { container } = render(<G3bLocalPractice problem={problem} />)
    expect(container).toBeEmptyDOMElement()
  })
})
