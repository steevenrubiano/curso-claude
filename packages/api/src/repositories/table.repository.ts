import { Database } from '@config/database.js'
import type { Table, TableFilters } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'

interface TableRow {
    id: string
    restaurantId: string
    numero: number
    descripcion: string
    capacidad: number
    estado: string
}

const SELECT_TABLE = 'SELECT id, restaurant_id as restaurantId, numero, descripcion, capacidad, estado FROM tables'

export interface TableRepository {
    findById(id: string): Promise<Table | null>
    findByNumero(restaurantId: string, numero: number): Promise<Table | null>
    findByRestaurantId(restaurantId: string, filters: TableFilters): Promise<Table[]>
    findAvailable(restaurantId: string, people: number): Promise<Table[]>
    save(table: Table): Promise<void>
    occupyIfFree(restaurantId: string, id: string): Promise<boolean>
    delete(id: string): Promise<void>
}

export class SqliteTableRepository implements TableRepository {
    constructor(private db: Database) {}

    async findById(id: string): Promise<Table | null> {
        const row = await this.db.get<TableRow>(`${SELECT_TABLE} WHERE id = ?`, [id])
        return row ? this.mapToTable(row) : null
    }

    async findByNumero(restaurantId: string, numero: number): Promise<Table | null> {
        const row = await this.db.get<TableRow>(`${SELECT_TABLE} WHERE restaurant_id = ? AND numero = ?`, [restaurantId, numero])
        return row ? this.mapToTable(row) : null
    }

    async findByRestaurantId(restaurantId: string, filters: TableFilters): Promise<Table[]> {
        const conditions = ['restaurant_id = ?']
        const params: unknown[] = [restaurantId]
        if (filters.estado) {
            conditions.push('estado = ?')
            params.push(filters.estado)
        }
        if (filters.minCapacidad !== undefined) {
            conditions.push('capacidad >= ?')
            params.push(filters.minCapacidad)
        }
        const rows = await this.db.all<TableRow>(`${SELECT_TABLE} WHERE ${conditions.join(' AND ')} ORDER BY numero ASC`, params)
        return rows.map(row => this.mapToTable(row))
    }

    async findAvailable(restaurantId: string, people: number): Promise<Table[]> {
        const rows = await this.db.all<TableRow>(
            `${SELECT_TABLE} WHERE restaurant_id = ? AND estado = 'libre' AND capacidad >= ? ORDER BY capacidad ASC, numero ASC`,
            [restaurantId, people]
        )
        return rows.map(row => this.mapToTable(row))
    }

    async save(table: Table): Promise<void> {
        const existing = await this.db.get<{ id: string }>('SELECT id FROM tables WHERE id = ?', [table.id])

        if (existing) {
            await this.db.run(
                'UPDATE tables SET numero = ?, descripcion = ?, capacidad = ?, estado = ? WHERE id = ?',
                [table.numero, table.descripcion, table.capacidad, table.estado, table.id]
            )
        } else {
            await this.db.run(
                'INSERT INTO tables (id, restaurant_id, numero, descripcion, capacidad, estado) VALUES (?, ?, ?, ?, ?, ?)',
                [table.id, table.restaurantId, table.numero, table.descripcion, table.capacidad, table.estado]
            )
        }
    }

    async occupyIfFree(restaurantId: string, id: string): Promise<boolean> {
        const result = await this.db.run(
            "UPDATE tables SET estado = 'ocupada' WHERE id = ? AND restaurant_id = ? AND estado = 'libre'",
            [id, restaurantId]
        )
        return result.changes > 0
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM tables WHERE id = ?', [id])
    }

    private mapToTable(row: TableRow): Table {
        return {
            id: row.id,
            restaurantId: row.restaurantId,
            numero: row.numero,
            descripcion: row.descripcion,
            capacidad: row.capacidad,
            estado: normalizeTableStatus(row.estado)
        }
    }
}
