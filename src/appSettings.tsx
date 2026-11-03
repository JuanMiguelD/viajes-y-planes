import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { applyTheme, DEFAULT_THEME, type ThemeColors } from './theme'

export interface TagDef {
  id: string
  label: string
  icon: string
}

export const DEFAULT_TAGS: TagDef[] = [
  { id: 'restaurante', label: 'Restaurante', icon: 'UtensilsCrossed' },
  { id: 'cafeteria', label: 'Cafetería', icon: 'Coffee' },
  { id: 'parque', label: 'Parque', icon: 'Trees' },
  { id: 'bar', label: 'Bar', icon: 'Wine' },
  { id: 'hotel', label: 'Hotel', icon: 'BedDouble' },
  { id: 'playa', label: 'Playa', icon: 'Waves' },
  { id: 'museo', label: 'Museo', icon: 'Landmark' },
  { id: 'mirador', label: 'Mirador', icon: 'Binoculars' },
  { id: 'evento', label: 'Evento', icon: 'PartyPopper' },
]

export interface AppSettings {
  theme: ThemeColors
  tags: TagDef[]
}

const DEFAULT_SETTINGS: AppSettings = { theme: DEFAULT_THEME, tags: DEFAULT_TAGS }
const LOCAL_KEY = 'viajesyplanes.settings'

function readCache(): AppSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}')
    return {
      theme: { ...DEFAULT_THEME, ...stored.theme },
      tags: Array.isArray(stored.tags) && stored.tags.length > 0 ? stored.tags : DEFAULT_TAGS,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function writeCache(settings: AppSettings): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(settings))
}

/** Aplica el tema de la caché local antes de montar, para que no haya parpadeo con los colores por defecto. */
export function applyCachedTheme(): void {
  applyTheme(readCache().theme)
}

interface SettingsStore {
  settings: AppSettings
  saveSettings: (next: AppSettings) => Promise<void>
}

const SettingsContext = createContext<SettingsStore>({ settings: DEFAULT_SETTINGS, saveSettings: async () => {} })

/**
 * Colores y etiquetas de tipo de lugar: se comparten entre los dos guardándose en Firestore
 * (config/settings), con una copia en este navegador para no parpadear mientras llega. Sin
 * Firebase configurado, viven solo en este navegador.
 */
export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(readCache)

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  useEffect(() => {
    if (!db) return
    return onSnapshot(
      doc(db, 'config', 'settings'),
      (snap) => {
        if (!snap.exists()) return
        const data = snap.data() as Partial<AppSettings>
        const next: AppSettings = {
          theme: { ...DEFAULT_THEME, ...data.theme },
          tags: Array.isArray(data.tags) && data.tags.length > 0 ? data.tags : DEFAULT_TAGS,
        }
        setSettings(next)
        writeCache(next)
      },
      // Si falla (por ejemplo, sin conexión), seguimos con la última copia conocida.
      () => undefined,
    )
  }, [])

  const saveSettings = async (next: AppSettings) => {
    setSettings(next)
    writeCache(next)
    if (db) await setDoc(doc(db, 'config', 'settings'), next)
  }

  return <SettingsContext.Provider value={{ settings, saveSettings }}>{children}</SettingsContext.Provider>
}

export const useAppSettings = () => useContext(SettingsContext)

/** Nombre de una etiqueta por su id; si ya no existe (se borró), muestra el id tal cual. */
export function useTagLabel(id: string | null | undefined): string {
  const { settings } = useAppSettings()
  if (!id) return ''
  return settings.tags.find((t) => t.id === id)?.label ?? id
}
