import { useEffect, useRef, useState } from 'react'
import { Map as GoogleMap, Marker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import { ExternalLink, Loader2, MapPin, Search, X } from 'lucide-react'
import { mapsEnabled } from '../maps'
import {
  googleMapsUrl,
  placeFromId,
  placeFromPoint,
  placeFromSuggestion,
  searchOpenStreetMap,
  suggestPlaces,
} from '../places'
import type { Category, Place, Tag } from '../types'
import { DEFAULT_CENTER, planIcon } from './map'
import { MAP_BASE_PROPS, useShowZoomControl } from './mapStyle'

const MAP_ID = 'picker-map'

interface Option {
  id: string
  main: string
  secondary: string
  pick: () => Promise<Place>
}

function FlyTo({ place }: { place: Place | null }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !place) return
    map.panTo({ lat: place.lat, lng: place.lng })
    if ((map.getZoom() ?? 0) < 16) map.setZoom(16)
  }, [map, place])
  return null
}

/**
 * Lugar de un plan: búsqueda de Google mientras escribimos, tocar un negocio del mapa para tomar
 * su nombre y dirección, o tocar cualquier punto para marcarlo con su dirección real.
 */
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
  const map = useMap(MAP_ID)
  const places = useMapsLibrary('places')
  const geocoding = useMapsLibrary('geocoding')
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<Option[] | null>(null)
  const [active, setActive] = useState(0)
  const [searching, setSearching] = useState(false)
  const [resolving, setResolving] = useState(false)
  // Si Google no responde (p. ej. la API no está activada en la key), usamos OpenStreetMap
  const [googleFailed, setGoogleFailed] = useState(!mapsEnabled)
  const [error, setError] = useState<string | null>(null)
  const [focus, setFocus] = useState<Place | null>(null)
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const request = useRef(0)
  const showZoomControl = useShowZoomControl()

  const runOpenStreetMap = async (text: string) => {
    const id = ++request.current
    setSearching(true)
    setError(null)
    try {
      const rows = await searchOpenStreetMap(text)
      if (id !== request.current) return
      setOptions(rows.map((r) => ({ id: r.id, main: r.main, secondary: r.secondary, pick: async () => r.place })))
      setActive(0)
    } catch {
      if (id === request.current) setError('No se pudo buscar. Revisa la conexión o toca el lugar en el mapa.')
    } finally {
      if (id === request.current) setSearching(false)
    }
  }

  // Sugerencias de Google mientras escribimos (con una pequeña espera para no pedir en cada tecla)
  useEffect(() => {
    const text = query.trim()
    if (googleFailed || !places || text.length < 2) {
      if (text.length < 2) setOptions(null)
      return
    }
    const timer = window.setTimeout(async () => {
      const id = ++request.current
      setSearching(true)
      setError(null)
      try {
        token.current ??= new places.AutocompleteSessionToken()
        const bias = map?.getBounds() ?? (value ? { lat: value.lat, lng: value.lng } : null)
        const found = await suggestPlaces(places, text, token.current, bias)
        if (id !== request.current) return
        setOptions(found.map((s) => ({ id: s.id, main: s.main, secondary: s.secondary, pick: () => placeFromSuggestion(s) })))
        setActive(0)
      } catch {
        if (id !== request.current) return
        setGoogleFailed(true)
        await runOpenStreetMap(text)
        return
      } finally {
        if (id === request.current) setSearching(false)
      }
    }, 250)
    return () => window.clearTimeout(timer)
    // value solo sirve de sesgo inicial; no relanzamos la búsqueda cuando cambia
  }, [query, places, googleFailed, map]) // eslint-disable-line react-hooks/exhaustive-deps

  const choose = async (option: Option) => {
    setResolving(true)
    setError(null)
    try {
      const place = await option.pick()
      onChange(place)
      setFocus(place)
      setOptions(null)
      setQuery('')
      token.current = null // la sesión de búsqueda termina al elegir
    } catch {
      setError('No se pudo traer ese lugar. Prueba con otro resultado o tócalo en el mapa.')
    } finally {
      setResolving(false)
    }
  }

  const pickOnMap = async (lat: number, lng: number, placeId: string | null) => {
    // El marcador se mueve de inmediato; el nombre y la dirección llegan enseguida
    onChange({ name: value?.name || 'Buscando dirección…', address: null, lat, lng, placeId: null })
    setResolving(true)
    setError(null)
    try {
      if (placeId && places) onChange(await placeFromId(places, placeId))
      else if (geocoding) onChange(await placeFromPoint(geocoding, lat, lng))
      else onChange({ name: 'Lugar marcado en el mapa', address: null, lat, lng, placeId: null })
    } catch {
      onChange({ name: 'Lugar marcado en el mapa', address: null, lat, lng, placeId: null })
      setError('No pudimos leer la dirección de ese punto; puedes escribir el nombre abajo.')
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="place-picker">
      <div className="search-field">
        {searching ? <Loader2 size={16} className="spin" aria-hidden /> : <Search size={16} strokeWidth={1.75} aria-hidden />}
        <input
          value={query}
          placeholder="Busca un restaurante, un parque, una dirección…"
          aria-label="Buscar lugar"
          role="combobox"
          aria-expanded={Boolean(options?.length)}
          aria-controls="place-options"
          aria-autocomplete="list"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && options?.length) {
              e.preventDefault()
              setActive((i) => (i + 1) % options.length)
            } else if (e.key === 'ArrowUp' && options?.length) {
              e.preventDefault()
              setActive((i) => (i - 1 + options.length) % options.length)
            } else if (e.key === 'Escape') {
              setOptions(null)
            } else if (e.key === 'Enter') {
              e.preventDefault()
              if (options?.[active]) choose(options[active])
              else if (googleFailed && query.trim()) runOpenStreetMap(query.trim())
            }
          }}
        />
        {query && (
          <button type="button" className="icon-btn" onClick={() => (setQuery(''), setOptions(null))} aria-label="Borrar búsqueda">
            <X size={15} />
          </button>
        )}
        {googleFailed && (
          <button type="button" className="text-btn" onClick={() => runOpenStreetMap(query.trim())} disabled={searching || !query.trim()}>
            Buscar
          </button>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
      {options && (
        <ul className="search-results" id="place-options" role="listbox">
          {options.length === 0 && !searching && (
            <li className="search-empty">Nada con "{query.trim()}". Prueba con otro nombre o toca el lugar en el mapa.</li>
          )}
          {options.map((o, i) => (
            <li key={o.id} role="option" aria-selected={i === active}>
              <button type="button" className={i === active ? 'is-active' : ''} onMouseEnter={() => setActive(i)} onClick={() => choose(o)}>
                <MapPin size={16} strokeWidth={1.75} aria-hidden />
                <span>
                  <span className="result-main">{o.main}</span>
                  {o.secondary && <span className="result-secondary">{o.secondary}</span>}
                </span>
              </button>
            </li>
          ))}
          {googleFailed && <li className="search-source">Resultados de OpenStreetMap</li>}
        </ul>
      )}
      {mapsEnabled ? (
        <GoogleMap
          {...MAP_BASE_PROPS}
          id={MAP_ID}
          clickableIcons
          className="picker-map"
          defaultCenter={value ? { lat: value.lat, lng: value.lng } : DEFAULT_CENTER}
          defaultZoom={value ? 16 : 3}
          gestureHandling="greedy"
          zoomControl={showZoomControl}
          onClick={(e) => {
            if (!e.detail.latLng) return
            // Sin esto, Google abre su propia ventanita del negocio encima del mapa
            if (e.detail.placeId) e.stop()
            pickOnMap(e.detail.latLng.lat, e.detail.latLng.lng, e.detail.placeId)
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
        <div className="place-chosen">
          <div className="place-name">
            <input
              value={value.name}
              aria-label="Nombre del lugar"
              disabled={resolving}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
            />
            <button type="button" className="icon-btn" onClick={() => onChange(null)} aria-label="Quitar lugar">
              <X size={16} />
            </button>
          </div>
          {resolving ? (
            <p className="place-address">Buscando la dirección…</p>
          ) : (
            value.address && <p className="place-address">{value.address}</p>
          )}
          {!resolving && (
            <a className="maps-link" href={googleMapsUrl(value)} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} strokeWidth={2} aria-hidden />
              Ver en Google Maps
            </a>
          )}
        </div>
      ) : (
        <p className="field-hint">
          {mapsEnabled
            ? 'También puedes tocar un negocio o cualquier punto del mapa.'
            : 'Elige un resultado de la búsqueda para marcar el lugar.'}
        </p>
      )}
    </div>
  )
}
