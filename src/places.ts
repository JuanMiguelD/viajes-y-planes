import type { Place } from './types'

/*
 * Búsqueda y datos de lugares con Google (Places API New + Geocoding, desde la Maps JavaScript API).
 * Requiere que la API key tenga activadas y permitidas "Places API (New)" y "Geocoding API".
 * Si Google falla, la búsqueda cae a OpenStreetMap para que nunca quede inutilizable.
 */

/** Si Google no contesta a tiempo (key rechazada, sin conexión), no dejamos la búsqueda colgada. */
function withTimeout<T>(promise: Promise<T>, ms = 6000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Google no respondió a tiempo')), ms)),
  ])
}

export interface Suggestion {
  id: string
  main: string
  secondary: string
  prediction: google.maps.places.PlacePrediction
}

/** Sugerencias mientras escribimos, con prioridad a lo que está cerca de lo que muestra el mapa. */
export async function suggestPlaces(
  places: google.maps.PlacesLibrary,
  input: string,
  sessionToken: google.maps.places.AutocompleteSessionToken,
  bias: google.maps.LatLngBounds | google.maps.LatLngLiteral | null,
): Promise<Suggestion[]> {
  const { suggestions } = await withTimeout(
    places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input,
      sessionToken,
      language: 'es',
      ...(bias ? { locationBias: bias } : {}),
    }),
  )
  return suggestions.flatMap((s) => {
    const p = s.placePrediction
    if (!p) return []
    return [{ id: p.placeId, main: p.mainText?.text ?? p.text.text, secondary: p.secondaryText?.text ?? '', prediction: p }]
  })
}

/** Lugar elegido de las sugerencias: el nombre viene de la sugerencia; pedimos solo dirección y ubicación. */
export async function placeFromSuggestion(s: Suggestion): Promise<Place> {
  const place = s.prediction.toPlace()
  await withTimeout(place.fetchFields({ fields: ['formattedAddress', 'location'] }))
  return {
    name: s.main,
    address: place.formattedAddress ?? (s.secondary || null),
    lat: place.location!.lat(),
    lng: place.location!.lng(),
    placeId: s.id,
  }
}

/** Negocio o sitio de Google tocado en el mapa. */
export async function placeFromId(places: google.maps.PlacesLibrary, placeId: string): Promise<Place> {
  const place = new places.Place({ id: placeId, requestedLanguage: 'es' })
  await withTimeout(place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] }))
  return {
    name: place.displayName ?? place.formattedAddress ?? 'Lugar',
    address: place.formattedAddress ?? null,
    lat: place.location!.lat(),
    lng: place.location!.lng(),
    placeId,
  }
}

/** Punto cualquiera del mapa: buscamos su dirección real (geocodificación inversa). */
export async function placeFromPoint(geocoding: google.maps.GeocodingLibrary, lat: number, lng: number): Promise<Place> {
  const { results } = await withTimeout(new geocoding.Geocoder().geocode({ location: { lat, lng }, language: 'es' }))
  const best = results.find((r) => !r.types.includes('plus_code')) ?? results[0]
  if (!best) return { name: 'Lugar marcado en el mapa', address: null, lat, lng, placeId: null }
  return { name: best.formatted_address.split(',')[0].trim(), address: best.formatted_address, lat, lng, placeId: null }
}

interface NominatimResult {
  place_id: number
  display_name: string
  name?: string
  lat: string
  lon: string
}

/** Respaldo con OpenStreetMap cuando Google no responde. */
export async function searchOpenStreetMap(input: string): Promise<{ id: string; main: string; secondary: string; place: Place }[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=es&q=${encodeURIComponent(input)}`,
  )
  const rows = (await res.json()) as NominatimResult[]
  return rows.map((r) => {
    const parts = r.display_name.split(',').map((x) => x.trim())
    const main = r.name || parts[0]
    return {
      id: String(r.place_id),
      main,
      secondary: parts.slice(1, 4).join(', '),
      place: { name: main, address: r.display_name, lat: Number(r.lat), lng: Number(r.lon), placeId: null },
    }
  })
}

/** Abre el lugar en Google Maps (app o web), con la ficha del negocio si la tenemos. */
export function googleMapsUrl(place: Place): string {
  const query = encodeURIComponent(place.placeId ? place.name : `${place.lat},${place.lng}`)
  const id = place.placeId ? `&query_place_id=${encodeURIComponent(place.placeId)}` : ''
  return `https://www.google.com/maps/search/?api=1&query=${query}${id}`
}
