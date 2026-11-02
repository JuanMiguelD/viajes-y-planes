import { useRef, useState } from 'react'
import { Bell, Plus, Trash2, X } from 'lucide-react'
import { useAppSettings, type AppSettings } from '../appSettings'
import {
  DEFAULT_TEMPLATE,
  getTemplate,
  notificationsSupported,
  REMINDER_DAYS_BEFORE,
  requestPermission,
  setTemplate,
} from '../notifications'
import { DEFAULT_TAG_ICON, ICON_OPTIONS, resolveTagIcon } from '../tagIcons'
import { applyTheme, DEFAULT_THEME, type ThemeColors } from '../theme'
import { useToast } from '../toast'
import { Sheet } from './Sheet'

const COLOR_FIELDS: { key: keyof ThemeColors; label: string }[] = [
  { key: 'paper', label: 'Fondo' },
  { key: 'coffee', label: 'Botones' },
  { key: 'heart', label: 'Íconos' },
]

/** Botón con el ícono actual de una etiqueta; al tocarlo abre la cuadrícula para elegir otro. */
function IconPicker({ value, onPick, onClose }: { value: string; onPick: (icon: string) => void; onClose: () => void }) {
  return (
    <>
      <div className="icon-picker-scrim" onClick={onClose} />
      <div className="icon-picker" role="dialog" aria-label="Elegir ícono">
        <div className="icon-picker-grid">
          {Object.entries(ICON_OPTIONS).map(([name, Icon]) => (
            <button
              key={name}
              type="button"
              className={name === value ? 'is-current' : ''}
              onClick={() => onPick(name)}
              aria-label={name}
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

/** Ajustes de la app: recordatorios (por navegador), y colores y etiquetas, compartidos entre los dos. */
export function Settings({ onClose }: { onClose: () => void }) {
  const supported = notificationsSupported()
  const [permission, setPermission] = useState<NotificationPermission>(supported ? Notification.permission : 'denied')
  const [requesting, setRequesting] = useState(false)
  const [template, setDraft] = useState(getTemplate())
  const { settings, saveSettings } = useAppSettings()
  const [colors, setColors] = useState<ThemeColors>(settings.theme)
  const [tags, setTags] = useState(settings.tags)
  const [pickingIconFor, setPickingIconFor] = useState<string | null>(null)
  const originalColors = useRef(settings.theme).current
  const toast = useToast()

  const setColor = (key: keyof ThemeColors, value: string) => {
    const next = { ...colors, [key]: value }
    setColors(next)
    applyTheme(next) // vista previa en vivo mientras elegimos
  }

  const resetColors = () => {
    setColors(DEFAULT_THEME)
    applyTheme(DEFAULT_THEME)
  }

  const addTag = () => {
    setTags((list) => [...list, { id: crypto.randomUUID(), label: '', icon: DEFAULT_TAG_ICON }])
  }

  const renameTag = (id: string, label: string) => {
    setTags((list) => list.map((t) => (t.id === id ? { ...t, label } : t)))
  }

  const setTagIcon = (id: string, icon: string) => {
    setTags((list) => list.map((t) => (t.id === id ? { ...t, icon } : t)))
    setPickingIconFor(null)
  }

  const removeTag = (id: string) => {
    setTags((list) => list.filter((t) => t.id !== id))
  }

  const enable = async () => {
    setRequesting(true)
    const result = await requestPermission()
    setPermission(result)
    setRequesting(false)
    if (result === 'granted') toast('Listo, avisaremos del próximo plan con fecha.')
  }

  // Si cerramos sin guardar, la vista previa de colores no debe quedarse puesta.
  const cancel = () => {
    applyTheme(originalColors)
    onClose()
  }

  const save = async () => {
    setTemplate(template)
    const cleanTags = tags.map((t) => ({ ...t, label: t.label.trim() })).filter((t) => t.label)
    const next: AppSettings = { theme: colors, tags: cleanTags }
    await saveSettings(next)
    toast('Ajustes guardados')
    onClose()
  }

  return (
    <Sheet label="Ajustes" onClose={cancel}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <header className="form-head">
          <h2>Ajustes</h2>
          <button type="button" className="sheet-close" onClick={cancel} aria-label="Cerrar">
            <X size={20} />
          </button>
        </header>

        <div className="form-body">
          <fieldset className="field">
            <legend className="field-label">Recordatorios</legend>
            {!supported ? (
              <p className="field-hint">Este navegador no admite notificaciones.</p>
            ) : permission === 'granted' ? (
              <p className="field-hint">
                <Bell size={15} strokeWidth={1.75} aria-hidden /> Activadas: avisamos del próximo plan con fecha,{' '}
                {REMINDER_DAYS_BEFORE} días antes.
              </p>
            ) : permission === 'denied' ? (
              <p className="field-hint">Están bloqueadas para este sitio. Actívalas desde los ajustes del navegador o del celular.</p>
            ) : (
              <button type="button" className="btn btn-primary" onClick={enable} disabled={requesting}>
                <Bell size={16} strokeWidth={1.9} aria-hidden />
                {requesting ? 'Pidiendo permiso…' : 'Activar notificaciones'}
              </button>
            )}
          </fieldset>

          <label className="field">
            <span className="field-label">Frase del recordatorio</span>
            <textarea
              className="input"
              rows={3}
              value={template}
              placeholder={DEFAULT_TEMPLATE}
              onChange={(e) => setDraft(e.target.value)}
            />
            <span className="field-hint">
              Se completa sola con <code>{'{titulo}'}</code> y <code>{'{cuando}'}</code>. Esta frase es solo de este
              celular.
            </span>
          </label>

          <fieldset className="field">
            <legend className="field-label">Colores</legend>
            <div className="color-fields">
              {COLOR_FIELDS.map(({ key, label }) => (
                <label key={key} className="color-field">
                  <input type="color" value={colors[key]} onChange={(e) => setColor(key, e.target.value)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <button type="button" className="text-btn" onClick={resetColors}>
              Restablecer colores
            </button>
          </fieldset>

          <fieldset className="field">
            <legend className="field-label">Etiquetas de tipo de lugar</legend>
            <div className="tag-label-list">
              {tags.map((t) => {
                const Icon = resolveTagIcon(t.icon)
                return (
                  <div key={t.id} className="tag-label-row">
                    <button
                      type="button"
                      className="tag-icon-btn"
                      onClick={() => setPickingIconFor(t.id)}
                      aria-label="Elegir ícono"
                    >
                      <Icon size={16} strokeWidth={1.75} aria-hidden />
                    </button>
                    <input
                      className="input"
                      value={t.label}
                      placeholder="Nombre de la etiqueta"
                      onChange={(e) => renameTag(t.id, e.target.value)}
                    />
                    <button type="button" className="icon-btn" onClick={() => removeTag(t.id)} aria-label="Eliminar etiqueta">
                      <Trash2 size={15} strokeWidth={1.75} aria-hidden />
                    </button>
                    {pickingIconFor === t.id && (
                      <IconPicker value={t.icon} onPick={(icon) => setTagIcon(t.id, icon)} onClose={() => setPickingIconFor(null)} />
                    )}
                  </div>
                )
              })}
            </div>
            <button type="button" className="text-btn" onClick={addTag}>
              <Plus size={15} strokeWidth={2} aria-hidden />
              Agregar etiqueta
            </button>
            <span className="field-hint">Los colores y las etiquetas se comparten entre los dos.</span>
          </fieldset>
        </div>

        <footer className="form-foot">
          <button type="button" className="btn btn-quiet" onClick={cancel}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            Guardar cambios
          </button>
        </footer>
      </form>
    </Sheet>
  )
}
