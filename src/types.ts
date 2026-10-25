export type Category = 'pareja' | 'amigos'
export type Status = 'pendiente' | 'realizado'

export interface Place {
  name: string
  lat: number
  lng: number
}

export interface Plan {
  id: string
  title: string
  description: string
  category: Category
  status: Status
  /** Plan realizado que queremos volver a hacer */
  repeat: boolean
  /** Fecha límite, formato YYYY-MM-DD */
  deadline: string | null
  place: Place | null
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
