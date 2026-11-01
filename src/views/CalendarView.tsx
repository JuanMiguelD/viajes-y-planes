import { useMemo, useState } from 'react'
import { CalendarClock, ChevronLeft, ChevronRight, Heart, X } from 'lucide-react'
import { CategoryIcon } from '../components/CategoryIcon'
import { Sheet } from '../components/Sheet'
import { usePlans } from '../store'
import type { Plan } from '../types'
import { longDate, monthTitle, today } from '../utils'

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

interface DayCell {
  key: string
  day: number
  isToday: boolean
  done: Plan[]
  planned: Plan[]
}

/** Cuadrícula de un mes (semanas de lunes a domingo), con huecos nulos para alinear el primer y último día. */
function buildMonth(
  year: number,
  month: number,
  doneByDate: Map<string, Plan[]>,
  plannedByDate: Map<string, Plan[]>,
  todayKey: string,
): (DayCell | null)[] {
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (DayCell | null)[] = Array.from({ length: startOffset }, () => null)
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${pad(month + 1)}-${pad(day)}`
    cells.push({ key, day, isToday: key === todayKey, done: doneByDate.get(key) ?? [], planned: plannedByDate.get(key) ?? [] })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/** Ficha corta de un día: qué planes cumplimos o tenemos puestos para esa fecha. */
function DaySheet({
  dateKey,
  plans,
  onOpen,
  onClose,
}: {
  dateKey: string
  plans: Plan[]
  onOpen: (id: string) => void
  onClose: () => void
}) {
  return (
    <Sheet label={longDate(dateKey)} onClose={onClose}>
      <div className="form">
        <header className="form-head">
          <h2>{longDate(dateKey)}</h2>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </header>
        <div className="pick-body">
          <ul className="pick-list">
            {plans.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => {
                    onClose()
                    onOpen(p.id)
                  }}
                >
                  <span className="pick-thumb">
                    {p.cover ? <img src={p.cover.url} alt="" /> : <CategoryIcon category={p.category} size={18} />}
                  </span>
                  <span className="pick-text">
                    <span className="pick-title">{p.title}</span>
                    <span className="pick-meta">
                      {p.status === 'realizado' ? 'Nos vimos' : 'Lo tenemos planeado'}
                      {p.place && ` · ${p.place.name}`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Sheet>
  )
}

/** Calendario mensual: corazón en los días que nos vimos, ícono de reloj en los planes con fecha fija, hoy resaltado. */
export function CalendarView({ onOpen }: { onOpen: (id: string) => void }) {
  const { plans } = usePlans()
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth())
  const [openDay, setOpenDay] = useState<string | null>(null)
  const todayKey = today()

  const doneByDate = useMemo(() => {
    const map = new Map<string, Plan[]>()
    for (const p of plans) {
      if (p.status === 'realizado' && p.completedAt) map.set(p.completedAt, [...(map.get(p.completedAt) ?? []), p])
    }
    return map
  }, [plans])

  const plannedByDate = useMemo(() => {
    const map = new Map<string, Plan[]>()
    for (const p of plans) {
      if (p.status === 'pendiente' && p.deadline) map.set(p.deadline, [...(map.get(p.deadline) ?? []), p])
    }
    return map
  }, [plans])

  const cells = useMemo(
    () => buildMonth(year, month, doneByDate, plannedByDate, todayKey),
    [year, month, doneByDate, plannedByDate, todayKey],
  )

  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else setMonth((m) => m + 1)
  }

  const dayPlans = openDay ? [...(doneByDate.get(openDay) ?? []), ...(plannedByDate.get(openDay) ?? [])] : []

  return (
    <div className="page">
      <header className="calendar-head">
        <h1 className="page-title">Calendario</h1>
        <div className="calendar-nav">
          <button type="button" onClick={prevMonth} aria-label="Mes anterior">
            <ChevronLeft size={18} strokeWidth={2} aria-hidden />
          </button>
          <span className="calendar-month">{monthTitle(`${year}-${pad(month + 1)}-01`)}</span>
          <button type="button" onClick={nextMonth} aria-label="Mes siguiente">
            <ChevronRight size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </header>

      <div className="calendar-legend">
        <span>
          <Heart size={13} strokeWidth={0} fill="currentColor" className="icon-heart" aria-hidden />
          Nos vimos
        </span>
        <span>
          <CalendarClock size={13} strokeWidth={2} aria-hidden />
          Plan con fecha
        </span>
        <span>
          <i className="calendar-legend-dot" aria-hidden />
          Hoy
        </span>
      </div>

      <div className="calendar-grid" role="grid" aria-label={monthTitle(`${year}-${pad(month + 1)}-01`)}>
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="calendar-weekday" aria-hidden>
            {w}
          </div>
        ))}
        {cells.map((cell, i) =>
          cell ? (
            <button
              key={cell.key}
              type="button"
              className={`calendar-day ${cell.isToday ? 'is-today' : ''}`}
              disabled={cell.done.length === 0 && cell.planned.length === 0}
              onClick={() => setOpenDay(cell.key)}
              aria-label={longDate(cell.key)}
            >
              <span className="calendar-day-num">{cell.day}</span>
              <span className="calendar-day-icons">
                {cell.done.length > 0 && (
                  <Heart size={11} strokeWidth={0} fill="currentColor" className="calendar-icon-done" aria-hidden />
                )}
                {cell.planned.length > 0 && <CalendarClock size={11} strokeWidth={2.2} className="calendar-icon-planned" aria-hidden />}
              </span>
            </button>
          ) : (
            <span key={i} className="calendar-day calendar-day-empty" aria-hidden />
          ),
        )}
      </div>

      {plans.length === 0 && (
        <div className="empty">
          <p>Cuando tengamos planes con fecha o cumplidos, aparecerán aquí marcados en su día.</p>
        </div>
      )}

      {openDay && <DaySheet dateKey={openDay} plans={dayPlans} onOpen={onOpen} onClose={() => setOpenDay(null)} />}
    </div>
  )
}
