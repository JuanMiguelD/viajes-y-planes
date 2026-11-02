import { Check, Heart, MapPin, Repeat2 } from 'lucide-react'
import { usePlanActions } from '../actions'
import { useTagLabel } from '../appSettings'
import { CATEGORY_LABEL, type Plan } from '../types'
import { deadlineLabel, deadlineState, numericDate } from '../utils'
import { CategoryIcon } from './CategoryIcon'
import { TagIcon } from './TagIcon'

export function PlanRow({ plan, onOpen }: { plan: Plan; onOpen: (id: string) => void }) {
  const { toggleDone, toggleFavorite } = usePlanActions()
  const tagLabel = useTagLabel(plan.tag)
  const done = plan.status === 'realizado'
  const deadline = deadlineState(plan)
  const label = deadlineLabel(plan)
  const urgent = deadline === 'soon' || deadline === 'overdue'

  return (
    <li className={`row ${done ? 'is-done' : ''}`}>
      <button
        className="check"
        role="checkbox"
        aria-checked={done}
        aria-label={`${plan.title}: ${done ? 'cumplido' : 'pendiente'}`}
        onClick={() => toggleDone(plan)}
      >
        <Check size={14} strokeWidth={3} aria-hidden />
      </button>
      <button className="row-main" onClick={() => onOpen(plan.id)}>
        <span className="row-title">{plan.title}</span>
        <span className="row-meta">
          {label && !done && (
            <span className={`meta-item meta-date ${urgent ? 'is-urgent' : ''}`}>{label}</span>
          )}
          {done && plan.completedAt && <span className="meta-item meta-done-date">{numericDate(plan.completedAt)}</span>}
          <span className="meta-item" title={CATEGORY_LABEL[plan.category]}>
            <CategoryIcon category={plan.category} size={13} />
            {CATEGORY_LABEL[plan.category]}
          </span>
          {plan.tag && (
            <span className="meta-item" title={tagLabel}>
              <TagIcon tag={plan.tag} size={13} />
              {tagLabel}
            </span>
          )}
          {plan.place && (
            <span className="meta-item meta-place">
              <MapPin size={13} strokeWidth={1.75} aria-hidden />
              {plan.place.name}
            </span>
          )}
          {plan.repeat && (
            <span className="meta-item">
              <Repeat2 size={13} strokeWidth={1.75} aria-hidden />
              Para repetir
            </span>
          )}
        </span>
      </button>
      <div className="row-trail">
        {label && !done && <span className={`row-date ${urgent ? 'is-urgent' : ''}`}>{label}</span>}
        <button
          className={`icon-btn row-fav ${plan.favorite ? 'is-fav' : ''}`}
          aria-pressed={plan.favorite}
          aria-label={plan.favorite ? `Quitar ${plan.title} de favoritos` : `Agregar ${plan.title} a favoritos`}
          onClick={() => toggleFavorite(plan)}
        >
          <Heart size={16} strokeWidth={1.9} fill={plan.favorite ? 'currentColor' : 'none'} aria-hidden />
        </button>
        {done && plan.cover && <img className="row-thumb" src={plan.cover.url} alt="" />}
      </div>
    </li>
  )
}

export function RowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul className="rows" aria-busy="true" aria-label="Cargando planes">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="row row-skeleton">
          <span className="check" />
          <span className="row-main">
            <span className="bar" style={{ width: `${45 + ((i * 17) % 35)}%` }} />
            <span className="bar bar-small" />
          </span>
        </li>
      ))}
    </ul>
  )
}
