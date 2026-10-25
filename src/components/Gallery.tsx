import { useState, type DragEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import type { Plan } from '../types'
import { usePhotos } from '../usePhotos'
import { plural } from '../utils'
import { Viewer } from './Viewer'

/** Recuerdos de un plan: sus fotos, a sangre dentro de la ficha. */
export function Gallery({ plan }: { plan: Plan }) {
  const { photos, error, uploading, reload, upload, remove } = usePhotos(plan)
  const [open, setOpen] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    upload(Array.from(e.dataTransfer.files))
  }

  const picker = (label: string, className: string) => (
    <label className={className}>
      <ImagePlus size={16} strokeWidth={1.75} aria-hidden />
      {label}
      <input
        type="file"
        accept="image/*"
        multiple
        hidden
        disabled={uploading > 0}
        onChange={(e) => {
          upload(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />
    </label>
  )

  return (
    <section
      className={`memories ${dragging ? 'is-dragging' : ''}`}
      aria-label="Recuerdos"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className="memories-head">
        <h3>Recuerdos</h3>
        {photos && photos.length > 0 && <span className="memories-count">{plural(photos.length, 'foto', 'fotos')}</span>}
        {photos && photos.length > 0 && picker(uploading ? 'Subiendo…' : 'Agregar', 'text-btn')}
      </div>

      {uploading > 0 && <p className="memories-status">Subiendo {plural(uploading, 'foto', 'fotos')}…</p>}
      {error && (
        <p className="memories-error">
          {error} <button onClick={reload}>Reintentar</button>
        </p>
      )}

      {photos === null ? (
        <div className="photo-grid" aria-busy="true">
          {Array.from({ length: Math.min(Math.max(plan.photoCount, 3), 6) }, (_, i) => (
            <span key={i} className="photo-skeleton" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="memories-empty">
          <p>Aún no hay fotos de este día. ¡Subamos las que tomamos!</p>
          {picker(uploading ? 'Subiendo…' : 'Subir fotos', 'btn btn-secondary')}
        </div>
      ) : (
        <div className="photo-grid">
          {photos.map((p, i) => (
            <button key={p.id} className="photo" onClick={() => setOpen(i)} aria-label={`Ver foto ${i + 1}`}>
              <img src={p.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {open !== null && photos && photos.length > 0 && (
        <Viewer photos={photos} start={open} title={plan.title} onClose={() => setOpen(null)} onDelete={remove} />
      )}
    </section>
  )
}
