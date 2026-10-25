import L from 'leaflet'
import type { Plan } from '../types'
import { deadlineState } from '../utils'

/** Sin planes con lugar, el mapa arranca mostrando Latinoamérica. */
export const DEFAULT_CENTER: [number, number] = [4, -72]

// Iconos de Lucide (heart, users) como SVG en línea para los marcadores
const GLYPH = {
  pareja:
    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  amigos:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
}

/**
 * Relleno = estado (pino relleno: hecho; hueco: pendiente). Icono = categoría.
 * Borde ocre en pendientes con fecha límite cercana o vencida.
 */
export function planIcon(plan: Pick<Plan, 'category' | 'status' | 'deadline'>, selected = false): L.DivIcon {
  const done = plan.status === 'realizado'
  const urgent = !done && ['soon', 'overdue'].includes(deadlineState(plan as Plan) ?? '')
  const classes = ['pin', done ? 'pin-done' : 'pin-pending', urgent && 'pin-urgent', selected && 'pin-selected']
  return L.divIcon({
    className: 'pin-host',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<div class="${classes.filter(Boolean).join(' ')}"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${GLYPH[plan.category]}</svg></div>`,
  })
}
