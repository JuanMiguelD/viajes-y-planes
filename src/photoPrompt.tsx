import { createContext, useContext, useRef, type ReactNode } from 'react'
import { useToast } from './toast'
import { useUploader } from './usePhotos'
import { plural } from './utils'

type Prompt = (planId: string, planTitle: string) => void
const PhotoPromptContext = createContext<Prompt>(() => {})

/**
 * Pide las fotos de un plan desde cualquier parte de la app (por ejemplo, al repetir uno desde el
 * mapa o la lista), sin tener que abrir su ficha. Reutiliza el mismo subidor que el álbum.
 */
export function PhotoPromptProvider({ children }: { children: ReactNode }) {
  const upload = useUploader()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const target = useRef<{ id: string; title: string } | null>(null)

  const prompt: Prompt = (id, title) => {
    target.current = { id, title }
    input.current?.click()
  }

  const onFiles = async (files: File[]) => {
    const t = target.current
    if (!t || files.length === 0) return
    toast(`Subiendo ${plural(files.length, 'foto', 'fotos')}…`)
    try {
      const n = await upload(t.id, files)
      toast(`${plural(n, 'foto agregada', 'fotos agregadas')} a "${t.title}"`)
    } catch {
      toast('No se pudieron subir las fotos. Revisa la conexión e inténtalo de nuevo.')
    }
  }

  return (
    <PhotoPromptContext.Provider value={prompt}>
      {children}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          onFiles(files)
        }}
      />
    </PhotoPromptContext.Provider>
  )
}

export const usePhotoPrompt = () => useContext(PhotoPromptContext)
