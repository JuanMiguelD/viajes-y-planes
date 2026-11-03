import { useState } from 'react'
import { Check, ExternalLink, Heart, MapPin, Pencil, Repeat2, Trash2, Undo2, X } from 'lucide-react'
import { usePlanActions } from '../actions'
import { useTagLabel } from '../appSettings'
import { googleMapsUrl } from '../places'
import { usePlans } from '../store'
import { useToast } from '../toast'
import { CATEGORY_LABEL } from '../types'
import { daysUntil, deadlineState, longDate, plural, since } from '../utils'
import { CategoryIcon } from './CategoryIcon'
import { Gallery } from './Gallery'
import { PlanForm } from './PlanForm'
import { Sheet } from './Sheet'
import { StaticMap } from './StaticMap'
import { TagIcon } from './TagIcon'

/** Ficha de un plan. Lee el plan del store por id, así que siempre refleja el estado actual. */
export function PlanDetail({
  planId,
  startInEdit = false,
  onClose,
  onShowOnMap,
  onRepeat,
}: {
  planId: string
  startInEdit?: boolean
  onClose: () => void
  onShowOnMap: (id: string) => void
  onRepeat: (newPlanId: string) => void
}) {
  const { getPlan, deletePlan } = usePlans()
  const { toggleDone, toggleRepeat, toggleFavorite, repeatPlan } = usePlanActions()
  const toast = useToast()
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm-delete'>(startInEdit ? 'edit' : 'view')
  const plan = getPlan(planId)
  const tagLabel = useTagLabel(plan?.tag)

  if (!plan) return null
  if (mode === 'edit') return <PlanForm plan={plan} onClose={() => setMode('view')} />

  const done = plan.status === 'realizado'
  const deadline = deadlineState(plan)
  const urgent = deadline === 'soon' || deadline === 'overdue'

  const remove = async () => {
    await deletePlan(plan.id)
    onClose()
    toast(`"${plan.title}" eliminado`)
  }

  const deadlineNote = () => {
    if (!plan.deadline || done) return null
    const days = daysUntil(plan.deadline)
    if (days < 0) return `venció hace ${plural(-days, 'día', 'días')}`
    if (days === 0) return 'vence hoy'
    return `quedan ${plural(days, 'día', 'días')}`
  }

  return (
    <Sheet label={plan.title} onClose={onClose}>
      <article className="detail">
        {plan.cover ? (
          <img className="detail-cover" src={plan.cover.url} alt="" />
        ) : plan.place ? (
          <StaticMap plan={plan} className="detail-cover detail-cover-map" />
        ) : null}
        <button
          className={`sheet-close ${plan.cover || plan.place ? 'on-media' : ''}`}
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        <div className="detail-body">
          <p className="detail-category">
            <CategoryIcon category={plan.category} />
            {CATEGORY_LABEL[plan.category]}
            {plan.tag && (
              <>
                {' · '}
                <TagIcon tag={plan.tag} size={14} />
                {tagLabel}
              </>
            )}
          </p>
          <h2 className="detail-title">{plan.title}</h2>
          {plan.description && <p className="detail-desc">{plan.description}</p>}

          <dl className="facts">
            <div>
              <dt>Estado</dt>
              <dd>
                {done ? (
                  <span className="state state-done">
                    <Check size={14} strokeWidth={2.5} aria-hidden />
                    Lo hicimos{plan.completedAt && ` el ${longDate(plan.completedAt)}`}
                  </span>
                ) : (
                  <span className="state">Pendiente</span>
                )}
                {done && plan.timesDone > 1 && <span className="fact-note">{plural(plan.timesDone, 'vez', 'veces')} en total</span>}
              </dd>
            </div>
            {plan.place && (
              <div>
                <dt>Lugar</dt>
                <dd>
                  {plan.place.name}
                  {plan.place.address && plan.place.address !== plan.place.name && (
                    <span className="fact-note">{plan.place.address}</span>
                  )}
                  <span className="place-links">
                    <button className="text-btn" onClick={() => onShowOnMap(plan.id)}>
                      <MapPin size={15} strokeWidth={1.75} aria-hidden />
                      Ver en el mapa
                    </button>
                    <a className="text-btn" href={googleMapsUrl(plan.place)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={14} strokeWidth={2} aria-hidden />
                      Google Maps
                    </a>
                  </span>
                </dd>
              </div>
            )}
            {plan.deadline && (
              <div>
                <dt>Fecha límite</dt>
                <dd className={urgent ? 'is-urgent' : ''}>
                  {longDate(plan.deadline)}
                  {deadlineNote() && <span className="fact-note">{deadlineNote()}</span>}
                </dd>
              </div>
            )}
            {done && plan.repeat && plan.completedAt && (
              <div>
                <dt>Última vez</dt>
                <dd>{since(plan.completedAt)}</dd>
              </div>
            )}
          </dl>

          <div className="detail-actions">
            {done ? (
              <>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    const newId = await repeatPlan(plan)
                    onRepeat(newId)
                  }}
                >
                  <Repeat2 size={17} strokeWidth={1.9} aria-hidden />
                  Queremos repetirlo
                </button>
                <button className="btn btn-quiet" onClick={() => toggleDone(plan)}>
                  <Undo2 size={16} strokeWidth={1.9} aria-hidden />
                  Aún no lo hacemos
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => toggleDone(plan)}>
                <Check size={17} strokeWidth={2.2} aria-hidden />
                ¡Lo hicimos!
              </button>
            )}
            <button
              className={`btn btn-secondary ${plan.favorite ? 'is-heart' : ''}`}
              aria-pressed={plan.favorite}
              onClick={() => toggleFavorite(plan)}
            >
              <Heart size={16} strokeWidth={1.9} fill={plan.favorite ? 'currentColor' : 'none'} aria-hidden />
              {plan.favorite ? 'En favoritos' : 'Favorito'}
            </button>
          </div>
          {done && plan.repeat && (
            <p className="detail-hint">
              Ya está guardado en "Favoritos y recurrentes", listo para repetirlo.{' '}
              <button className="text-btn" onClick={() => toggleRepeat(plan)}>
                Quitar
              </button>
            </p>
          )}
        </div>

        {done ? (
          <Gallery plan={plan} />
        ) : (
          <p className="detail-hint">Cuando lo hagamos, aquí guardaremos las fotos de ese día.</p>
        )}

        <footer className="detail-footer">
          {mode === 'confirm-delete' ? (
            <div className="confirm">
              <p>
                ¿Eliminar este plan{plan.photoCount > 0 && ` y sus ${plural(plan.photoCount, 'foto', 'fotos')}`}? No se puede
                deshacer.
              </p>
              <div>
                <button className="btn btn-quiet" onClick={() => setMode('view')}>
                  Cancelar
                </button>
                <button className="btn btn-danger" onClick={remove}>
                  Eliminar plan
                </button>
              </div>
            </div>
          ) : (
            <>
              <button className="text-btn" onClick={() => setMode('edit')}>
                <Pencil size={15} strokeWidth={1.75} aria-hidden />
                Editar
              </button>
              <button className="text-btn text-btn-danger" onClick={() => setMode('confirm-delete')}>
                <Trash2 size={15} strokeWidth={1.75} aria-hidden />
                Eliminar
              </button>
            </>
          )}
        </footer>
      </article>
    </Sheet>
  )
}
