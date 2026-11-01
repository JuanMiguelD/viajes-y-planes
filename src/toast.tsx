import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

interface ToastAction {
  label: string
  run: () => void
}

interface Toast {
  id: number
  message: string
  actions: ToastAction[]
}

type Show = (message: string, actions?: ToastAction | ToastAction[]) => void
const ToastContext = createContext<Show>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback<Show>((message, actions) => {
    window.clearTimeout(timer.current)
    const list = actions ? (Array.isArray(actions) ? actions : [actions]) : []
    setToast({ id: Date.now(), message, actions: list })
    timer.current = window.setTimeout(() => setToast(null), list.length ? 6000 : 3500)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.id}>
            <span>{toast.message}</span>
            {toast.actions.map((a) => (
              <button
                key={a.label}
                onClick={() => {
                  a.run()
                  setToast(null)
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
