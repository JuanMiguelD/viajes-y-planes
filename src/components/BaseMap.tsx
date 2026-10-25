import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import type L from 'leaflet'
import type { LayerSpecification, StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

/*
 * Mapa base vectorial de OpenFreeMap (gratuito, sin API key), recoloreado con los tonos cálidos
 * de la app para que el mapa sea parte del diseño y no un recorte de otro producto.
 */

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'
const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'

const FILL: Record<string, string> = {
  background: '#fbf3f1',
  park: '#e6eedc',
  landcover_wood: '#e1ead6',
  landuse_residential: '#f6ebe9',
  building: '#f1e2e0',
  water: '#cfe0ec',
}
const LABEL_INK = '#6e5a61'
const LABEL_HALO = '#fdf6f5'
const NAME = ['coalesce', ['get', 'name:es'], ['get', 'name:latin'], ['get', 'name']]

function recolor(layer: LayerSpecification): LayerSpecification {
  const paint = { ...(layer as { paint?: Record<string, unknown> }).paint }
  const layout = { ...(layer as { layout?: Record<string, unknown> }).layout }
  if (FILL[layer.id]) paint[layer.type === 'background' ? 'background-color' : 'fill-color'] = FILL[layer.id]
  if (layer.id === 'waterway') paint['line-color'] = '#bcd4e4'
  if (layer.type === 'symbol' && layout['text-field']) {
    if (layer.id.startsWith('label_') || layer.id.startsWith('water') || layer.id === 'airport') layout['text-field'] = NAME
    paint['text-color'] = layer.id.startsWith('water') ? '#5f86a0' : layer.id.startsWith('highway') ? '#a3929a' : LABEL_INK
    paint['text-halo-color'] = LABEL_HALO
  }
  return { ...layer, paint, layout } as LayerSpecification
}

let stylePromise: Promise<StyleSpecification> | null = null
function loadStyle(): Promise<StyleSpecification> {
  stylePromise ??= fetch(STYLE_URL)
    .then((r) => r.json() as Promise<StyleSpecification>)
    .then((style) => ({ ...style, layers: style.layers.filter((l) => !l.id.includes('shield')).map(recolor) }))
  stylePromise.catch(() => (stylePromise = null))
  return stylePromise
}

export function BaseMap() {
  const map = useMap()

  useEffect(() => {
    let layer: L.Layer | undefined
    let cancelled = false
    Promise.all([
      loadStyle(),
      import('maplibre-gl'),
      import('@maplibre/maplibre-gl-leaflet'),
      import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
    ]).then(
      ([style, maplibre, { maplibreGL }, worker]) => {
        if (cancelled) return
        if (maplibre.getWorkerUrl() !== worker.default) maplibre.setWorkerUrl(worker.default)
        layer = maplibreGL({ style, attributionControl: false }).addTo(map)
        map.attributionControl?.addAttribution(ATTRIBUTION)
      },
    )
    return () => {
      cancelled = true
      layer?.remove()
    }
  }, [map])

  return null
}
