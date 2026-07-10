import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import DateNavigator from '../DateNavigator'

describe('DateNavigator', () => {
  afterEach(cleanup)

  it('can render date controls without the service-list refresh action', () => {
    render(<DateNavigator date="2026-07-10" onDateChange={vi.fn()} showRefresh={false} />)

    expect(screen.getByLabelText('Selecionar data')).toHaveValue('2026-07-10')
    expect(screen.queryByRole('button', { name: /Atualizar lista/ })).not.toBeInTheDocument()
  })
})
