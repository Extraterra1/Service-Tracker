import '@fontsource-variable/nunito/wght.css'

import TvOperationsBoard from './TvOperationsBoard'
import { useTvFlightData } from './useTvFlightData'

export default function TvWorkspace({ selectedDate, serviceData, statusMap, loading, serviceDataReady, userUid }) {
  const { results } = useTvFlightData({
    selectedDate,
    deliveries: serviceData?.pickups ?? [],
    serviceDataReady,
    userUid,
  })

  return (
    <TvOperationsBoard
      serviceData={serviceData}
      statusMap={statusMap}
      flightResults={results}
      loading={loading}
    />
  )
}
