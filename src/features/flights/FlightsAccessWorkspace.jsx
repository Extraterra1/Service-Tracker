import CurrentFlightsWorkspace from './CurrentFlightsWorkspace'
import FlightsComingSoonWorkspace from './FlightsComingSoonWorkspace'

export default function FlightsAccessWorkspace({ canManageAccess = false, ...currentFlightsProps }) {
  if (!canManageAccess) return <FlightsComingSoonWorkspace />
  return <CurrentFlightsWorkspace {...currentFlightsProps} />
}
