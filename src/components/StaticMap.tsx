import { Map as GoogleMap, Marker } from '@vis.gl/react-google-maps'
import { mapsEnabled } from '../maps'
import type { Plan } from '../types'
import { planIcon } from './map'
import { MAP_BASE_PROPS } from './mapStyle'

/** Mapa no interactivo del lugar de un plan, para la cabecera de su ficha. */
export function StaticMap({ plan, className }: { plan: Plan; className?: string }) {
  const { lat, lng } = plan.place!
  if (!mapsEnabled) return null
  return (
    <GoogleMap
      {...MAP_BASE_PROPS}
      className={className}
      defaultCenter={{ lat, lng }}
      defaultZoom={14}
      gestureHandling="none"
      draggable={false}
      disableDoubleClickZoom
      scrollwheel={false}
      zoomControl={false}
      keyboardShortcuts={false}
    >
      <Marker position={{ lat, lng }} icon={planIcon(plan)} clickable={false} />
    </GoogleMap>
  )
}
