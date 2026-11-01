import { createContext, useContext, useRef, useState, type ReactNode } from 'react'
import { Repeat2, X } from 'lucide-react'
import { Sheet } from './components/Sheet'

type Ask = (planTitle: string) => Promise<boolean>
const ConfirmRepeatContext = createContext<Ask>(async () => false)

/**
 * Al marcar un plan como cumplido, pregunta si es de los que queremos repetir. Cerrarlo sin elegir
 * (X, scrim o Escape) cuenta como "no", pero el plan igual queda cumplido.
 */
export function ConfirmRepeatProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const ask: Ask = (planTitle) =>
    new Promise((resolve) => {
      setTitle(planTitle)
      resolver.current = resolve
    })

  const answer = (value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setTitle(null)
  }

  return (
    <ConfirmRepeatContext.Provider value={ask}>
      {children}
      {title !== null && (
        <Sheet label="¿Lo repetimos?" onClose={() => answer(false)}>
          <div className="form">
            <header className="form-head">
              <h2>¡Cumplido!</h2>
              <button type="button" className="sheet-close" onClick={() => answer(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </header>
            <div className="form-body">
              <p className="confirm-repeat-q">¿"{title}" es de esas cosas que queremos volver a hacer?</p>
            </div>
            <footer className="form-foot">
              <button type="button" className="btn btn-quiet" onClick={() => answer(false)}>
                No, fue único
              </button>
              <button type="button" className="btn btn-primary" onClick={() => answer(true)}>
                <Repeat2 size={16} strokeWidth={1.9} aria-hidden />
                Sí, para repetir
              </button>
            </footer>
          </div>
        </Sheet>
      )}
    </ConfirmRepeatContext.Provider>
  )
}

export const useConfirmRepeat = () => useContext(ConfirmRepeatContext)
