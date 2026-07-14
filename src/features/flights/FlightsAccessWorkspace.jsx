import CurrentFlightsWorkspace from './CurrentFlightsWorkspace'
import FlightsComingSoonWorkspace from './FlightsComingSoonWorkspace'

export default function FlightsAccessWorkspace({ canViewLiveFlights = false, ...currentFlightsProps }) {
  if (!canViewLiveFlights) return <FlightsComingSoonWorkspace />
  return <CurrentFlightsWorkspace {...currentFlightsProps} />
}
