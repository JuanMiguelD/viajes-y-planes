import { useEffect, useMemo, useState } from 'react'
import { Map as GoogleMap, useMap } from '@vis.gl/react-google-maps'
import { Check, MapPin, X } from 'lucide-react'
import { usePlanActions } from '../actions'
import { CategoryIcon } from '../components/CategoryIcon'
import { DEFAULT_CENTER } from '../components/map'
import { MAP_BASE_PROPS, useShowZoomControl } from '../components/mapStyle'
import { PlanMarkers } from '../components/PlanMarkers'
import { TagIcon } from '../components/TagIcon'
import { mapsEnabled } from '../maps'
import { usePlans } from '../store'
import { CATEGORY_LABEL, TAG_LABEL, type Plan, type Tag } from '../types'
import { longDate, plural } from '../utils'

type Filter = 'todos' | 'realizado' | 'pendiente'

/** Encuadra los planes visibles al cambiar el filtro, o vuela al plan enfocado. */
function Camera({ plans, focus }: { plans: Plan[]; focus: Plan | null }) {
  const map = useMap()
  const key = plans.map((p) => p.id).join()
  useEffect(() => {
    if (!map) return
    if (focus?.place) {
      map.panTo({ lat: focus.place.lat, lng: focus.place.lng })
      if ((map.getZoom() ?? 0) < 14) map.setZoom(14)
      return
    }
    const points = plans.map((p) => ({ lat: p.place!.lat, lng: p.place!.lng }))
    if (points.length === 1) {
      map.setCenter(points[0])
      map.setZoom(13)
    } else if (points.length > 1) {
      const bounds = new google.maps.LatLngBounds()
      for (const p of points) bounds.extend(p)
      map.fitBounds(bounds, 64)
      google.maps.event.addListenerOnce(map, 'idle', () => {
        if ((map.getZoom() ?? 0) > 14) map.setZoom(14)
      })
    }
    // Solo reencuadrar cuando cambia el conjunto visible o el foco, no en cada cambio de estado
  }, [map, key, focus?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

function SelectedPanel({ plan, onOpen, onClose }: { plan: Plan; onOpen: (id: string) => void; onClose: () => void }) {
  const { toggleDone } = usePlanActions()
  const done = plan.status === 'realizado'
  return (
    <aside className="map-panel" aria-label={plan.title}>
      {plan.cover && <img className="map-panel-photo" src={plan.cover.url} alt="" />}
      <button className={`sheet-close ${plan.cover ? 'on-media' : ''}`} onClick={onClose} aria-label="Cerrar">
        <X size={18} />
      </button>
      <div className="map-panel-body">
        <p className="detail-category">
          <CategoryIcon category={plan.category} />
          {CATEGORY_LABEL[plan.category]}
          {plan.tag && (
            <>
              {' · '}
              <TagIcon tag={plan.tag} size={14} />
              {TAG_LABEL[plan.tag]}
            </>
          )}
        </p>
        <h2 className="map-panel-title">{plan.title}</h2>
        <p className="map-panel-place">
          <MapPin size={14} strokeWidth={1.75} aria-hidden />
          {plan.place!.name}
        </p>
        <p className={`map-panel-state ${done ? 'state-done' : ''}`}>
          {done ? (
            <>
              <Check size={14} strokeWidth={2.5} aria-hidden />
              Lo hicimos{plan.completedAt && ` el ${longDate(plan.completedAt)}`}
              {plan.photoCount > 0 && `, ${plural(plan.photoCount, 'foto', 'fotos')}`}
            </>
          ) : (
            'Pendiente'
          )}
        </p>
        <div className="map-panel-actions">
          <button className="btn btn-primary" onClick={() => onOpen(plan.id)}>
            {done ? 'Ver plan y fotos' : 'Ver plan'}
          </button>
          {!done && (
            <button className="btn btn-secondary" onClick={() => toggleDone(plan)}>
              <Check size={16} strokeWidth={2.2} aria-hidden />
              ¡Lo hicimos!
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

export function MapView({
  focusId,
  onOpen,
  onCreate,
}: {
  focusId: string | null
  onOpen: (id: string) => void
  onCreate: () => void
}) {
  const { plans, getPlan } = usePlans()
  const [filter, setFilter] = useState<Filter>('todos')
  const [tagFilter, setTagFilter] = useState<Set<Tag>>(() => new Set())
  const [selectedId, setSelectedId] = useState<string | null>(focusId)
  const [prevFocus, setPrevFocus] = useState(focusId)
  const showZoomControl = useShowZoomControl()
  if (focusId !== prevFocus) {
    setPrevFocus(focusId)
    setSelectedId(focusId)
  }

  const located = useMemo(() => plans.filter((p) => p.place), [plans])
  const visible = located.filter((p) => filter === 'todos' || p.status === filter).filter((p) => tagFilter.size === 0 || (p.tag && tagFilter.has(p.tag)))
  const doneCount = located.filter((p) => p.status === 'realizado').length
  const tagCounts = useMemo(() => {
    const counts = new Map<Tag, number>()
    for (const p of located) if (p.tag) counts.set(p.tag, (counts.get(p.tag) ?? 0) + 1)
    return counts
  }, [located])
  const selected = selectedId ? (getPlan(selectedId) ?? null) : null
  const focus = focusId ? (getPlan(focusId) ?? null) : null

  const toggleTag = (tag: Tag) =>
    setTagFilter((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })

  return (
    <div className="map-view">
      {mapsEnabled ? (
        <GoogleMap {...MAP_BASE_PROPS} className="map" defaultCenter={DEFAULT_CENTER} defaultZoom={3} gestureHandling="greedy" zoomControl={showZoomControl}>
          <Camera plans={visible} focus={focus} />
          <PlanMarkers plans={visible} selectedId={selectedId} onSelect={setSelectedId} />
        </GoogleMap>
      ) : (
        <div className="map-missing-key map-missing-key-full">
          Falta configurar la API key de Google Maps (variable <code>VITE_GOOGLE_MAPS_API_KEY</code>) para ver el mapa.
        </div>
      )}

      <div className="map-controls">
        <div className="filter filter-solid" role="tablist" aria-label="Mostrar">
          {(
            [
              ['todos', 'Todos', located.length],
              ['realizado', 'Cumplidos', doneCount],
              ['pendiente', 'Pendientes', located.length - doneCount],
            ] as [Filter, string, number][]
          ).map(([f, label, n]) => (
            <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>
              {label}
              <span className="filter-count">{n}</span>
            </button>
          ))}
        </div>
        {tagCounts.size > 0 && (
          <div className="filter filter-solid filter-tags" role="group" aria-label="Filtrar por tipo de lugar">
            {[...tagCounts.entries()].map(([tag, n]) => (
              <button key={tag} aria-pressed={tagFilter.has(tag)} onClick={() => toggleTag(tag)}>
                <TagIcon tag={tag} size={13} />
                {TAG_LABEL[tag]}
                <span className="filter-count">{n}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected?.place ? (
        <SelectedPanel plan={selected} onOpen={onOpen} onClose={() => setSelectedId(null)} />
      ) : (
        <div className="map-legend" aria-label="Leyenda">
          <span>
            <i className="pin pin-done pin-mini" /> Cumplido
          </span>
          <span>
            <i className="pin pin-pending pin-mini" /> Pendiente
          </span>
          <span>
            <i className="pin pin-pending pin-urgent pin-mini" /> Fecha cerca
          </span>
        </div>
      )}

      {located.length === 0 && (
        <div className="map-empty">
          <p>Aquí aparecen los lugares de nuestros planes: llenos los que ya cumplimos, vacíos los que nos faltan.</p>
          <button className="btn btn-primary" onClick={onCreate}>
            Agregar un plan con lugar
          </button>
        </div>
      )}
    </div>
  )
}
