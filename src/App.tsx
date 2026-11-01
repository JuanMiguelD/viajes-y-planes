import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { Bell, BookHeart, CalendarDays, Heart, ListChecks, LogOut, Map as MapIcon, Plus, type LucideIcon } from 'lucide-react'
import { AuthGate } from './components/AuthGate'
import { PlanDetail } from './components/PlanDetail'
import { PlanForm } from './components/PlanForm'
import { ReminderSettings } from './components/ReminderSettings'
import { firebaseEnabled } from './firebase'
import { GOOGLE_MAPS_API_KEY, mapsEnabled } from './maps'
import { checkReminders } from './notifications'
import { PhotoPromptProvider } from './photoPrompt'
import { PlansProvider, usePlans } from './store'
import { ToastProvider } from './toast'
import usImage from './components/us.png'
import { AlbumView } from './views/AlbumView'
import { CalendarView } from './views/CalendarView'
import { MapView } from './views/MapView'
import { PlansView } from './views/PlansView'
import { RepeatView } from './views/RepeatView'

type Tab = 'planes' | 'mapa' | 'repetir' | 'calendario' | 'recuerdos'

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'planes', label: 'Planes', icon: ListChecks },
  { id: 'mapa', label: 'Mapa', icon: MapIcon },
  { id: 'repetir', label: 'Favoritos', icon: Heart },
  { id: 'calendario', label: 'Calendario', icon: CalendarDays },
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
  const [editOnOpen, setEditOnOpen] = useState(false)
  const [mapFocus, setMapFocus] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingReminders, setEditingReminders] = useState(false)

  useEffect(() => {
    const onHash = () => setTabState(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Revisa si toca avisar del próximo plan con fecha: al entrar y cada 30 minutos mientras la app está abierta.
  useEffect(() => {
    checkReminders(plans)
    const id = window.setInterval(() => checkReminders(plans), 30 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [plans])

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

  // Abre un plan para verlo; "openForEdit" lo abre directo en edición (al repetir uno, por ejemplo).
  const openView = useCallback((id: string) => {
    setEditOnOpen(false)
    setSelected(id)
  }, [])
  const openForEdit = useCallback((id: string) => {
    setEditOnOpen(true)
    setSelected(id)
  }, [])
  const closeDetail = useCallback(() => setSelected(null), [])
  const closeForm = useCallback(() => setCreating(false), [])

  const counts: Partial<Record<Tab, number>> = {
    planes: plans.filter((p) => p.status === 'pendiente').length,
    repetir: plans.filter((p) => p.favorite || (p.status === 'realizado' && p.repeat)).length,
  }

  return (
    <div className={`shell shell-${tab}`}>
      <header className="masthead">
        <span className="brand">
          <img className="brand-photo" src={usImage} alt="" aria-hidden />
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
        <button className="text-btn" onClick={() => setEditingReminders(true)}>
          <Bell size={15} strokeWidth={1.75} aria-hidden />
          Recordatorios
        </button>
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
          <PlansView onOpen={openView} onCreate={() => setCreating(true)} />
        ) : tab === 'mapa' ? (
          <MapView focusId={mapFocus} onOpen={openView} onCreate={() => setCreating(true)} />
        ) : tab === 'repetir' ? (
          <RepeatView onOpen={openView} onOpenEdit={openForEdit} onGoToPlans={() => setTab('planes')} />
        ) : tab === 'calendario' ? (
          <CalendarView onOpen={openView} />
        ) : (
          <AlbumView onOpenPlan={openView} onGoToPlans={() => setTab('planes')} />
        )}
      </main>

      {selected && (
        <PlanDetail
          key={selected}
          planId={selected}
          startInEdit={editOnOpen}
          onClose={closeDetail}
          onShowOnMap={showOnMap}
          onRepeat={openForEdit}
        />
      )}
      {creating && <PlanForm onClose={closeForm} />}
      {editingReminders && <ReminderSettings onClose={() => setEditingReminders(false)} />}
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
              <PhotoPromptProvider>
                <Shell onLogout={logout} />
              </PhotoPromptProvider>
            </PlansProvider>
          )}
        </AuthGate>
      </ToastProvider>
    </Providers>
  )
}
