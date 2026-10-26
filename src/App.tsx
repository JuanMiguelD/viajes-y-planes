import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { BookHeart, Heart, ListChecks, LogOut, Map as MapIcon, Plus, Repeat2, type LucideIcon } from 'lucide-react'
import { AuthGate } from './components/AuthGate'
import { PlanDetail } from './components/PlanDetail'
import { PlanForm } from './components/PlanForm'
import { firebaseEnabled } from './firebase'
import { GOOGLE_MAPS_API_KEY, mapsEnabled } from './maps'
import { PlansProvider, usePlans } from './store'
import { ToastProvider } from './toast'
import { AlbumView } from './views/AlbumView'
import { MapView } from './views/MapView'
import { PlansView } from './views/PlansView'
import { RepeatView } from './views/RepeatView'

type Tab = 'planes' | 'mapa' | 'repetir' | 'recuerdos'

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'planes', label: 'Planes', icon: ListChecks },
  { id: 'mapa', label: 'Mapa', icon: MapIcon },
  { id: 'repetir', label: 'Para repetir', icon: Repeat2 },
  { id: 'recuerdos', label: 'Álbum', icon: BookHeart },
]

function tabFromHash(): Tab {
  const hash = window.location.hash.slice(1)
  return TABS.some((t) => t.id === hash) ? (hash as Tab) : 'planes'
}

function Shell({ onLogout }: { onLogout: (() => void) | null }) {
  const { plans, error } = usePlans()
  const [tab, setTabState] = useState<Tab>(tabFromHash)
  const [selected, setSelected] = useState<string | null>(null)
  const [mapFocus, setMapFocus] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const onHash = () => setTabState(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const setTab = (t: Tab) => {
    if (t !== 'mapa') setMapFocus(null)
    window.history.pushState(null, '', `#${t}`)
    setTabState(t)
  }

  const showOnMap = (id: string) => {
    setSelected(null)
    setMapFocus(id)
    setTab('mapa')
  }

  const closeDetail = useCallback(() => setSelected(null), [])
  const closeForm = useCallback(() => setCreating(false), [])

  const counts: Partial<Record<Tab, number>> = {
    planes: plans.filter((p) => p.status === 'pendiente').length,
    repetir: plans.filter((p) => p.status === 'realizado' && p.repeat).length,
  }

  return (
    <div className={`shell shell-${tab}`}>
      <header className="masthead">
        <span className="brand">
          <Heart className="icon-heart" size={18} strokeWidth={2.4} fill="currentColor" aria-hidden />
          Nuestros planes
        </span>
        <button className="btn btn-primary btn-new" onClick={() => setCreating(true)}>
          <Plus size={17} strokeWidth={2.2} aria-hidden />
          <span>Nuevo plan</span>
        </button>
      </header>

      <nav className="nav" aria-label="Secciones">
        {TABS.map(({ id, label, icon: Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={tab === id ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault()
              setTab(id)
            }}
          >
            <Icon size={20} strokeWidth={1.75} aria-hidden />
            <span className="nav-label">{label}</span>
            {counts[id] ? <span className="nav-count">{counts[id]}</span> : null}
          </a>
        ))}
      </nav>

      <div className="account">
        {!firebaseEnabled && (
          <p className="local-note">Modo local: los planes y las fotos solo se guardan en este navegador.</p>
        )}
        {onLogout && (
          <button className="text-btn" onClick={onLogout}>
            <LogOut size={15} strokeWidth={1.75} aria-hidden />
            Cerrar sesión
          </button>
        )}
      </div>

      <main className="main">
        {error ? (
          <div className="page">
            <div className="empty empty-error">
              {error === 'permission-denied' ? (
                <>
                  <h1 className="page-title">Esta cuenta no tiene acceso</h1>
                  <p>
                    Solo pueden entrar las cuentas que aparecen en las reglas de Firebase. Cierra sesión y entra con la
                    tuya o con la de tu novia.
                  </p>
                  {onLogout && (
                    <button className="btn btn-secondary" onClick={onLogout}>
                      Cerrar sesión
                    </button>
                  )}
                </>
              ) : (
                <>
                  <h1 className="page-title">No se pudieron cargar los planes</h1>
                  <p>{error}</p>
                  <button className="btn btn-secondary" onClick={() => window.location.reload()}>
                    Volver a intentarlo
                  </button>
                </>
              )}
            </div>
          </div>
        ) : tab === 'planes' ? (
          <PlansView onOpen={setSelected} onCreate={() => setCreating(true)} />
        ) : tab === 'mapa' ? (
          <MapView focusId={mapFocus} onOpen={setSelected} onCreate={() => setCreating(true)} />
        ) : tab === 'repetir' ? (
          <RepeatView onOpen={setSelected} onGoToPlans={() => setTab('planes')} />
        ) : (
          <AlbumView onOpenPlan={setSelected} onGoToPlans={() => setTab('planes')} />
        )}
      </main>

      {selected && <PlanDetail planId={selected} onClose={closeDetail} onShowOnMap={showOnMap} />}
      {creating && <PlanForm onClose={closeForm} />}
    </div>
  )
}

function Providers({ children }: { children: ReactNode }) {
  return mapsEnabled ? <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>{children}</APIProvider> : <>{children}</>
}

export default function App() {
  return (
    <Providers>
      <ToastProvider>
        <AuthGate>
          {(logout) => (
            <PlansProvider>
              <Shell onLogout={logout} />
            </PlansProvider>
          )}
        </AuthGate>
      </ToastProvider>
    </Providers>
  )
}
