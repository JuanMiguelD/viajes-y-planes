import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { usePlans } from '../store'
import { useToast } from '../toast'
import { CATEGORY_LABEL, type Category, type Plan, type PlanInput } from '../types'
import { CategoryIcon } from './CategoryIcon'
import { PlacePicker } from './PlacePicker'
import { Sheet } from './Sheet'

const EMPTY: PlanInput = {
  title: '',
  description: '',
  category: 'pareja',
  status: 'pendiente',
  repeat: false,
  deadline: null,
  place: null,
  completedAt: null,
  timesDone: 0,
  cover: null,
  photoCount: 0,
}

export function PlanForm({ plan, onClose }: { plan?: Plan; onClose: () => void }) {
  const { addPlan, updatePlan } = usePlans()
  const toast = useToast()
  const [form, setForm] = useState<PlanInput>(plan ?? EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof PlanInput>(key: K, value: PlanInput[K]) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) return setError('Ponle un nombre al plan.')
    setSaving(true)
    const data = { ...form, title, description: form.description.trim() }
    try {
      if (plan) {
        const { description, category, deadline, place } = data
        await updatePlan(plan.id, { title, description, category, deadline, place })
        toast('Cambios guardados')
      } else {
        await addPlan(data)
        toast(`"${title}" ya está en nuestra lista`)
      }
      onClose()
    } catch {
      setError('No se pudo guardar. Revisa la conexión e inténtalo de nuevo.')
      setSaving(false)
    }
  }

  return (
    <Sheet label={plan ? 'Editar plan' : 'Nuevo plan'} onClose={onClose}>
      <form className="form" onSubmit={submit} noValidate>
        <header className="form-head">
          <h2>{plan ? 'Editar plan' : 'Nuevo plan'}</h2>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Cerrar">
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

          <div className="field">
            <span className="field-label">
              Lugar <span className="optional">opcional</span>
            </span>
            <PlacePicker value={form.place} category={form.category} onChange={(p) => set('place', p)} />
          </div>
        </div>

        <footer className="form-foot">
          {error && <p className="field-error">{error}</p>}
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : plan ? 'Guardar cambios' : 'Agregar plan'}
          </button>
        </footer>
      </form>
    </Sheet>
  )
}
