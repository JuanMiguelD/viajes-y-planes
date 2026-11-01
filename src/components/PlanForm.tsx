import { useCallback, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { usePlans } from '../store'
import { useToast } from '../toast'
import { CATEGORY_LABEL, TAG_LABEL, type Category, type Plan, type PlanInput, type Tag } from '../types'
import { today } from '../utils'
import { CategoryIcon } from './CategoryIcon'
import { PlacePicker } from './PlacePicker'
import { Sheet } from './Sheet'
import { TagIcon } from './TagIcon'

const TAGS = Object.keys(TAG_LABEL) as Tag[]

const EMPTY: PlanInput = {
  title: '',
  description: '',
  category: 'pareja',
  status: 'pendiente',
  repeat: false,
  favorite: false,
  deadline: null,
  place: null,
  tag: null,
  completedAt: null,
  timesDone: 0,
  cover: null,
  photoCount: 0,
}

/** Arma el plan en blanco para una fecha elegida en el calendario: pasada = cumplido ese día, futura = fecha límite. */
function seedFromDate(date: string): PlanInput {
  if (date < today()) return { ...EMPTY, status: 'realizado', completedAt: date, timesDone: 1 }
  return { ...EMPTY, deadline: date }
}

export function PlanForm({ plan, initialDate, onClose }: { plan?: Plan; initialDate?: string; onClose: () => void }) {
  const { addPlan, updatePlan } = usePlans()
  const toast = useToast()
  const [form, setForm] = useState<PlanInput>(() => plan ?? (initialDate ? seedFromDate(initialDate) : EMPTY))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const set = <K extends keyof PlanInput>(key: K, value: PlanInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setDirty(true)
  }

  // Si cambiamos algo, pedimos confirmación antes de cerrar sin guardar (X, scrim o Escape).
  // Memoizado para no cambiar de referencia en cada tecla (Sheet re-suscribe su listener de Escape si cambia).
  const requestClose = useCallback(() => (dirty ? setConfirmDiscard(true) : onClose()), [dirty, onClose])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) return setError('Ponle un nombre al plan.')
    if (form.status === 'realizado' && !form.completedAt) return setError('Pon la fecha en la que lo hicimos.')
    setSaving(true)
    const data = { ...form, title, description: form.description.trim() }
    try {
      if (plan) {
        const { description, category, deadline, place, tag, status, completedAt } = data
        await updatePlan(plan.id, { title, description, category, deadline, place, tag, status, completedAt })
        toast('Cambios guardados')
      } else {
        await addPlan(data.status === 'realizado' ? { ...data, timesDone: Math.max(data.timesDone, 1) } : data)
        toast(`"${title}" ya está en nuestra lista`)
      }
      onClose()
    } catch {
      setError('No se pudo guardar. Revisa la conexión e inténtalo de nuevo.')
      setSaving(false)
    }
  }

  return (
    <Sheet label={plan ? 'Editar plan' : 'Nuevo plan'} onClose={requestClose}>
      <form className="form" onSubmit={submit} noValidate>
        <header className="form-head">
          <h2>{plan ? 'Editar plan' : 'Nuevo plan'}</h2>
          <button type="button" className="sheet-close" onClick={requestClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </header>

        <div className="form-body">
          <label className="field">
            <span className="field-label">¿Qué queremos hacer?</span>
            <input
              className="input input-title"
              autoFocus
              value={form.title}
              placeholder="Cenar en ese lugar que vimos"
              onChange={(e) => {
                set('title', e.target.value)
                setError(null)
              }}
              aria-invalid={Boolean(error && !form.title.trim())}
            />
          </label>

          <label className="field">
            <span className="field-label">Notas</span>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              placeholder="Reservar antes, pedir la mesa de la terraza…"
              onChange={(e) => set('description', e.target.value)}
            />
          </label>

          <fieldset className="field">
            <legend className="field-label">Con quién</legend>
            <div className="segmented" role="radiogroup">
              {(['pareja', 'amigos'] as Category[]).map((c) => (
                <label key={c} className={form.category === c ? 'is-active' : ''}>
                  <input type="radio" name="category" checked={form.category === c} onChange={() => set('category', c)} />
                  <CategoryIcon category={c} size={16} />
                  {CATEGORY_LABEL[c]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="field">
            <legend className="field-label">¿Ya lo hicimos?</legend>
            <label className="check-toggle">
              <input
                type="checkbox"
                checked={form.status === 'realizado'}
                onChange={(e) => {
                  const checked = e.target.checked
                  setForm((f) => ({
                    ...f,
                    status: checked ? 'realizado' : 'pendiente',
                    completedAt: checked ? (f.completedAt ?? today()) : null,
                    timesDone: checked ? Math.max(f.timesDone, 1) : 0,
                  }))
                  setDirty(true)
                  setError(null)
                }}
              />
              Ya pasó, quiero anotarlo como cumplido
            </label>
          </fieldset>

          {form.status === 'realizado' ? (
            <label className="field">
              <span className="field-label">¿Qué día lo hicimos?</span>
              <input
                className="input input-date"
                type="date"
                max={today()}
                value={form.completedAt ?? ''}
                aria-invalid={Boolean(error && !form.completedAt)}
                onChange={(e) => set('completedAt', e.target.value || null)}
              />
            </label>
          ) : (
            <label className="field">
              <span className="field-label">
                Fecha límite <span className="optional">opcional</span>
              </span>
              <input
                className="input input-date"
                type="date"
                value={form.deadline ?? ''}
                onChange={(e) => set('deadline', e.target.value || null)}
              />
            </label>
          )}

          <fieldset className="field">
            <legend className="field-label">
              Tipo de lugar <span className="optional">opcional</span>
            </legend>
            <div className="tag-grid" role="radiogroup">
              <label className={form.tag === null ? 'is-active' : ''}>
                <input type="radio" name="tag" checked={form.tag === null} onChange={() => set('tag', null)} />
                Sin etiqueta
              </label>
              {TAGS.map((t) => (
                <label key={t} className={form.tag === t ? 'is-active' : ''}>
                  <input type="radio" name="tag" checked={form.tag === t} onChange={() => set('tag', t)} />
                  <TagIcon tag={t} size={15} />
                  {TAG_LABEL[t]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <span className="field-label">
              Lugar <span className="optional">opcional</span>
            </span>
            <PlacePicker value={form.place} category={form.category} tag={form.tag} onChange={(p) => set('place', p)} />
          </div>
        </div>

        {confirmDiscard ? (
          <footer className="form-foot">
            <div className="confirm">
              <p>¿Descartar los cambios sin guardar?</p>
              <div>
                <button type="button" className="btn btn-quiet" onClick={() => setConfirmDiscard(false)}>
                  Seguir editando
                </button>
                <button type="button" className="btn btn-danger" onClick={onClose}>
                  Descartar
                </button>
              </div>
            </div>
          </footer>
        ) : (
          <footer className="form-foot">
            {error && <p className="field-error">{error}</p>}
            <button type="button" className="btn btn-quiet" onClick={requestClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : plan ? 'Guardar cambios' : 'Agregar plan'}
            </button>
          </footer>
        )}
      </form>
    </Sheet>
  )
}
