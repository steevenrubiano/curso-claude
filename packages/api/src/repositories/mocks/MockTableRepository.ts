import type { TableRepository } from '@repositories/table.repository.js'
import type { Table, TableFilters } from '@models/table.model.js'

export class MockTableRepository implements TableRepository {
    tables: Table[] = []

    async findById(id: string): Promise<Table | null> {
        const table = this.tables.find(t => t.id === id)
        return table ? { ...table } : null
    }

    async findByNumero(restaurantId: string, numero: number): Promise<Table | null> {
        const table = this.tables.find(t => t.restaurantId === restaurantId && t.numero === numero)
        return table ? { ...table } : null
    }

    async findByRestaurantId(restaurantId: string, filters: TableFilters): Promise<Table[]> {
        return this.tables
            .filter(t => t.restaurantId === restaurantId)
            .filter(t => !filters.estado || t.estado === filters.estado)
            .filter(t => filters.minCapacidad === undefined || t.capacidad >= filters.minCapacidad)
            .sort((a, b) => a.numero - b.numero)
            .map(t => ({ ...t }))
    }

    async findAvailable(restaurantId: string, people: number): Promise<Table[]> {
        return this.tables
            .filter(t => t.restaurantId === restaurantId && t.estado === 'libre' && t.capacidad >= people)
            .sort((a, b) => a.capacidad - b.capacidad || a.numero - b.numero)
            .map(t => ({ ...t }))
    }

    async save(table: Table): Promise<void> {
        const index = this.tables.findIndex(t => t.id === table.id)
        if (index >= 0) {
            this.tables[index] = { ...table }
        } else {
            this.tables.push({ ...table })
        }
    }

    async occupyIfFree(restaurantId: string, id: string): Promise<boolean> {
        const table = this.tables.find(t => t.id === id && t.restaurantId === restaurantId)
        if (!table || table.estado !== 'libre') return false
        table.estado = 'ocupada'
        return true
    }

    async delete(id: string): Promise<void> {
        this.tables = this.tables.filter(t => t.id !== id)
    }
}
