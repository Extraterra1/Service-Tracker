import { CalendarDays, Map, Plane } from 'lucide-react'
import { getPrimaryTabId } from '../lib/workspaceNavigation'
import { TabBar } from './TabBar/TabBar'

const PRIMARY_TABS = [
  { id: 'map', label: 'Mapa', icon: Map },
  { id: 'flights', label: 'Voos', icon: Plane },
  { id: 'reservations', label: 'Reservas', icon: CalendarDays },
]

const TAB_WORKSPACES = {
  map: 'services',
  flights: 'flights',
  reservations: 'reservations',
}

export default function AppTabBar({ activeWorkspace, onWorkspaceChange }) {
  return (
    <TabBar
      tabs={PRIMARY_TABS}
      activeTabId={getPrimaryTabId(activeWorkspace)}
      onChange={(tabId) => onWorkspaceChange(TAB_WORKSPACES[tabId])}
    />
  )
}
