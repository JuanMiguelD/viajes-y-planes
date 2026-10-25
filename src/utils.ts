import type { Plan } from './types'

/** Días antes de la fecha límite a partir de los que un plan se considera "próximo". */
export const SOON_DAYS = 7

const DAY = 86_400_000

function parse(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function daysUntil(date: string): number {
  return Math.round((parse(date).getTime() - parse(today()).getTime()) / DAY)
}

export type DeadlineState = 'overdue' | 'soon' | 'later' | null

export function deadlineState(plan: Plan): DeadlineState {
  if (!plan.deadline || plan.status === 'realizado') return null
  const days = daysUntil(plan.deadline)
  if (days < 0) return 'overdue'
  if (days <= SOON_DAYS) return 'soon'
  return 'later'
}

/** "12 nov" (añade el año si no es el actual). */
export function shortDate(date: string): string {
  const d = parse(date)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d
    .toLocaleDateString('es-419', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })
    .replace('.', '')
}

/** "1 de septiembre de 2026" */
export function longDate(date: string): string {
  return parse(date).toLocaleDateString('es-419', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Texto corto para la columna de fecha límite del checklist. */
export function deadlineLabel(plan: Plan): string | null {
  if (!plan.deadline) return null
  const days = daysUntil(plan.deadline)
  if (plan.status === 'realizado' || days > SOON_DAYS) return shortDate(plan.deadline)
  if (days < -1) return `Venció hace ${-days} días`
  if (days === -1) return 'Venció ayer'
  if (days === 0) return 'Vence hoy'
  if (days === 1) return 'Vence mañana'
  return `En ${days} días`
}

/** "hoy", "mañana", "el jueves", "el 24 de noviembre" — para frases. */
export function datePhrase(date: string): string {
  const days = daysUntil(date)
  if (days === 0) return 'hoy'
  if (days === 1) return 'mañana'
  if (days > 1 && days < 7) return `el ${parse(date).toLocaleDateString('es-419', { weekday: 'long' })}`
  return `el ${parse(date).toLocaleDateString('es-419', { day: 'numeric', month: 'long' })}`
}

const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

/** "hace 3 meses", "ayer"... */
export function since(date: string): string {
  const days = -daysUntil(date)
  if (days < 1) return 'hoy'
  if (days < 30) return rtf.format(-days, 'day')
  if (days < 365) return rtf.format(-Math.round(days / 30), 'month')
  return rtf.format(-Math.round(days / 365), 'year')
}

/** "Septiembre de 2026" */
export function monthTitle(date: string): string {
  const s = parse(date).toLocaleDateString('es-419', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}
