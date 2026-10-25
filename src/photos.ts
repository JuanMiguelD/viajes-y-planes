import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from 'firebase/storage'
import { storage } from './firebase'
import type { Cover } from './types'

export interface Photo {
  id: string
  url: string
}

/*
 * Fotos de cada plan. Con Firebase viven en Storage bajo plans/{planId}/; en modo local,
 * en IndexedDB. En ambos casos cada plan tiene su propio conjunto, sin mezclar experiencias.
 */

// ---------- Modo local (IndexedDB) ----------

interface LocalPhoto {
  id: string
  planId: string
  blob: Blob
  createdAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null
function idb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('viajesyplanes', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('photos', { keyPath: 'id' }).createIndex('planId', 'planId')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const store = (await idb()).transaction('photos', mode).objectStore('photos')
  return new Promise((resolve, reject) => {
    const req = fn(store)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

const objectUrls = new Map<string, string>()
function localUrl(p: LocalPhoto): string {
  if (!objectUrls.has(p.id)) objectUrls.set(p.id, URL.createObjectURL(p.blob))
  return objectUrls.get(p.id)!
}

async function localList(planId: string): Promise<LocalPhoto[]> {
  const rows = await run<LocalPhoto[]>('readonly', (s) => s.index('planId').getAll(planId))
  return rows.sort((a, b) => a.createdAt - b.createdAt)
}

/** Miniatura JPEG en data URL, para que la portada local sobreviva a recargas. */
async function thumbnail(blob: Blob, size = 640): Promise<string> {
  const bitmap = await createImageBitmap(blob)
  const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.8)
}

// ---------- API común ----------

export async function listPhotos(planId: string): Promise<Photo[]> {
  if (storage) {
    const { items } = await listAll(ref(storage, `plans/${planId}`))
    const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name))
    return Promise.all(sorted.map(async (item) => ({ id: item.fullPath, url: await getDownloadURL(item) })))
  }
  return (await localList(planId)).map((p) => ({ id: p.id, url: localUrl(p) }))
}

export async function uploadPhotos(planId: string, files: File[]): Promise<void> {
  if (storage) {
    await Promise.all(
      files.map((f, i) =>
        uploadBytes(ref(storage!, `plans/${planId}/${Date.now() + i}-${f.name}`), f, { contentType: f.type }),
      ),
    )
    return
  }
  for (const [i, file] of files.entries()) {
    const photo: LocalPhoto = { id: crypto.randomUUID(), planId, blob: file, createdAt: Date.now() + i }
    await run('readwrite', (s) => s.put(photo))
  }
}

export async function deletePhoto(id: string): Promise<void> {
  if (storage) return deleteObject(ref(storage, id))
  await run('readwrite', (s) => s.delete(id))
}

export async function deleteAllPhotos(planId: string): Promise<void> {
  const photos = await listPhotos(planId)
  await Promise.all(photos.map((p) => deletePhoto(p.id)))
}

/** Portada a guardar en el plan a partir de su primera foto. */
export async function coverFor(planId: string, photos: Photo[]): Promise<Cover | null> {
  const first = photos[0]
  if (!first) return null
  if (storage) return first
  const local = (await localList(planId))[0]
  return { id: first.id, url: await thumbnail(local.blob) }
}
