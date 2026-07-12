import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import DateNavigator from '../DateNavigator'

describe('DateNavigator', () => {
  afterEach(cleanup)

  it('can render date controls without the service-list refresh action', () => {
    render(<DateNavigator date="2026-07-10" onDateChange={vi.fn()} showRefresh={false} />)

    expect(screen.getByLabelText('Selecionar data')).toHaveValue('2026-07-10')
    expect(screen.queryByRole('button', { name: /Atualizar lista/ })).not.toBeInTheDocument()
  })

  it('enforces a future-only boundary with a Próximos preset', async () => {
    const user = userEvent.setup()
    const onDateChange = vi.fn()
    const { rerender } = render(
      <DateNavigator
        date="2026-07-13"
        onDateChange={onDateChange}
        minimumDate="2026-07-13"
        presetDate="2026-07-13"
        presetLabel="Próximos"
        showRefresh={false}
      />,
    )

    expect(screen.getByLabelText('Selecionar data')).toHaveAttribute('min', '2026-07-13')
    expect(screen.getByRole('button', { name: 'Dia anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Próximos' })).toBeInTheDocument()

    rerender(
      <DateNavigator
        date="2026-07-15"
        onDateChange={onDateChange}
        minimumDate="2026-07-13"
        presetDate="2026-07-13"
        presetLabel="Próximos"
        showRefresh={false}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Próximos' }))
    expect(onDateChange).toHaveBeenLastCalledWith('2026-07-13')

    fireEvent.change(screen.getByLabelText('Selecionar data'), { target: { value: '2026-07-12' } })
    expect(onDateChange).toHaveBeenLastCalledWith('2026-07-13')
  })
})
