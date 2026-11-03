export type Category = 'pareja' | 'amigos'
export type Status = 'pendiente' | 'realizado'
/** Id de una etiqueta de tipo de lugar. La lista de etiquetas (nombre e ícono) vive en appSettings.tsx. */
export type Tag = string

export interface Place {
  name: string
  lat: number
  lng: number
  /** Dirección completa (de Google u OpenStreetMap). Los planes antiguos no la tienen. */
  address?: string | null
  /** Id del lugar en Google, para abrir su ficha en Google Maps */
  placeId?: string | null
}

export interface Plan {
  id: string
  title: string
  description: string
  category: Category
  status: Status
  /** Plan realizado que queremos volver a hacer. Al activarlo en un plan cumplido, vuelve a quedar pendiente. */
  repeat: boolean
  /** Marca independiente de "para repetir": lo favorito de la pareja, cumplido o no. */
  favorite: boolean
  /** Fecha límite, formato YYYY-MM-DD */
  deadline: string | null
  place: Place | null
  /** Tipo de lugar, para distinguirlos en el mapa */
  tag: Tag | null
  /** Última vez que lo hicimos, formato YYYY-MM-DD */
  completedAt: string | null
  timesDone: number
  /** Primera foto del plan, guardada en el documento para mostrarla sin consultar Storage */
  cover: Cover | null
  photoCount: number
  createdAt: number
}

export interface Cover {
  id: string
  url: string
}

export type PlanInput = Omit<Plan, 'id' | 'createdAt'>

export const CATEGORY_LABEL: Record<Category, string> = {
  pareja: 'Los dos',
  amigos: 'Con amigos',
}
