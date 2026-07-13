import { useState } from 'react'

export default function KeepAliveWorkspace({ active, children }) {
  const [hasBeenActive, setHasBeenActive] = useState(active)

  if (active && !hasBeenActive) setHasBeenActive(true)

  if (!active && !hasBeenActive) return null

  return (
    <div hidden={!active} style={{ display: active ? 'contents' : 'none' }}>
      {children}
    </div>
  )
}
