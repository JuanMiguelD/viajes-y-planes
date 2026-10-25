import type { CSSProperties, ReactNode } from 'react'

/** Inclinación pequeña y estable por id, para que el álbum no parezca una cuadrícula rígida. */
export function tilt(id: string): number {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0
  return ((Math.abs(h) % 5) - 2) * 0.6
}

export function Polaroid({
  id,
  stacked = false,
  children,
  caption,
  note,
}: {
  id: string
  stacked?: boolean
  children: ReactNode
  caption?: string
  note?: string
}) {
  return (
    <span className={`polaroid ${stacked ? 'is-stacked' : ''}`} style={{ '--tilt': `${tilt(id)}deg` } as CSSProperties}>
      <span className="polaroid-photo">{children}</span>
      {caption && <span className="polaroid-caption">{caption}</span>}
      {note && <span className="polaroid-note">{note}</span>}
    </span>
  )
}
