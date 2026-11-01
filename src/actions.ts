import { usePhotoPrompt } from './photoPrompt'
import { usePlans } from './store'
import { useToast } from './toast'
import type { Plan } from './types'

/** Acciones de estado con confirmación y "Deshacer", compartidas por todas las secciones. */
export function usePlanActions() {
  const { toggleDone, markRepeated, toggleRepeat, toggleFavorite, updatePlan } = usePlans()
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
      const wasRepeating = plan.status === 'pendiente' && plan.repeat
      await toggleDone(plan)
      if (wasRepeating) {
        toast(`¡Ya van ${plan.timesDone + 1} veces! Sigue pendiente, lista para la próxima.`, [
          { label: 'Deshacer', run: restore(plan) },
          uploadAction(plan),
        ])
        return
      }
      const message = plan.status === 'realizado' ? 'Volvió a pendientes' : '¡Cumplido!'
      toast(message, { label: 'Deshacer', run: restore(plan) })
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
    markRepeated: async (plan: Plan) => {
      await markRepeated(plan)
      toast(`¡Ya van ${plan.timesDone + 1} veces!`, [{ label: 'Deshacer', run: restore(plan) }, uploadAction(plan)])
    },
  }
}
