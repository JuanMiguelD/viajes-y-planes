import { useEffect, useState } from 'react'
import { coverFor, deletePhoto, listPhotos, type Photo } from './photos'
import { usePlans } from './store'
import type { Plan } from './types'

// Caché entre visitas al álbum: solo se vuelve a pedir un plan si cambió su número de fotos o su portada
const cache = new Map<string, { key: string; photos: Photo[] }>()
const keyOf = (p: Plan) => `${p.photoCount}:${p.cover?.id ?? ''}`
const fromCache = (plans: Plan[]) =>
  Object.fromEntries(plans.flatMap((p) => (cache.get(p.id)?.key === keyOf(p) ? [[p.id, cache.get(p.id)!.photos]] : [])))

/** Fotos de todos los recuerdos del álbum, para verlas en sus páginas sin entrar a cada plan. */
export function useAlbumPhotos(plans: Plan[]) {
  const { updatePlan } = usePlans()
  const [photos, setPhotos] = useState<Record<string, Photo[]>>(() => fromCache(plans))
  const [failed, setFailed] = useState<Set<string>>(new Set())
  const signature = plans.map((p) => `${p.id}:${keyOf(p)}`).join('|')

  useEffect(() => {
    let cancelled = false
    const todo = plans.filter((p) => p.photoCount > 0 && cache.get(p.id)?.key !== keyOf(p))
    let next = 0
    // Tres a la vez: rápido sin saturar la conexión del celular
    const worker = async () => {
      while (!cancelled && next < todo.length) {
        const plan = todo[next++]
        try {
          const list = await listPhotos(plan.id)
          cache.set(plan.id, { key: keyOf(plan), photos: list })
          if (!cancelled) setPhotos((prev) => ({ ...prev, [plan.id]: list }))
        } catch {
          if (!cancelled) setFailed((prev) => new Set(prev).add(plan.id))
        }
      }
    }
    setPhotos((prev) => ({ ...prev, ...fromCache(plans) }))
    Promise.all([worker(), worker(), worker()])
    return () => {
      cancelled = true
    }
  }, [signature]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Borra una foto desde el visor del libro y mantiene la portada y el contador del plan al día. */
  const remove = async (plan: Plan, photoId: string) => {
    await deletePhoto(photoId)
    const list = await listPhotos(plan.id)
    cache.set(plan.id, { key: `${list.length}:${plan.cover?.id ?? ''}`, photos: list })
    setPhotos((prev) => ({ ...prev, [plan.id]: list }))
    const coverGone = plan.cover && !list.some((p) => p.id === plan.cover!.id)
    await updatePlan(plan.id, { photoCount: list.length, ...(coverGone ? { cover: await coverFor(plan.id, list) } : {}) })
  }

  return { photos, failed, remove }
}
