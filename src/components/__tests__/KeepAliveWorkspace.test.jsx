import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { useEffect, useState } from 'react'
import KeepAliveWorkspace from '../KeepAliveWorkspace'

afterEach(cleanup)

it('preserves child state and mount effects after switching away and back', async () => {
  const user = userEvent.setup()
  const fetchWorkspace = vi.fn()

  function StatefulWorkspace() {
    const [query, setQuery] = useState('')

    useEffect(() => {
      fetchWorkspace()
    }, [])

    return <input aria-label="Search" value={query} onChange={(event) => setQuery(event.target.value)} />
  }

  const { rerender } = render(
    <KeepAliveWorkspace active={false}>
      <StatefulWorkspace />
    </KeepAliveWorkspace>,
  )

  expect(screen.queryByRole('textbox', { name: 'Search' })).not.toBeInTheDocument()
  expect(fetchWorkspace).not.toHaveBeenCalled()

  rerender(
    <KeepAliveWorkspace active>
      <StatefulWorkspace />
    </KeepAliveWorkspace>,
  )
  const search = await screen.findByRole('textbox', { name: 'Search' })
  await user.type(search, 'Maria')
  expect(fetchWorkspace).toHaveBeenCalledTimes(1)

  rerender(
    <KeepAliveWorkspace active={false}>
      <StatefulWorkspace />
    </KeepAliveWorkspace>,
  )
  expect(search.closest('[hidden]')).not.toBeNull()

  rerender(
    <KeepAliveWorkspace active>
      <StatefulWorkspace />
    </KeepAliveWorkspace>,
  )
  expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue('Maria')
  expect(fetchWorkspace).toHaveBeenCalledTimes(1)
})
