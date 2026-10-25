import { MapContainer, Marker } from 'react-leaflet'
import { BaseMap } from './BaseMap'
import type { Plan } from '../types'
import { planIcon } from './map'

/** Mapa no interactivo del lugar de un plan, para la cabecera de su ficha. */
export function StaticMap({ plan, className }: { plan: Plan; className?: string }) {
  const { lat, lng } = plan.place!
  return (
    <MapContainer
      className={className}
      center={[lat, lng]}
      zoom={14}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      keyboard={false}
      attributionControl={false}
    >
      <BaseMap />
      <Marker position={[lat, lng]} icon={planIcon(plan)} interactive={false} />
    </MapContainer>
  )
}
