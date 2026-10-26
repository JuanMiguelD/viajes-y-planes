import type { Plan, Tag } from '../types'
import { deadlineState } from '../utils'

/** Sin planes con lugar, el mapa arranca mostrando Latinoamérica. */
export const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 4, lng: -72 }

const COFFEE = '#8a5a34'
const HONEY = '#a8761a'

// Iconos de Lucide como paths SVG en línea. pareja/amigos = categoría (respaldo sin etiqueta).
const GLYPH: Record<'pareja' | 'amigos' | Tag, string> = {
  pareja:
    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  amigos:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  restaurante:
    '<path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/>',
  cafeteria:
    '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
  parque:
    '<path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"/><path d="M7 16v6"/><path d="M13 19v3"/><path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5"/>',
  bar: '<path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15v7"/><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"/>',
  hotel:
    '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/>',
  playa: '<path d="M2 12q2.5 2 5 0t5 0 5 0 5 0"/><path d="M2 19q2.5 2 5 0t5 0 5 0 5 0"/><path d="M2 5q2.5 2 5 0t5 0 5 0 5 0"/>',
  museo:
    '<path d="M10 18v-7"/><path d="M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/>',
  mirador:
    '<path d="M10 10h4"/><path d="M19 7V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v3"/><path d="M20 21a2 2 0 0 0 2-2v-3.851c0-1.39-2-2.962-2-4.829V8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v11a2 2 0 0 0 2 2z"/><path d="M 22 16 L 2 16"/><path d="M4 21a2 2 0 0 1-2-2v-3.851c0-1.39 2-2.962 2-4.829V8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2z"/><path d="M9 7V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v3"/>',
  evento:
    '<path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/>',
}

type PinState = 'done' | 'pending' | 'urgent'

function pinSvg(glyph: string, state: PinState): string {
  const ring = state === 'urgent' ? HONEY : COFFEE
  const bg = state === 'done' ? COFFEE : '#fff'
  const glyphColor = state === 'done' ? '#fff' : ring
  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
<defs><filter id="s" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="2" stdDeviation="1.4" flood-color="#3b2b1c" flood-opacity="0.35"/></filter></defs>
<circle cx="18" cy="18" r="15.5" fill="#fff" filter="url(#s)"/>
<circle cx="18" cy="18" r="14" fill="${bg}" stroke="${ring}" stroke-width="${state === 'done' ? 0 : 2.5}"/>
<svg x="11" y="11" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${glyphColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${glyph}</svg>
</svg>`
}

/**
 * Relleno = estado (lleno: hecho; blanco: pendiente). Icono = etiqueta del lugar
 * (o la categoría si el plan no tiene etiqueta). Anillo ocre en pendientes con fecha cerca o vencida.
 */
export function planIcon(plan: Pick<Plan, 'category' | 'status' | 'deadline' | 'tag'>, selected = false): google.maps.Icon {
  const done = plan.status === 'realizado'
  const urgent = !done && ['soon', 'overdue'].includes(deadlineState(plan as Plan) ?? '')
  const state: PinState = done ? 'done' : urgent ? 'urgent' : 'pending'
  const glyph = GLYPH[plan.tag ?? plan.category]
  const svg = pinSvg(glyph, state)
  const size = selected ? 39 : 30
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  }
}

/** Icono del grupo: el anillo muestra la proporción de planes hechos. */
export function clusterIcon(plans: Plan[]): google.maps.Icon {
  const done = plans.filter((p) => p.status === 'realizado').length
  const pct = done / plans.length
  const r = 16
  const c = 2 * Math.PI * r
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
<defs><filter id="s" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="2" stdDeviation="1.4" flood-color="#3b2b1c" flood-opacity="0.35"/></filter></defs>
<circle cx="18" cy="18" r="18" fill="#fff" filter="url(#s)"/>
<circle cx="18" cy="18" r="${r}" fill="none" stroke="#e6d7bb" stroke-width="4"/>
<circle cx="18" cy="18" r="${r}" fill="none" stroke="${COFFEE}" stroke-width="4" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}" transform="rotate(-90 18 18)"/>
<circle cx="18" cy="18" r="13.5" fill="#fff"/>
<text x="18" y="18" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-size="13" font-weight="700" fill="#3b2b1c">${plans.length}</text>
</svg>`
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(36, 36),
    anchor: new google.maps.Point(18, 18),
  }
}

/** Proyección Web Mercator estándar (la misma que usan Leaflet y Google Maps) a píxeles de pantalla. */
export function project(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = 256 * 2 ** zoom
  const x = ((lng + 180) / 360) * scale
  const sinLat = Math.sin((lat * Math.PI) / 180)
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
  return { x, y }
}
