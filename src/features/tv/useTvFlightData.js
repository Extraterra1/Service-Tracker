import { useCurrentFlightData } from '../flights/useCurrentFlightData'

export function useTvFlightData({ selectedDate, deliveries = [], serviceDataReady = false, userUid = '' }) {
  const { results, refreshing, refreshFlights } = useCurrentFlightData({
    selectedDate,
    serviceItems: deliveries,
    serviceDataReady,
    userUid,
  })

  return { results, refreshing, refresh: refreshFlights }
}
