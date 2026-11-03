import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronLeft, ChevronRight, Image, Trash2, X } from 'lucide-react'
import type { Photo } from '../photos'
import { useToast } from '../toast'

/** Visor a pantalla completa: la foto ocupa todo, la interfaz se queda en los bordes. */
export function Viewer({
  photos,
  start,
  title,
  coverId,
  onClose,
  onDelete,
  onSetCover,
}: {
  photos: Photo[]
  start: number
  title: string
  /** Id de la foto que hoy es la portada, para marcarla y poder elegir otra. */
  coverId?: string | null
  onClose: () => void
  onDelete: (id: string) => Promise<void>
  onSetCover?: (photo: Photo) => Promise<void>
}) {
  const [index, setIndex] = useState(start)
  const [confirming, setConfirming] = useState(false)
  const [settingCover, setSettingCover] = useState(false)
  const toast = useToast()
  const photo = photos[Math.min(index, photos.length - 1)]
  const isCover = Boolean(photo && coverId && photo.id === coverId)
  const go = (delta: number) => {
    setConfirming(false)
    setIndex((i) => (i + delta + photos.length) % photos.length)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (photos.length === 0) onClose()
  }, [photos.length, onClose])

  if (!photo) return null

  return createPortal(
    <div className="viewer" role="dialog" aria-modal="true" aria-label={`Fotos de ${title}`}>
      <header className="viewer-bar">
        <span className="viewer-title">{title}</span>
        <span className="viewer-count">
          {index + 1} de {photos.length}
        </span>
        {confirming ? (
          <span className="viewer-confirm">
            ¿Eliminar esta foto?
            <button onClick={() => setConfirming(false)}>Cancelar</button>
            <button
              className="danger"
              onClick={async () => {
                await onDelete(photo.id)
                setConfirming(false)
                setIndex((i) => Math.max(0, Math.min(i, photos.length - 2)))
              }}
            >
              Eliminar foto
            </button>
          </span>
        ) : (
          <>
            {onSetCover && (
              <button
                className={`viewer-icon ${isCover ? 'is-active' : ''}`}
                disabled={isCover || settingCover}
                onClick={async () => {
                  setSettingCover(true)
                  try {
                    await onSetCover(photo)
                  } catch {
                    toast('No se pudo usar esa foto como portada. Inténtalo de nuevo.')
                  } finally {
                    setSettingCover(false)
                  }
                }}
                aria-label={isCover ? 'Ya es la portada' : 'Usar como portada'}
                title={isCover ? 'Ya es la portada' : 'Usar como portada'}
              >
                {isCover ? <Check size={18} /> : <Image size={18} />}
              </button>
            )}
            <button className="viewer-icon" onClick={() => setConfirming(true)} aria-label="Eliminar foto">
              <Trash2 size={18} />
            </button>
          </>
        )}
        <button className="viewer-icon" onClick={onClose} aria-label="Cerrar visor" autoFocus>
          <X size={20} />
        </button>
      </header>
      <div className="viewer-stage" onClick={onClose}>
        <img src={photo.url} alt="" onClick={(e) => e.stopPropagation()} />
      </div>
      {photos.length > 1 && (
        <>
          <button className="viewer-nav prev" onClick={() => go(-1)} aria-label="Foto anterior">
            <ChevronLeft size={26} />
          </button>
          <button className="viewer-nav next" onClick={() => go(1)} aria-label="Foto siguiente">
            <ChevronRight size={26} />
          </button>
        </>
      )}
    </div>,
    document.body,
  )
}
