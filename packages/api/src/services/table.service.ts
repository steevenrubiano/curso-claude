import { randomUUID } from 'crypto'
import type { Table, TableFilters } from '@models/table.model.js'
import { normalizeTableStatus, parsePositiveInteger } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import type { OrderRepository } from '@repositories/order.repository.js'
import type { RestaurantRepository } from '@repositories/restaurant.repository.js'
import type { Order } from '@models/order.model.js'
import {
    InvalidTableError,
    RestaurantNotFoundError,
    TableNotAvailableError,
    TableNotFoundError,
    TableNumberAlreadyExistsError,
    TableOccupiedError
} from '@errors/DomainErrors.js'

interface TableInput {
    numero: unknown
    descripcion?: unknown
    capacidad: unknown
    estado?: unknown
}

interface TableFiltersInput {
    estado?: unknown
    minCapacidad?: unknown
}

export interface TableWithOrders {
    table: Table
    orders: Order[]
}

export class TableService {
    constructor(
        private readonly tableRepository: TableRepository,
        private readonly orderRepository: OrderRepository,
        private readonly restaurantRepository: RestaurantRepository
    ) {}

    async create(restaurantId: string, input: TableInput): Promise<Table> {
        await this.ensureRestaurant(restaurantId)
        const data = this.parseInput(input)
        await this.ensureNumeroAvailable(restaurantId, data.numero)

        const table: Table = {
            id: randomUUID(),
            restaurantId,
            numero: data.numero,
            descripcion: data.descripcion,
            capacidad: data.capacidad,
            estado: data.estado ?? 'libre'
        }
        await this.tableRepository.save(table)
        return table
    }

    async update(restaurantId: string, id: string, input: TableInput): Promise<Table> {
        const existing = await this.getById(restaurantId, id)
        const data = this.parseInput(input)
        await this.ensureNumeroAvailable(restaurantId, data.numero, id)

        const updated: Table = {
            ...existing,
            numero: data.numero,
            descripcion: data.descripcion,
            capacidad: data.capacidad,
            estado: data.estado ?? existing.estado
        }
        await this.tableRepository.save(updated)
        return updated
    }

    async delete(restaurantId: string, id: string): Promise<void> {
        const table = await this.getById(restaurantId, id)
        if (table.estado === 'ocupada') {
            throw new TableOccupiedError()
        }
        await this.tableRepository.delete(id)
    }

    async getById(restaurantId: string, id: string): Promise<Table> {
        const table = await this.tableRepository.findById(id)
        if (!table || table.restaurantId !== restaurantId) {
            throw new TableNotFoundError()
        }
        return table
    }

    async list(restaurantId: string, input: TableFiltersInput): Promise<Table[]> {
        await this.ensureRestaurant(restaurantId)
        const filters: TableFilters = {}
        if (input.estado !== undefined) {
            filters.estado = normalizeTableStatus(input.estado)
        }
        if (input.minCapacidad !== undefined) {
            filters.minCapacidad = parsePositiveInteger(input.minCapacidad, 'minCapacidad', true)
        }
        return this.tableRepository.findByRestaurantId(restaurantId, filters)
    }

    async changeStatus(restaurantId: string, id: string, estado: unknown): Promise<Table> {
        const table = await this.getById(restaurantId, id)
        const updated: Table = { ...table, estado: normalizeTableStatus(estado) }
        await this.tableRepository.save(updated)
        return updated
    }

    async listAvailable(restaurantId: string, people: unknown): Promise<Table[]> {
        await this.ensureRestaurant(restaurantId)
        return this.tableRepository.findAvailable(restaurantId, parsePositiveInteger(people, 'people', true))
    }

    async occupy(restaurantId: string, id: string, people: unknown): Promise<Table> {
        const table = await this.getById(restaurantId, id)
        if (people !== undefined) {
            const count = parsePositiveInteger(people, 'people')
            if (count > table.capacidad) {
                throw new InvalidTableError(`The table admits at most ${table.capacidad} people`)
            }
        }

        const occupied = await this.tableRepository.occupyIfFree(restaurantId, id)
        if (!occupied) {
            throw new TableNotAvailableError()
        }
        return { ...table, estado: 'ocupada' }
    }

    async listOccupiedWithOrders(restaurantId: string): Promise<TableWithOrders[]> {
        await this.ensureRestaurant(restaurantId)
        const tables = await this.tableRepository.findByRestaurantId(restaurantId, { estado: 'ocupada' })
        const orders = await this.orderRepository.findByTableIds(restaurantId, tables.map(t => t.id))
        return tables.map(table => ({
            table,
            orders: orders
                .filter(o => o.tableId === table.id)
                .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        }))
    }

    private parseInput(input: TableInput) {
        const numero = parsePositiveInteger(input.numero, 'numero')
        const capacidad = parsePositiveInteger(input.capacidad, 'capacidad')
        if (input.descripcion !== undefined && input.descripcion !== null && typeof input.descripcion !== 'string') {
            throw new InvalidTableError('descripcion must be a string')
        }
        const estado = input.estado === undefined ? undefined : normalizeTableStatus(input.estado)
        return { numero, capacidad, descripcion: (input.descripcion as string | null | undefined) ?? '', estado }
    }

    private async ensureNumeroAvailable(restaurantId: string, numero: number, ownId?: string): Promise<void> {
        const duplicated = await this.tableRepository.findByNumero(restaurantId, numero)
        if (duplicated && duplicated.id !== ownId) {
            throw new TableNumberAlreadyExistsError(numero)
        }
    }

    private async ensureRestaurant(restaurantId: string): Promise<void> {
        const restaurant = await this.restaurantRepository.findById(restaurantId)
        if (!restaurant) {
            throw new RestaurantNotFoundError()
        }
    }
}
