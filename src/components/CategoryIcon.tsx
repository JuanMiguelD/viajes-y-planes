import { Heart, Users } from 'lucide-react'
import type { Category } from '../types'

export function CategoryIcon({ category, size = 15 }: { category: Category; size?: number }) {
  if (category === 'pareja') return <Heart className="icon-heart" size={size} strokeWidth={1.75} aria-hidden />
  return <Users size={size} strokeWidth={1.75} aria-hidden />
}
