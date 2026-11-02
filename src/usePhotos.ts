import { useCallback, useEffect, useRef, useState } from 'react'
import { coverFor, coverFromPhoto, deletePhoto, listPhotos, uploadPhotos, type Photo } from './photos'
import { usePlans } from './store'
import type { Plan } from './types'

/** Carga las fotos de un plan y mantiene su portada y contador sincronizados en el documento del plan. */
export function usePhotos(plan: Plan) {
  const { updatePlan } = usePlans()
  const [photos, setPhotos] = useState<Photo[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(0)
  const { id, cover, photoCount } = plan

  const sync = useCallback(
    async (list: Photo[]) => {
      setPhotos(list)
      // La portada elegida (a mano o automática) se respeta mientras esa foto siga existiendo;
      // solo se recalcula de la primera foto si no hay portada o si la que había se borró.
      const coverStillThere = cover ? list.some((p) => p.id === cover.id) : false
      const patch: { cover?: Photo | null; photoCount?: number } = {}
      if (list.length !== photoCount) patch.photoCount = list.length
      if (!coverStillThere) patch.cover = await coverFor(id, list)
      if (Object.keys(patch).length > 0) await updatePlan(id, patch)
    },
    [id, cover, photoCount, updatePlan],
  )

  const setCover = useCallback(
    async (photo: Photo) => {
      await updatePlan(id, { cover: await coverFromPhoto(id, photo) })
    },
    [id, updatePlan],
  )

  // La carga solo depende del plan; sync cambia cada vez que se actualiza la portada
  const syncRef = useRef(sync)
  useEffect(() => {
    syncRef.current = sync
  }, [sync])

  const load = useCallback(async () => {
    setError(null)
    try {
      await syncRef.current(await listPhotos(id))
    } catch {
      setError('No se pudieron cargar las fotos. Revisa la conexión e inténtalo de nuevo.')
      setPhotos([])
    }
  }, [id])

  useEffect(() => {
    setPhotos(null)
    load()
  }, [load])

  const upload = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'))
    if (images.length === 0) return
    setUploading(images.length)
    setError(null)
    try {
      await uploadPhotos(id, images)
      await sync(await listPhotos(id))
    } catch {
      setError('No se pudieron subir las fotos. Revisa que sean imágenes de menos de 15 MB.')
    } finally {
      setUploading(0)
    }
  }

  const remove = async (photoId: string) => {
    await deletePhoto(photoId)
    await sync(await listPhotos(id))
  }

  return { photos, error, uploading, reload: load, upload, remove, setCover }
}

/** Sube fotos a un plan desde fuera de su ficha (por ejemplo, desde el álbum) y actualiza su portada. */
export function useUploader() {
  const { updatePlan } = usePlans()
  return async (planId: string, files: File[]): Promise<number> => {
    const images = files.filter((f) => f.type.startsWith('image/'))
    if (images.length === 0) return 0
    await uploadPhotos(planId, images)
    const list = await listPhotos(planId)
    await updatePlan(planId, { cover: await coverFor(planId, list), photoCount: list.length })
    return images.length
  }
}
