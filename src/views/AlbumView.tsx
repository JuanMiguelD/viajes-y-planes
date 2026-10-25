import { useRef, useState, type DragEvent, type ReactNode } from 'react'
import { ChevronLeft, ImagePlus, X } from 'lucide-react'
import { Polaroid } from '../components/Polaroid'
import { Sheet } from '../components/Sheet'
import { Viewer } from '../components/Viewer'
import { usePlans } from '../store'
import { useToast } from '../toast'
import type { Plan } from '../types'
import { usePhotos, useUploader } from '../usePhotos'
import { longDate, monthTitle, plural, shortDate } from '../utils'

/** Hoja para elegir a qué plan pertenecen las fotos que vamos a subir desde el álbum. */
function UploadPicker({ onClose, onUploaded }: { onClose: () => void; onUploaded: (id: string) => void }) {
  const { plans, toggleDone } = usePlans()
  const upload = useUploader()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [target, setTarget] = useState<Plan | null>(null)

  const done = plans
    .filter((p) => p.status === 'realizado')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  const pending = plans.filter((p) => p.status === 'pendiente')

  const choose = (plan: Plan) => {
    setTarget(plan)
    input.current?.click()
  }

  const onFiles = async (files: File[]) => {
    if (!target || files.length === 0) return
    onClose()
    toast(`Subiendo ${plural(files.length, 'foto', 'fotos')}…`)
    try {
      if (target.status === 'pendiente') await toggleDone(target)
      const n = await upload(target.id, files)
      toast(`${plural(n, 'foto agregada', 'fotos agregadas')} a "${target.title}"`)
      onUploaded(target.id)
    } catch {
      toast('No se pudieron subir las fotos. Revisa la conexión e inténtalo de nuevo.')
    }
  }

  const item = (plan: Plan) => (
    <li key={plan.id}>
      <button onClick={() => choose(plan)}>
        <span className="pick-thumb">
          {plan.cover ? <img src={plan.cover.url} alt="" /> : <ImagePlus size={18} strokeWidth={1.6} aria-hidden />}
        </span>
        <span className="pick-text">
          <span className="pick-title">{plan.title}</span>
          <span className="pick-meta">
            {plan.completedAt ? longDate(plan.completedAt) : 'Se marcará como cumplido'}
            {plan.photoCount > 0 && `, ${plural(plan.photoCount, 'foto', 'fotos')}`}
          </span>
        </span>
      </button>
    </li>
  )

  return (
    <Sheet label="Subir fotos" onClose={onClose}>
      <div className="form">
        <header className="form-head">
          <h2>¿De qué plan son las fotos?</h2>
          <button className="sheet-close" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </header>
        <div className="pick-body">
          {done.length > 0 && (
            <>
              <h3 className="group-title">Cumplidos</h3>
              <ul className="pick-list">{done.map(item)}</ul>
            </>
          )}
          {pending.length > 0 && (
            <>
              <h3 className="group-title">¿Ya lo hicimos y falta marcarlo?</h3>
              <ul className="pick-list">{pending.map(item)}</ul>
            </>
          )}
          {plans.length === 0 && <p className="group-empty">Primero agreguemos un plan; las fotos siempre van con uno.</p>}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            onFiles(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />
      </div>
    </Sheet>
  )
}

/** Página del álbum de un plan: todas sus fotos en mosaico, con su propio botón para subir más. */
function AlbumPage({ plan, onBack, onOpenPlan }: { plan: Plan; onBack: () => void; onOpenPlan: (id: string) => void }) {
  const { photos, error, uploading, reload, upload, remove } = usePhotos(plan)
  const [open, setOpen] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)

  const picker = (className: string, content: ReactNode) => (
    <label className={className}>
      {content}
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
    <div
      className={`page page-wide album-page ${dragging ? 'is-dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e: DragEvent) => {
        e.preventDefault()
        setDragging(false)
        upload(Array.from(e.dataTransfer.files))
      }}
    >
      <button className="text-btn back" onClick={onBack}>
        <ChevronLeft size={18} aria-hidden />
        Álbum
      </button>
      <header className="album-page-head">
        <h1 className="album-page-title">{plan.title}</h1>
        <p className="page-intro">
          {plan.completedAt && longDate(plan.completedAt)}
          {plan.place && `, ${plan.place.name}`}
        </p>
        <div className="album-page-actions">
          {picker(
            'btn btn-primary',
            <>
              <ImagePlus size={17} aria-hidden />
              {uploading ? `Subiendo ${plural(uploading, 'foto', 'fotos')}…` : 'Subir fotos'}
            </>,
          )}
          <button className="btn btn-quiet" onClick={() => onOpenPlan(plan.id)}>
            Ver plan
          </button>
        </div>
      </header>

      {error && (
        <p className="memories-error">
          {error} <button onClick={reload}>Reintentar</button>
        </p>
      )}

      {photos === null ? (
        <div className="mosaic" aria-busy="true">
          {Array.from({ length: Math.max(plan.photoCount, 3) }, (_, i) => (
            <span key={i} className="mosaic-skeleton" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="album-empty">
          {picker(
            'album-drop',
            <>
              <ImagePlus size={28} strokeWidth={1.5} aria-hidden />
              <span className="album-drop-title">Aún no hay fotos de este día</span>
              <span>Toca para elegirlas o arrástralas aquí.</span>
            </>,
          )}
        </div>
      ) : (
        <ul className="mosaic">
          {photos.map((p, i) => (
            <li key={p.id}>
              <button onClick={() => setOpen(i)} aria-label={`Ver foto ${i + 1}`}>
                <Polaroid id={p.id}>
                  <img src={p.url} alt="" loading="lazy" />
                </Polaroid>
              </button>
            </li>
          ))}
          <li>
            {picker(
              'mosaic-add',
              <>
                <ImagePlus size={22} strokeWidth={1.6} aria-hidden />
                Agregar más
              </>,
            )}
          </li>
        </ul>
      )}

      {open !== null && photos && photos.length > 0 && (
        <Viewer photos={photos} start={open} title={plan.title} onClose={() => setOpen(null)} onDelete={remove} />
      )}
    </div>
  )
}

/** Álbum: cada plan cumplido es una polaroid, agrupadas por mes. */
export function AlbumView({ onOpenPlan, onGoToPlans }: { onOpenPlan: (id: string) => void; onGoToPlans: () => void }) {
  const { plans, getPlan } = usePlans()
  const [pageId, setPageId] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const page = pageId ? getPlan(pageId) : undefined

  const done = plans
    .filter((p) => p.status === 'realizado' && p.completedAt)
    .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!))
  const months = new Map<string, Plan[]>()
  for (const p of done) {
    const key = p.completedAt!.slice(0, 7)
    months.set(key, [...(months.get(key) ?? []), p])
  }
  const totalPhotos = done.reduce((n, p) => n + p.photoCount, 0)

  const picker = picking && (
    <UploadPicker
      onClose={() => setPicking(false)}
      onUploaded={(id) => {
        setPageId(id)
        document.querySelector('.main')?.scrollTo(0, 0)
      }}
    />
  )

  if (page) return <AlbumPage key={page.id} plan={page} onBack={() => setPageId(null)} onOpenPlan={onOpenPlan} />

  return (
    <div className="page page-wide">
      <header className="album-head">
        <div>
          <h1 className="page-title">Nuestro álbum</h1>
          {done.length > 0 && (
            <p className="page-intro">
              {plural(done.length, 'recuerdo', 'recuerdos')}, {plural(totalPhotos, 'foto', 'fotos')}
            </p>
          )}
        </div>
        {plans.length > 0 && (
          <button className="btn btn-primary" onClick={() => setPicking(true)}>
            <ImagePlus size={17} aria-hidden />
            Subir fotos
          </button>
        )}
      </header>

      {done.length === 0 ? (
        <div className="empty">
          <p>
            Cada plan que cumplamos tendrá aquí su página, con las fotos de ese día. También podemos subir fotos ahora y
            elegir de qué plan son.
          </p>
          <button className="btn btn-secondary" onClick={onGoToPlans}>
            Ir a los planes
          </button>
        </div>
      ) : (
        [...months].map(([key, items]) => (
          <section key={key} className="month">
            <h2 className="month-title">{monthTitle(`${key}-01`)}</h2>
            <ul className="album-grid">
              {items.map((p) => (
                <li key={p.id}>
                  <button className="album-item" onClick={() => setPageId(p.id)}>
                    <Polaroid
                      id={p.id}
                      stacked={p.photoCount > 1}
                      caption={p.title}
                      note={p.photoCount > 0 ? `${shortDate(p.completedAt!)}, ${plural(p.photoCount, 'foto', 'fotos')}` : shortDate(p.completedAt!)}
                    >
                      {p.cover ? (
                        <img src={p.cover.url} alt="" loading="lazy" />
                      ) : (
                        <span className="polaroid-empty">
                          <ImagePlus size={22} strokeWidth={1.5} aria-hidden />
                          Sin fotos aún
                        </span>
                      )}
                    </Polaroid>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      {picker}
    </div>
  )
}
