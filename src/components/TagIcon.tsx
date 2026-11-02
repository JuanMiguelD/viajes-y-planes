import { useAppSettings } from '../appSettings'
import { resolveTagIcon } from '../tagIcons'
import type { Tag } from '../types'

export function TagIcon({ tag, size = 15 }: { tag: Tag; size?: number }) {
  const { settings } = useAppSettings()
  const Icon = resolveTagIcon(settings.tags.find((t) => t.id === tag)?.icon)
  return <Icon size={size} strokeWidth={1.75} aria-hidden />
}
