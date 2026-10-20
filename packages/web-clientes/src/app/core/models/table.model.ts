export type TableStatus = 'libre' | 'ocupada' | 'reservada'

export interface Table {
  id: string
  restaurantId: string
  numero: number
  descripcion: string
  capacidad: number
  estado: TableStatus
}
