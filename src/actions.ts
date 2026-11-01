import { usePhotoPrompt } from './photoPrompt'
import { usePlans } from './store'
import { useToast } from './toast'
import type { Plan } from './types'

/** Acciones de estado con confirmación y "Deshacer", compartidas por todas las secciones. */
export function usePlanActions() {
  const { toggleDone, toggleRepeat, toggleFavorite, updatePlan, repeatPlan } = usePlans()
  const toast = useToast()
  const promptPhotos = usePhotoPrompt()

  const restore = (prev: Plan) => () =>
    updatePlan(prev.id, {
      status: prev.status,
      repeat: prev.repeat,
      completedAt: prev.completedAt,
      timesDone: prev.timesDone,
    })

  const uploadAction = (plan: Plan) => ({ label: 'Subir fotos', run: () => promptPhotos(plan.id, plan.title) })

  return {
    toggleDone: async (plan: Plan) => {
      const wasPending = plan.status === 'pendiente'
      await toggleDone(plan)
      if (wasPending) {
        toast('¡Cumplido! Sube las fotos de hoy cuando quieras.', [
          { label: 'Deshacer', run: restore(plan) },
          uploadAction(plan),
        ])
        return
      }
      toast('Volvió a pendientes', { label: 'Deshacer', run: restore(plan) })
    },
    toggleRepeat: async (plan: Plan) => {
      await toggleRepeat(plan)
      toast(plan.repeat ? 'Quitado de "Para repetir"' : 'Añadido a "Para repetir"', {
        label: 'Deshacer',
        run: restore(plan),
      })
    },
    toggleFavorite: async (plan: Plan) => {
      await toggleFavorite(plan)
      toast(plan.favorite ? 'Quitado de favoritos' : 'Añadido a favoritos', {
        label: 'Deshacer',
        run: () => updatePlan(plan.id, { favorite: plan.favorite }),
      })
    },
    repeatPlan: async (plan: Plan): Promise<string> => {
      const id = await repeatPlan(plan)
      toast(`Nueva tarjeta para repetir "${plan.title}". Ponle la fecha y los detalles.`)
      return id
    },
  }
}
