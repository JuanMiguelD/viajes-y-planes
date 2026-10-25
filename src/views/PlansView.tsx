import { useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { CategoryIcon } from '../components/CategoryIcon'
import { PlanRow, RowSkeleton } from '../components/PlanRow'
import { usePlans } from '../store'
import { CATEGORY_LABEL, type Category, type Plan } from '../types'
import { datePhrase, daysUntil, plural } from '../utils'

type Filter = 'todos' | Category

const byDeadline = (a: Plan, b: Plan) => a.deadline!.localeCompare(b.deadline!)
const byCreated = (a: Plan, b: Plan) => a.createdAt - b.createdAt
const byCompleted = (a: Plan, b: Plan) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')

/** Resumen en una frase de lo que falta por hacer. */
function Lede({ plans, onOpen }: { plans: Plan[]; onOpen: (id: string) => void }) {
  const pending = plans.filter((p) => p.status === 'pendiente')
  const next = pending.filter((p) => p.deadline).sort(byDeadline)[0]

  if (plans.length === 0) return <h1 className="lede">Aquí empieza nuestra lista.</h1>
  if (pending.length === 0) return <h1 className="lede">¡Cumplimos todo! Hora de soñar el siguiente plan.</h1>

  const link = next && (
    <a
      className="lede-link"
      href={`#plan-${next.id}`}
      onClick={(e) => {
        e.preventDefault()
        onOpen(next.id)
      }}
    >
      {next.title}
    </a>
  )
  return (
    <h1 className="lede">
      {pending.length === 1 ? 'Nos queda un plan por hacer' : `Nos quedan ${pending.length} planes por hacer`}
      {!next ? (
        ', ninguno con fecha.'
      ) : daysUntil(next.deadline!) < 0 ? (
        <>. Se nos pasó {link}: era {datePhrase(next.deadline!)}.</>
      ) : (
        <>. El próximo: {link}, {datePhrase(next.deadline!)}.</>
      )}
    </h1>
  )
}

export function PlansView({ onOpen, onCreate }: { onOpen: (id: string) => void; onCreate: () => void }) {
  const { plans, loading } = usePlans()
  const [filter, setFilter] = useState<Filter>('todos')
  const [showDone, setShowDone] = useState(true)

  if (loading)
    return (
      <div className="page">
        <div className="lede lede-skeleton" />
        <RowSkeleton />
      </div>
    )

  const visible = plans.filter((p) => filter === 'todos' || p.category === filter)
  const pending = visible.filter((p) => p.status === 'pendiente')
  const dated = pending.filter((p) => p.deadline).sort(byDeadline)
  const undated = pending.filter((p) => !p.deadline).sort(byCreated)
  const done = visible.filter((p) => p.status === 'realizado').sort(byCompleted)
  const count = (f: Filter) => plans.filter((p) => p.status === 'pendiente' && (f === 'todos' || p.category === f)).length

  return (
    <div className="page">
      <Lede plans={plans} onOpen={onOpen} />

      {plans.length === 0 ? (
        <div className="empty">
          <p>
            Anotemos todo lo que queremos hacer juntos: ese restaurante pendiente, una escapada, un concierto con los
            amigos. Si tiene lugar, aparece en el mapa; si tiene fecha, te avisa cuando se acerca.
          </p>
          <button className="btn btn-primary" onClick={onCreate}>
            <Plus size={17} aria-hidden />
            Agregar nuestro primer plan
          </button>
        </div>
      ) : (
        <>
          <div className="filter" role="tablist" aria-label="Filtrar por categoría">
            {(['todos', 'pareja', 'amigos'] as Filter[]).map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>
                {f !== 'todos' && <CategoryIcon category={f} size={14} />}
                {f === 'todos' ? 'Todos' : CATEGORY_LABEL[f]}
                <span className="filter-count">{count(f)}</span>
              </button>
            ))}
          </div>

          {pending.length === 0 && (
            <p className="group-empty">
              {filter === 'todos' ? 'Nada pendiente por aquí.' : `Nada pendiente en "${CATEGORY_LABEL[filter as Category]}".`}
            </p>
          )}

          {dated.length > 0 && (
            <section className="group">
              <h2 className="group-title">Con fecha</h2>
              <ul className="rows">
                {dated.map((p) => (
                  <PlanRow key={p.id} plan={p} onOpen={onOpen} />
                ))}
              </ul>
            </section>
          )}

          {undated.length > 0 && (
            <section className="group">
              <h2 className="group-title">{dated.length > 0 ? 'Sin fecha' : 'Pendientes'}</h2>
              <ul className="rows">
                {undated.map((p) => (
                  <PlanRow key={p.id} plan={p} onOpen={onOpen} />
                ))}
              </ul>
            </section>
          )}

          {done.length > 0 && (
            <section className="group">
              <h2 className="group-title">
                <button className="group-toggle" aria-expanded={showDone} onClick={() => setShowDone((s) => !s)}>
                  Cumplidos
                  <span className="group-count">{done.length}</span>
                  <ChevronDown size={16} aria-hidden className="chevron" />
                </button>
              </h2>
              {showDone && (
                <ul className="rows">
                  {done.map((p) => (
                    <PlanRow key={p.id} plan={p} onOpen={onOpen} />
                  ))}
                </ul>
              )}
            </section>
          )}

          <p className="page-foot">{plural(plans.filter((p) => p.status === 'realizado').length, 'plan cumplido', 'planes cumplidos')} juntos hasta ahora.</p>
        </>
      )}
    </div>
  )
}
