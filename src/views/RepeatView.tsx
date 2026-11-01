import type { ReactNode } from 'react'
import { Check, Heart, ImageOff, MapPin } from 'lucide-react'
import { usePlanActions } from '../actions'
import { CategoryIcon } from '../components/CategoryIcon'
import { usePlans } from '../store'
import { CATEGORY_LABEL, type Plan } from '../types'
import { plural, since } from '../utils'

/** Fila compartida por "Favoritos" y "Para repetir": miniatura, datos del plan y acciones a la derecha. */
function PlanCard({
  plan,
  onOpen,
  when,
  actions,
}: {
  plan: Plan
  onOpen: (id: string) => void
  when?: string
  actions: ReactNode
}) {
  return (
    <li className="repeat-item">
      <button className="repeat-media" onClick={() => onOpen(plan.id)} aria-label={`Abrir ${plan.title}`}>
        {plan.cover ? <img src={plan.cover.url} alt="" /> : <ImageOff size={20} strokeWidth={1.5} aria-hidden />}
      </button>
      <div className="repeat-body">
        <button className="repeat-title" onClick={() => onOpen(plan.id)}>
          {plan.title}
        </button>
        <p className="row-meta">
          <span className="meta-item">
            <CategoryIcon category={plan.category} size={13} />
            {CATEGORY_LABEL[plan.category]}
          </span>
          {plan.place && (
            <span className="meta-item meta-place">
              <MapPin size={13} strokeWidth={1.75} aria-hidden />
              {plan.place.name}
            </span>
          )}
        </p>
        {when && (
          <p className="repeat-when">
            {when}
            {plan.timesDone > 1 && <span className="repeat-times">{plural(plan.timesDone, 'vez', 'veces')}</span>}
          </p>
        )}
      </div>
      <div className="repeat-actions">{actions}</div>
    </li>
  )
}

export function RepeatView({ onOpen, onGoToPlans }: { onOpen: (id: string) => void; onGoToPlans: () => void }) {
  const { plans } = usePlans()
  const { markRepeated, toggleRepeat, toggleFavorite, toggleDone } = usePlanActions()

  const favorites = plans.filter((p) => p.favorite)
  // Lo que más tiempo lleva sin repetirse, primero
  const repeatList = plans
    .filter((p) => p.status === 'realizado' && p.repeat)
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''))

  return (
    <div className="page">
      <h1 className="page-title">Favoritos y recurrentes</h1>

      {favorites.length === 0 && repeatList.length === 0 && (
        <div className="empty">
          <p>
            Marca un plan como favorito con el corazón, o ábrelo desde los cumplidos y toca "Queremos repetirlo".
            Ambos aparecen aquí.
          </p>
          <button className="btn btn-secondary" onClick={onGoToPlans}>
            Ver planes
          </button>
        </div>
      )}

      {favorites.length > 0 && (
        <section className="group">
          <h2 className="group-title">Favoritos</h2>
          <ul className="repeat-list">
            {favorites.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onOpen={onOpen}
                when={plan.status === 'realizado' && plan.completedAt ? `Lo hicimos ${since(plan.completedAt)}` : undefined}
                actions={
                  <>
                    {plan.status === 'pendiente' && (
                      <button className="btn btn-secondary btn-small" onClick={() => toggleDone(plan)}>
                        <Check size={14} strokeWidth={2.4} aria-hidden />
                        ¡Lo hicimos!
                      </button>
                    )}
                    <button className="text-btn" onClick={() => toggleFavorite(plan)}>
                      <Heart size={14} strokeWidth={1.9} fill="currentColor" aria-hidden />
                      Quitar
                    </button>
                  </>
                }
              />
            ))}
          </ul>
        </section>
      )}

      {repeatList.length > 0 && (
        <section className="group">
          <h2 className="group-title">Para repetir</h2>
          <p className="page-intro">Primero, lo que más tiempo lleva esperando.</p>
          <ul className="repeat-list">
            {repeatList.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onOpen={onOpen}
                when={plan.completedAt ? `Última vez ${since(plan.completedAt)}` : undefined}
                actions={
                  <>
                    <button className="btn btn-secondary btn-small" onClick={() => markRepeated(plan)}>
                      ¡Lo repetimos!
                    </button>
                    <button className="text-btn" onClick={() => toggleRepeat(plan)}>
                      Quitar
                    </button>
                  </>
                }
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
