import type { Plan } from './types'
import { daysUntil, datePhrase, longDate, today } from './utils'

const TEMPLATE_KEY = 'viajesyplanes.reminder.template'
const NOTIFIED_KEY = 'viajesyplanes.reminder.notified'

export const DEFAULT_TEMPLATE = '💛 Recordatorio: {titulo} es {cuando}.'

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getTemplate(): string {
  return localStorage.getItem(TEMPLATE_KEY) ?? DEFAULT_TEMPLATE
}

export function setTemplate(value: string): void {
  const trimmed = value.trim()
  if (trimmed) localStorage.setItem(TEMPLATE_KEY, trimmed)
  else localStorage.removeItem(TEMPLATE_KEY)
}

/** Completa la frase editable con los datos del plan. */
export function fillTemplate(template: string, plan: Plan): string {
  return template
    .replaceAll('{titulo}', plan.title)
    .replaceAll('{cuando}', plan.deadline ? datePhrase(plan.deadline) : 'pronto')
    .replaceAll('{fecha}', plan.deadline ? longDate(plan.deadline) : '')
}

function notifiedSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function markNotified(key: string): void {
  const set = notifiedSet()
  set.add(key)
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...set].slice(-200)))
}

/** El próximo plan pendiente con fecha, el más cercano primero. */
export function nextUpcoming(plans: Plan[]): Plan | null {
  const dated = plans
    .filter((p) => p.status === 'pendiente' && p.deadline)
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!))
  return dated[0] ?? null
}

async function fire(plan: Plan): Promise<void> {
  const body = fillTemplate(getTemplate(), plan)
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration().catch(() => undefined) : undefined
  if (reg) await reg.showNotification('Nuestros planes', { body, tag: `plan-${plan.id}`, icon: '/favicon.svg' })
  else new Notification('Nuestros planes', { body, tag: `plan-${plan.id}` })
}

/**
 * Revisa el próximo plan con fecha y avisa si toca: el día de antes, el mismo día, o si ya venció
 * y seguimos sin marcarlo. Como máximo un aviso por plan y día, guardado en este navegador.
 */
export async function checkReminders(plans: Plan[]): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  const next = nextUpcoming(plans)
  if (!next?.deadline) return
  if (daysUntil(next.deadline) > 1) return
  const key = `${next.id}:${today()}`
  if (notifiedSet().has(key)) return
  markNotified(key)
  await fire(next)
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  return Notification.requestPermission()
}
