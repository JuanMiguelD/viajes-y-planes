import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import {
  DEFAULT_TEMPLATE,
  getTemplate,
  notificationsSupported,
  REMINDER_DAYS_BEFORE,
  requestPermission,
  setTemplate,
} from '../notifications'
import { useToast } from '../toast'
import { Sheet } from './Sheet'

/** Avisos del próximo plan con fecha, con la frase editable desde aquí. */
export function ReminderSettings({ onClose }: { onClose: () => void }) {
  const supported = notificationsSupported()
  const [permission, setPermission] = useState<NotificationPermission>(supported ? Notification.permission : 'denied')
  const [template, setDraft] = useState(getTemplate())
  const [requesting, setRequesting] = useState(false)
  const toast = useToast()

  const enable = async () => {
    setRequesting(true)
    const result = await requestPermission()
    setPermission(result)
    setRequesting(false)
    if (result === 'granted') toast('Listo, avisaremos del próximo plan con fecha.')
  }

  const save = () => {
    setTemplate(template)
    toast('Frase guardada')
    onClose()
  }

  return (
    <Sheet label="Recordatorios" onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <header className="form-head">
          <h2>Recordatorios</h2>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </header>

        <div className="form-body">
          {!supported ? (
            <p className="field-hint">Este navegador no admite notificaciones.</p>
          ) : permission === 'granted' ? (
            <p className="field-hint">
              <Bell size={15} strokeWidth={1.75} aria-hidden /> Activadas: avisamos del próximo plan con fecha, {REMINDER_DAYS_BEFORE}{' '}
              días antes.
            </p>
          ) : permission === 'denied' ? (
            <p className="field-hint">Están bloqueadas para este sitio. Actívalas desde los ajustes del navegador o del celular.</p>
          ) : (
            <button type="button" className="btn btn-primary" onClick={enable} disabled={requesting}>
              <Bell size={16} strokeWidth={1.9} aria-hidden />
              {requesting ? 'Pidiendo permiso…' : 'Activar notificaciones'}
            </button>
          )}

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
              Se completa sola con <code>{'{titulo}'}</code> y <code>{'{cuando}'}</code>.
            </span>
          </label>
        </div>

        <footer className="form-foot">
          <button type="button" className="btn btn-quiet" onClick={() => setDraft(DEFAULT_TEMPLATE)}>
            Restablecer
          </button>
          <button type="submit" className="btn btn-primary">
            Guardar
          </button>
        </footer>
      </form>
    </Sheet>
  )
}
