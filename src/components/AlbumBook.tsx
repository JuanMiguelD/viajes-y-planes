import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Heart, ImagePlus, MapPin, RotateCcw } from 'lucide-react'
import type { Photo } from '../photos'
import type { Plan } from '../types'
import { useAlbumPhotos } from '../useAlbumPhotos'
import { longDate, plural } from '../utils'
import { Viewer } from './Viewer'

const TURN_MS = 900
/** En el celular la hoja gira más rápido */
const TURN_MS_SINGLE = 600

/** Desde cuándo estamos juntos: lo que dicen la tapa y la dedicatoria (fijo, no depende de las fotos). */
const TOGETHER_SINCE = '2024-12-11'

type Face =
  | { kind: 'cover' }
  | { kind: 'dedication' }
  | { kind: 'section'; plan: Plan; number: number }
  | { kind: 'photos'; plan: Plan; from: number; count: number; total: number }
  | { kind: 'blank' }
  | { kind: 'end' }
  | { kind: 'back' }

function useSinglePage(): boolean {
  const query = '(max-width: 760px)'
  const [single, setSingle] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setSingle(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return single
}

/** Foto pegada en la página con esquineros; conserva su forma (vertical u horizontal). */
function Print({ photo, onOpen, load }: { photo: Photo | null; onOpen: () => void; load: boolean }) {
  return (
    <button
      type="button"
      className="print"
      disabled={!photo}
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      aria-label="Ver foto en grande"
    >
      {photo && load ? <img src={photo.url} alt="" draggable={false} /> : <span className="print-loading" />}
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
    </button>
  )
}

/**
 * El álbum como libro: tapa con título, dedicatoria y, por cada recuerdo, una página de título
 * seguida de todas sus fotos. Las hojas giran sobre el lomo (dos páginas a la vez en pantallas
 * grandes, una en el celular).
 */
export function AlbumBook({
  title,
  plans,
  pendingCount,
  onOpenPage,
  onUpload,
}: {
  title: string
  /** Planes cumplidos, del más antiguo al más reciente */
  plans: Plan[]
  pendingCount: number
  onOpenPage: (id: string) => void
  onUpload: () => void
}) {
  const single = useSinglePage()
  const { photos, failed, remove } = useAlbumPhotos(plans)
  const [turned, setTurned] = useState(0)
  const [moving, setMoving] = useState<number | null>(null)
  // Celular: hoja que está girando encima de la página (sin hojas 3D apiladas, que fallan en Safari)
  const [flip, setFlip] = useState<{ from: number; to: number } | null>(null)
  const [viewing, setViewing] = useState<{ plan: Plan; start: number } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const swipe = useRef<{ x: number; y: number } | null>(null)

  const totalPhotos = plans.reduce((n, p) => n + p.photoCount, 0)
  const perPage = single ? 1 : 2

  // Caras en orden de lectura
  const faces = useMemo(() => {
    const inner: Face[] = [{ kind: 'dedication' }]
    plans.forEach((plan, i) => {
      inner.push({ kind: 'section', plan, number: i + 1 })
      const total = photos[plan.id]?.length ?? plan.photoCount
      for (let from = 0; from < total; from += perPage) {
        inner.push({ kind: 'photos', plan, from, count: Math.min(perPage, total - from), total })
      }
    })
    if (single) return [{ kind: 'cover' }, ...inner, { kind: 'end' }] as Face[]
    if (inner.length % 2 === 0) inner.push({ kind: 'blank' })
    return [{ kind: 'cover' }, ...inner, { kind: 'end' }, { kind: 'back' }] as Face[]
  }, [plans, photos, perPage, single])

  // En doble página cada hoja tiene frente (página derecha) y dorso (izquierda); en el celular, solo frente
  const leaves = useMemo(() => {
    if (single) return faces.map((front) => ({ front, back: { kind: 'blank' } as Face }))
    const out: { front: Face; back: Face }[] = []
    for (let i = 0; i < faces.length; i += 2) out.push({ front: faces[i], back: faces[i + 1] })
    return out
  }, [faces, single])

  const maxTurned = single ? leaves.length - 1 : leaves.length

  useEffect(() => setTurned(0), [single])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  // Si se borran fotos y el libro queda más corto, no nos salimos del final
  useEffect(() => setTurned((t) => Math.min(t, maxTurned)), [maxTurned])

  const goTo = (target: number) => {
    const next = Math.min(maxTurned, Math.max(0, target))
    if (next === turned) return
    setMoving(Math.abs(next - turned) === 1 ? Math.min(next, turned) : null)
    setFlip(single && Math.abs(next - turned) === 1 ? { from: turned, to: next } : null)
    setTurned(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => (setMoving(null), setFlip(null)), single ? TURN_MS_SINGLE : TURN_MS)
  }
  const go = (delta: 1 | -1) => goTo(turned + delta)

  // Hoja a la que hay que pasar para que una cara quede a la vista
  const turnedFor = (faceIndex: number) => (single ? faceIndex : faceIndex % 2 === 0 ? faceIndex / 2 : (faceIndex + 1) / 2)
  const chapters = faces.flatMap((f, i) => (f.kind === 'section' ? [{ i, plan: f.plan, number: f.number }] : []))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('.sheet-layer, .viewer')) return
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const renderFace = (face: Face, side: 'front' | 'back', near: boolean): ReactNode => {
    switch (face.kind) {
      case 'cover':
        return (
          <div className="book-cover">
            <div className="cover-stitch">
              <Heart className="cover-heart" size={22} fill="currentColor" strokeWidth={0} aria-hidden />
              <h2 className="cover-title">{title}</h2>
              <p className="cover-since">Desde el {longDate(TOGETHER_SINCE)}</p>
              <span className="cover-hint">Toca para abrir</span>
            </div>
          </div>
        )
      case 'back':
        return (
          <div className="book-cover book-back">
            <div className="cover-stitch">
              <Heart className="cover-heart" size={22} fill="currentColor" strokeWidth={0} aria-hidden />
            </div>
          </div>
        )
      case 'dedication':
        return (
          <div className={`paper paper-${side}`}>
            <div className="dedication">
              <p className="dedication-text">
                Para nosotros,
                <br />
                por todo lo que soñamos
                <br />y fuimos cumpliendo juntos.
              </p>
              <Heart className="dedication-heart" size={18} fill="currentColor" strokeWidth={0} aria-hidden />
              <p className="dedication-stats">
                {plural(plans.length, 'recuerdo', 'recuerdos')} y {plural(totalPhotos, 'foto', 'fotos')}
                <br />
                desde el {longDate(TOGETHER_SINCE)}
              </p>
            </div>
          </div>
        )
      case 'section': {
        const { plan, number } = face
        return (
          <div className={`paper paper-${side}`}>
            <div className="section-page">
              <span className="section-number">Recuerdo {number}</span>
              <h3 className="section-title">{plan.title}</h3>
              <span className="section-rule" aria-hidden>
                <Heart size={12} fill="currentColor" strokeWidth={0} />
              </span>
              <p className="section-date">{longDate(plan.completedAt!)}</p>
              {plan.place && (
                <p className="section-place">
                  <MapPin size={14} strokeWidth={2} aria-hidden />
                  {plan.place.name}
                </p>
              )}
              {plan.description && <p className="section-note">{plan.description}</p>}
              {plan.photoCount > 0 ? (
                <p className="section-count">
                  {plural(plan.photoCount, 'foto', 'fotos')}
                  {failed.has(plan.id) && ' (no se pudieron cargar; revisa la conexión)'}
                </p>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenPage(plan.id)
                  }}
                >
                  <ImagePlus size={15} aria-hidden />
                  Agregar fotos
                </button>
              )}
            </div>
          </div>
        )
      }
      case 'photos': {
        const { plan, from, count, total } = face
        const list = photos[plan.id]
        return (
          <div className={`paper paper-${side}`}>
            <div className={`photo-page has-${count}`}>
              <p className="photo-page-head">{plan.title}</p>
              <div className="photo-page-prints">
                {Array.from({ length: count }, (_, k) => (
                  <div className="print-slot" key={k}>
                    <Print
                      photo={list?.[from + k] ?? null}
                      load={near}
                      onOpen={() => list && setViewing({ plan, start: from + k })}
                    />
                  </div>
                ))}
              </div>
              <p className="photo-page-foot">
                {count === 1 ? `${from + 1} de ${total}` : `${from + 1}–${from + count} de ${total}`}
              </p>
            </div>
          </div>
        )
      }
      case 'end':
        return (
          <div className={`paper paper-${side}`}>
            <div className="dedication">
              <p className="end-title">Continuará…</p>
              <p className="dedication-stats">
                {pendingCount > 0
                  ? `Todavía nos faltan ${plural(pendingCount, 'plan', 'planes')} por llenar estas páginas.`
                  : 'Cada plan que cumplamos tendrá aquí sus páginas.'}
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={(e) => {
                  e.stopPropagation()
                  onUpload()
                }}
              >
                <ImagePlus size={15} aria-hidden />
                Subir fotos
              </button>
            </div>
          </div>
        )
      case 'blank':
        return <div className={`paper paper-${side} paper-blank`} />
    }
  }

  const visibleFace = (leaf: number, side: 'front' | 'back') =>
    side === 'front' ? leaf === turned : !single && leaf === turned - 1
  const closedFront = turned === 0
  const closedBack = !single && turned === leaves.length

  // Indicador: el recuerdo que está a la vista
  const shown: Face[] = []
  if (!single && turned > 0) shown.push(leaves[turned - 1].back)
  if (turned < leaves.length) shown.push(leaves[turned].front)
  const withPlan = shown.find((f) => f.kind === 'section' || f.kind === 'photos') as
    | Extract<Face, { kind: 'section' | 'photos' }>
    | undefined
  const NAMES: Partial<Record<Face['kind'], string>> = { cover: 'Tapa', back: 'Contratapa', dedication: 'Dedicatoria', end: 'Continuará…' }
  const position = withPlan ? withPlan.plan.title : (shown.map((f) => NAMES[f.kind]).find(Boolean) ?? '')
  const currentChapter = withPlan ? chapters.find((c) => c.plan.id === withPlan.plan.id)?.i : undefined

  return (
    <section className="album-book" aria-label={`Álbum: ${title}`} aria-roledescription="libro">
      <div
        className="book-stage"
        onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          const start = swipe.current
          swipe.current = null
          if (!start) return
          const dx = e.clientX - start.x
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(e.clientY - start.y)) go(dx < 0 ? 1 : -1)
        }}
      >
        {single ? (
          <div className="book is-single">
            {/* Al avanzar, debajo ya está la página nueva y la vieja gira hacia la izquierda;
                al volver, debajo sigue la actual y la anterior entra girando. */}
            <div className="single-page" key={`p${flip && flip.to < flip.from ? flip.from : turned}`} onClick={() => go(1)}>
              {renderFace(faces[flip && flip.to < flip.from ? flip.from : turned], 'front', true)}
            </div>
            {flip && (
              <div
                className={`single-page single-turn ${flip.to > flip.from ? 'turn-out' : 'turn-in'}`}
                key={`f${flip.from}-${flip.to}`}
                aria-hidden
                inert
              >
                {renderFace(faces[flip.to > flip.from ? flip.from : flip.to], 'front', true)}
              </div>
            )}
          </div>
        ) : (
          <div
            className={`book is-double ${closedFront ? 'is-closed-front' : ''} ${closedBack ? 'is-closed-back' : ''}`}
          >
            {leaves.map((leaf, i) => {
              const isTurned = i < turned
              const z = moving === i ? leaves.length + 2 : isTurned ? i + 1 : leaves.length - i
              // Solo cargamos las fotos de las hojas cercanas a la que estamos viendo
              const near = Math.abs(i - turned) <= 2
              return (
                <div key={i} className={`leaf ${isTurned ? 'is-turned' : ''}`} style={{ zIndex: z }}>
                  <div className="face face-front" onClick={() => go(1)} inert={!visibleFace(i, 'front')}>
                    {renderFace(leaf.front, 'front', near)}
                  </div>
                  <div className="face face-back" onClick={() => go(-1)} inert={!visibleFace(i, 'back')}>
                    {renderFace(leaf.back, 'back', near)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <nav className="book-nav" aria-label="Pasar páginas">
        <button className="icon-btn book-arrow" onClick={() => go(-1)} disabled={turned === 0} aria-label="Página anterior">
          <ChevronLeft size={22} />
        </button>
        <span className="book-position" aria-live="polite">
          {position}
        </span>
        <button className="icon-btn book-arrow" onClick={() => go(1)} disabled={turned === maxTurned} aria-label="Página siguiente">
          <ChevronRight size={22} />
        </button>
        <div className="book-tools">
          {chapters.length > 1 && (
            <select
              className="book-jump"
              aria-label="Ir a un recuerdo"
              value={currentChapter ?? ''}
              onChange={(e) => e.target.value !== '' && goTo(turnedFor(Number(e.target.value)))}
            >
              <option value="" disabled>
                Ir a…
              </option>
              {chapters.map((c) => (
                <option key={c.plan.id} value={c.i}>
                  {c.number}. {c.plan.title}
                </option>
              ))}
            </select>
          )}
          {turned > 1 && (
            <button className="text-btn book-restart" onClick={() => goTo(0)}>
              <RotateCcw size={14} aria-hidden />
              Volver a la tapa
            </button>
          )}
        </div>
      </nav>

      {viewing && photos[viewing.plan.id]?.length ? (
        <Viewer
          photos={photos[viewing.plan.id]}
          start={viewing.start}
          title={viewing.plan.title}
          coverId={viewing.plan.cover?.id}
          onClose={() => setViewing(null)}
          onDelete={(id) => remove(viewing.plan, id)}
        />
      ) : null}
    </section>
  )
}
