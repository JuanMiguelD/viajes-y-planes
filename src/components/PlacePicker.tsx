import { useEffect, useState } from 'react'
import { Map as GoogleMap, Marker, useMap } from '@vis.gl/react-google-maps'
import { Search, X } from 'lucide-react'
import { mapsEnabled } from '../maps'
import type { Category, Place, Tag } from '../types'
import { DEFAULT_CENTER, planIcon } from './map'
import { MAP_BASE_PROPS, useShowZoomControl } from './mapStyle'

interface SearchResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

function FlyTo({ place }: { place: Place | null }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !place) return
    map.panTo({ lat: place.lat, lng: place.lng })
    if ((map.getZoom() ?? 0) < 14) map.setZoom(14)
  }, [map, place])
  return null
}

/** Buscador (OpenStreetMap Nominatim) + clic en el mapa para fijar el lugar de un plan. */
export function PlacePicker({
  value,
  category,
  tag,
  onChange,
}: {
  value: Place | null
  category: Category
  tag: Tag | null
  onChange: (place: Place | null) => void
}) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [failed, setFailed] = useState(false)
  const [focus, setFocus] = useState<Place | null>(null)
  const showZoomControl = useShowZoomControl()

  const runSearch = async () => {
    if (!search.trim()) return
    setSearching(true)
    setFailed(false)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=es&q=${encodeURIComponent(search)}`,
      )
      setResults(await res.json())
    } catch {
      setFailed(true)
    } finally {
      setSearching(false)
    }
  }

  const choose = (r: SearchResult) => {
    const place = { name: r.display_name.split(',').slice(0, 2).join(',').trim(), lat: Number(r.lat), lng: Number(r.lon) }
    onChange(place)
    setFocus(place)
    setResults(null)
    setSearch('')
  }

  return (
    <div className="place-picker">
      <div className="search-field">
        <Search size={16} strokeWidth={1.75} aria-hidden />
        <input
          value={search}
          placeholder="Buscar un lugar, una calle, una ciudad…"
          aria-label="Buscar lugar"
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              runSearch()
            }
          }}
        />
        <button type="button" className="text-btn" onClick={runSearch} disabled={searching || !search.trim()}>
          {searching ? 'Buscando…' : 'Buscar'}
        </button>
      </div>
      {failed && <p className="field-error">No se pudo buscar. Revisa la conexión o marca el lugar en el mapa.</p>}
      {results && (
        <ul className="search-results">
          {results.length === 0 && <li className="search-empty">Sin resultados para "{search}". Prueba con otro nombre.</li>}
          {results.map((r) => (
            <li key={r.place_id}>
              <button type="button" onClick={() => choose(r)}>
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {mapsEnabled ? (
        <GoogleMap
          {...MAP_BASE_PROPS}
          className="picker-map"
          defaultCenter={value ? { lat: value.lat, lng: value.lng } : DEFAULT_CENTER}
          defaultZoom={value ? 14 : 3}
          gestureHandling="greedy"
          zoomControl={showZoomControl}
          onClick={(e) => {
            if (!e.detail.latLng) return
            onChange({ name: value?.name || 'Lugar marcado en el mapa', lat: e.detail.latLng.lat, lng: e.detail.latLng.lng })
          }}
        >
          <FlyTo place={focus} />
          {value && (
            <Marker
              position={{ lat: value.lat, lng: value.lng }}
              icon={planIcon({ category, status: 'pendiente', deadline: null, tag }, true)}
            />
          )}
        </GoogleMap>
      ) : (
        <p className="map-missing-key">
          Falta configurar la API key de Google Maps para ver el mapa. Mientras tanto puedes buscar el lugar arriba y
          elegirlo de los resultados.
        </p>
      )}
      {value ? (
        <div className="place-name">
          <input value={value.name} aria-label="Nombre del lugar" onChange={(e) => onChange({ ...value, name: e.target.value })} />
          <button type="button" className="icon-btn" onClick={() => onChange(null)} aria-label="Quitar lugar">
            <X size={16} />
          </button>
        </div>
      ) : (
        <p className="field-hint">
          {mapsEnabled ? 'También puedes tocar el mapa para marcar el lugar.' : 'Elige un resultado de la búsqueda para marcar el lugar.'}
        </p>
      )}
    </div>
  )
}
