import { useEffect, useMemo, useState } from 'react'
import { Marker, useMap } from '@vis.gl/react-google-maps'
import type { Plan } from '../types'
import { clusterIcon, planIcon, project } from './map'

/** Distancia en píxeles por debajo de la cual dos marcadores se agrupan. */
const RADIUS = 34

interface Cluster {
  plans: Plan[]
  lat: number
  lng: number
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
  const [zoom, setZoom] = useState(3)

  useEffect(() => {
    if (!map) return
    setZoom(map.getZoom() ?? 3)
    const listener = map.addListener('zoom_changed', () => setZoom(map.getZoom() ?? 3))
    return () => listener.remove()
  }, [map])

  const clusters = useMemo(() => {
    const result: (Cluster & { x: number; y: number })[] = []
    for (const plan of plans) {
      const { x, y } = project(plan.place!.lat, plan.place!.lng, zoom)
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
  }, [plans, zoom, selectedId])

  if (!map) return null

  return clusters.map((c) =>
    c.plans.length === 1 ? (
      <Marker
        key={c.plans[0].id}
        position={{ lat: c.lat, lng: c.lng }}
        icon={planIcon(c.plans[0], c.plans[0].id === selectedId)}
        title={c.plans[0].title}
        zIndex={c.plans[0].id === selectedId ? 1000 : c.plans[0].status === 'pendiente' ? 100 : 0}
        onClick={() => onSelect(c.plans[0].id)}
      />
    ) : (
      <Marker
        key={c.plans.map((p) => p.id).join()}
        position={{ lat: c.lat, lng: c.lng }}
        icon={clusterIcon(c.plans)}
        title={c.plans.map((p) => p.title).join(', ')}
        zIndex={200}
        onClick={() => {
          const bounds = new google.maps.LatLngBounds()
          for (const p of c.plans) bounds.extend({ lat: p.place!.lat, lng: p.place!.lng })
          map.fitBounds(bounds, 80)
          google.maps.event.addListenerOnce(map, 'idle', () => {
            if ((map.getZoom() ?? 0) > 17) map.setZoom(17)
          })
        }}
      />
    ),
  )
}
