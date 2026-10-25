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
  addPlan: (input: PlanInput) => Promise<void>
  updatePlan: (id: string, patch: Partial<PlanInput>) => Promise<void>
  deletePlan: (id: string) => Promise<void>
  toggleDone: (plan: Plan) => Promise<void>
  toggleRepeat: (plan: Plan) => Promise<void>
  markRepeated: (plan: Plan) => Promise<void>
}

const PlansContext = createContext<PlansStore | null>(null)
const LOCAL_KEY = 'viajesyplanes.plans'

/** Rellena campos añadidos después de crear los primeros planes. */
function withDefaults(plan: Plan): Plan {
  return { ...plan, cover: plan.cover ?? null, photoCount: plan.photoCount ?? 0 }
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

    const addPlan = async (input: PlanInput) => {
      const data = { ...input, createdAt: Date.now() }
      if (db) await addDoc(collection(db, 'plans'), data)
      else writeLocal((prev) => [...prev, { ...data, id: crypto.randomUUID() }])
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
      toggleDone: (plan) =>
        plan.status === 'realizado'
          ? updatePlan(plan.id, {
              status: 'pendiente',
              repeat: false,
              completedAt: null,
              timesDone: Math.max(0, plan.timesDone - 1),
            })
          : updatePlan(plan.id, { status: 'realizado', completedAt: today(), timesDone: plan.timesDone + 1 }),
      toggleRepeat: (plan) => updatePlan(plan.id, { repeat: !plan.repeat }),
      markRepeated: (plan) => updatePlan(plan.id, { completedAt: today(), timesDone: plan.timesDone + 1 }),
    }
  }, [plans, loading, error])

  return <PlansContext.Provider value={store}>{children}</PlansContext.Provider>
}

export function usePlans(): PlansStore {
  const ctx = useContext(PlansContext)
  if (!ctx) throw new Error('usePlans debe usarse dentro de PlansProvider')
  return ctx
}
