import { ImageOff, MapPin } from 'lucide-react'
import { usePlanActions } from '../actions'
import { CategoryIcon } from '../components/CategoryIcon'
import { usePlans } from '../store'
import { CATEGORY_LABEL } from '../types'
import { plural, since } from '../utils'

export function RepeatView({ onOpen, onGoToPlans }: { onOpen: (id: string) => void; onGoToPlans: () => void }) {
  const { plans } = usePlans()
  const { markRepeated, toggleRepeat } = usePlanActions()
  // Lo que más tiempo lleva sin repetirse, primero
  const list = plans
    .filter((p) => p.status === 'realizado' && p.repeat)
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''))

  return (
    <div className="page">
      <h1 className="page-title">Para repetir</h1>
      {list.length === 0 ? (
        <div className="empty">
          <p>
            Cuando un plan nos encante, lo abrimos desde los cumplidos y tocamos "Queremos repetirlo". Aparecerá aquí,
            ordenado por el tiempo que lleva esperando.
          </p>
          <button className="btn btn-secondary" onClick={onGoToPlans}>
            Ver planes cumplidos
          </button>
        </div>
      ) : (
        <>
          <p className="page-intro">Primero, lo que más tiempo lleva esperando.</p>
          <ul className="repeat-list">
            {list.map((plan) => (
              <li key={plan.id} className="repeat-item">
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
                  <p className="repeat-when">
                    {plan.completedAt && <>Última vez {since(plan.completedAt)}</>}
                    {plan.timesDone > 1 && <span className="repeat-times">{plural(plan.timesDone, 'vez', 'veces')}</span>}
                  </p>
                </div>
                <div className="repeat-actions">
                  <button className="btn btn-secondary btn-small" onClick={() => markRepeated(plan)}>
                    ¡Lo repetimos!
                  </button>
                  <button className="text-btn" onClick={() => toggleRepeat(plan)}>
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
