import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import { deleteAllPhotos } from './photos'
import type { Plan, PlanInput } from './types'
import { today } from './utils'

interface PlansStore {
  plans: Plan[]
  loading: boolean
  error: string | null
  getPlan: (id: string) => Plan | undefined
  addPlan: (input: PlanInput) => Promise<string>
  updatePlan: (id: string, patch: Partial<PlanInput>) => Promise<void>
  deletePlan: (id: string) => Promise<void>
  /** `repeat` solo aplica al marcar un plan como cumplido; se ignora al revertirlo. */
  toggleDone: (plan: Plan, repeat?: boolean) => Promise<void>
  toggleRepeat: (plan: Plan) => Promise<void>
  toggleFavorite: (plan: Plan) => Promise<void>
  /** Crea una tarjeta nueva a partir de un plan cumplido, lista para ponerle la próxima fecha y detalles. */
  repeatPlan: (plan: Plan) => Promise<string>
}

const PlansContext = createContext<PlansStore | null>(null)
const LOCAL_KEY = 'viajesyplanes.plans'

/** Rellena campos añadidos después de crear los primeros planes. */
function withDefaults(plan: Plan): Plan {
  return {
    ...plan,
    cover: plan.cover ?? null,
    photoCount: plan.photoCount ?? 0,
    tag: plan.tag ?? null,
    favorite: plan.favorite ?? false,
  }
}

/**
 * Fuente única de verdad de los planes. Todas las secciones leen de aquí,
 * así que cualquier cambio se refleja automáticamente en las demás.
 */
export function PlansProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db) {
      setPlans((JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as Plan[]).map(withDefaults))
      setLoading(false)
      return
    }
    const q = query(collection(db, 'plans'), orderBy('createdAt', 'asc'))
    return onSnapshot(
      q,
      (snap) => {
        setPlans(snap.docs.map((d) => withDefaults({ ...(d.data() as Omit<Plan, 'id'>), id: d.id })))
        setLoading(false)
        setError(null)
      },
      (err) => {
        setError(err.code === 'permission-denied' ? 'permission-denied' : err.message)
        setLoading(false)
      },
    )
  }, [])

  const store = useMemo<PlansStore>(() => {
    const writeLocal = (fn: (prev: Plan[]) => Plan[]) =>
      setPlans((prev) => {
        const next = fn(prev)
        localStorage.setItem(LOCAL_KEY, JSON.stringify(next))
        return next
      })

    const addPlan = async (input: PlanInput): Promise<string> => {
      const data = { ...input, createdAt: Date.now() }
      if (db) return (await addDoc(collection(db, 'plans'), data)).id
      const id = crypto.randomUUID()
      writeLocal((prev) => [...prev, { ...data, id }])
      return id
    }

    const updatePlan = async (id: string, patch: Partial<PlanInput>) => {
      if (db) await updateDoc(doc(db, 'plans', id), patch)
      else writeLocal((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    }

    const deletePlan = async (id: string) => {
      await deleteAllPhotos(id).catch(() => undefined)
      if (db) await deleteDoc(doc(db, 'plans', id))
      else writeLocal((prev) => prev.filter((p) => p.id !== id))
    }

    return {
      plans,
      loading,
      error,
      getPlan: (id) => plans.find((p) => p.id === id),
      addPlan,
      updatePlan,
      deletePlan,
      toggleDone: (plan, repeat) => {
        if (plan.status === 'realizado') {
          return updatePlan(plan.id, {
            status: 'pendiente',
            repeat: false,
            completedAt: null,
            timesDone: Math.max(0, plan.timesDone - 1),
          })
        }
        return updatePlan(plan.id, {
          status: 'realizado',
          completedAt: today(),
          timesDone: plan.timesDone + 1,
          ...(repeat !== undefined ? { repeat } : {}),
        })
      },
      // Solo se usa para quitar la marca (el botón "Quitar"): repeatPlan es quien la activa, al crear la tarjeta siguiente.
      toggleRepeat: (plan) => updatePlan(plan.id, { repeat: !plan.repeat }),
      toggleFavorite: (plan) => updatePlan(plan.id, { favorite: !plan.favorite }),
      repeatPlan: async (plan) => {
        // Las condiciones de volver cambian cada vez (otra fecha, otros detalles), así que cada
        // repetición es una tarjeta nueva y propia, no una reescritura del plan ya cumplido.
        const id = await addPlan({
          title: plan.title,
          description: plan.description,
          category: plan.category,
          status: 'pendiente',
          repeat: true,
          favorite: plan.favorite,
          deadline: null,
          place: plan.place,
          tag: plan.tag,
          completedAt: null,
          timesDone: 0,
          cover: null,
          photoCount: 0,
        })
        // El plan cumplido deja de ser la "cabeza" activa de la serie: la nueva tarjeta la reemplaza.
        if (plan.repeat) await updatePlan(plan.id, { repeat: false })
        return id
      },
    }
  }, [plans, loading, error])

  return <PlansContext.Provider value={store}>{children}</PlansContext.Provider>
}

export function usePlans(): PlansStore {
  const ctx = useContext(PlansContext)
  if (!ctx) throw new Error('usePlans debe usarse dentro de PlansProvider')
  return ctx
}
