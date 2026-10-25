import { Heart, Users } from 'lucide-react'
import type { Category } from '../types'

export function CategoryIcon({ category, size = 15 }: { category: Category; size?: number }) {
  const Icon = category === 'pareja' ? Heart : Users
  return <Icon size={size} strokeWidth={1.75} aria-hidden />
}
