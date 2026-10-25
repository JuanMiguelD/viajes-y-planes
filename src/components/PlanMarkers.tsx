import { useEffect, useMemo, useState } from 'react'
import { Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Plan } from '../types'
import { planIcon } from './map'

/** Distancia en píxeles por debajo de la cual dos marcadores se agrupan. */
const RADIUS = 34

interface Cluster {
  plans: Plan[]
  lat: number
  lng: number
}

function clusterIcon(plans: Plan[]): L.DivIcon {
  const done = plans.filter((p) => p.status === 'realizado').length
  const pct = Math.round((done / plans.length) * 100)
  return L.divIcon({
    className: 'pin-host',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    // El anillo muestra la proporción de planes hechos en el grupo
    html: `<div class="pin-cluster" style="--done:${pct}%"><span>${plans.length}</span></div>`,
  })
}

/** Marcadores de planes, agrupando los que se solapan al nivel de zoom actual. */
export function PlanMarkers({
  plans,
  selectedId,
  onSelect,
}: {
  plans: Plan[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom())
    map.on('zoomend', onZoom)
    return () => {
      map.off('zoomend', onZoom)
    }
  }, [map])

  const clusters = useMemo(() => {
    const result: (Cluster & { x: number; y: number })[] = []
    for (const plan of plans) {
      const { x, y } = map.project([plan.place!.lat, plan.place!.lng], zoom)
      const near = plan.id === selectedId ? undefined : result.find((c) => Math.hypot(c.x - x, c.y - y) < RADIUS)
      if (near && !near.plans.some((p) => p.id === selectedId)) {
        near.plans.push(plan)
        near.lat = near.plans.reduce((s, p) => s + p.place!.lat, 0) / near.plans.length
        near.lng = near.plans.reduce((s, p) => s + p.place!.lng, 0) / near.plans.length
      } else {
        result.push({ plans: [plan], lat: plan.place!.lat, lng: plan.place!.lng, x, y })
      }
    }
    return result
  }, [plans, zoom, map, selectedId])

  return clusters.map((c) =>
    c.plans.length === 1 ? (
      <Marker
        key={c.plans[0].id}
        position={[c.lat, c.lng]}
        icon={planIcon(c.plans[0], c.plans[0].id === selectedId)}
        title={c.plans[0].title}
        zIndexOffset={c.plans[0].id === selectedId ? 1000 : c.plans[0].status === 'pendiente' ? 100 : 0}
        eventHandlers={{ click: () => onSelect(c.plans[0].id) }}
      />
    ) : (
      <Marker
        key={c.plans.map((p) => p.id).join()}
        position={[c.lat, c.lng]}
        icon={clusterIcon(c.plans)}
        title={c.plans.map((p) => p.title).join(', ')}
        zIndexOffset={200}
        eventHandlers={{
          click: () =>
            map.flyToBounds(L.latLngBounds(c.plans.map((p) => [p.place!.lat, p.place!.lng])), {
              padding: [80, 80],
              maxZoom: 17,
              duration: 0.6,
            }),
        }}
      />
    ),
  )
}
