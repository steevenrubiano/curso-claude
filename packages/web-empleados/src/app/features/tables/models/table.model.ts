import { Order } from '../../orders/models/order.model'

export type TableStatus = 'libre' | 'ocupada' | 'reservada'

export interface Table {
  id: string
  restaurantId: string
  numero: number
  descripcion: string
  capacidad: number
  estado: TableStatus
}

export interface TableWithOrders {
  table: Table
  orders: Order[]
}

export interface UpdateTableStatusDto {
  estado: TableStatus
}
