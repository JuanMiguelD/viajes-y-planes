import { BedDouble, Binoculars, Coffee, Landmark, PartyPopper, Trees, UtensilsCrossed, Waves, Wine, type LucideIcon } from 'lucide-react'
import type { Tag } from '../types'

const ICON: Record<Tag, LucideIcon> = {
  restaurante: UtensilsCrossed,
  cafeteria: Coffee,
  parque: Trees,
  bar: Wine,
  hotel: BedDouble,
  playa: Waves,
  museo: Landmark,
  mirador: Binoculars,
  evento: PartyPopper,
}

export function TagIcon({ tag, size = 15 }: { tag: Tag; size?: number }) {
  const Icon = ICON[tag]
  return <Icon size={size} strokeWidth={1.75} aria-hidden />
}
