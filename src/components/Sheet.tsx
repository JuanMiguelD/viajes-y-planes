import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Panel lateral en escritorio, hoja a pantalla casi completa en móvil. */
export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null)

  // Solo al montar/desmontar: si dependiera de onClose (que cambia de referencia en cada
  // render del que lo llama, por ejemplo si valida cambios sin guardar), le robaría el foco
  // al campo activo del formulario en cada tecla.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      previous?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.viewer')) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="sheet-layer">
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={panel}>
        {children}
      </div>
    </div>,
    document.body,
  )
}
