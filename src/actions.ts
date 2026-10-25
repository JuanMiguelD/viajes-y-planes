import { usePlans } from './store'
import { useToast } from './toast'
import type { Plan } from './types'

/** Acciones de estado con confirmación y "Deshacer", compartidas por todas las secciones. */
export function usePlanActions() {
  const { toggleDone, markRepeated, toggleRepeat, updatePlan } = usePlans()
  const toast = useToast()

  const restore = (prev: Plan) => () =>
    updatePlan(prev.id, {
      status: prev.status,
      repeat: prev.repeat,
      completedAt: prev.completedAt,
      timesDone: prev.timesDone,
    })

  return {
    toggleDone: async (plan: Plan) => {
      await toggleDone(plan)
      toast(plan.status === 'realizado' ? 'Volvió a pendientes' : '¡Cumplido!', {
        label: 'Deshacer',
        run: restore(plan),
      })
    },
    toggleRepeat: async (plan: Plan) => {
      await toggleRepeat(plan)
      toast(plan.repeat ? 'Quitado de "Para repetir"' : 'Añadido a "Para repetir"', {
        label: 'Deshacer',
        run: restore(plan),
      })
    },
    markRepeated: async (plan: Plan) => {
      await markRepeated(plan)
      toast(`¡Ya van ${plan.timesDone + 1} veces!`, { label: 'Deshacer', run: restore(plan) })
    },
  }
}
