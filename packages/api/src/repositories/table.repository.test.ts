import { SqliteTableRepository } from './table.repository.js'
import { Database } from '@config/database.js'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Table } from '@models/table.model.js'

const table = (over: Partial<Table> = {}): Table => ({
    id: 't1', restaurantId: 'r1', numero: 1, descripcion: 'Terraza', capacidad: 4, estado: 'libre', ...over
})

describe('SqliteTableRepository (Integration)', () => {
    let db: Database
    let repo: SqliteTableRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteTableRepository(db)
        for (const id of ['r1', 'r2']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, 'La Trattoria', 'Calle Mayor 10', 'info@trattoria.com', '+34 612345678', 'Carlos', 'García', new Date().toISOString(), new Date().toISOString()]
            )
        }
    })

    afterAll(async () => {
        await db.close()
    })

    it('saves, finds by id and updates', async () => {
        await repo.save(table())
        expect(await repo.findById('t1')).toEqual(table())
        await repo.save(table({ numero: 9, descripcion: '', estado: 'reservada' }))
        expect(await repo.findById('t1')).toEqual(table({ numero: 9, descripcion: '', estado: 'reservada' }))
        expect(await repo.findById('missing')).toBeNull()
    })

    it('finds by numero within a restaurant', async () => {
        await repo.save(table({ id: 't2', numero: 2 }))
        expect((await repo.findByNumero('r1', 2))?.id).toBe('t2')
        expect(await repo.findByNumero('r2', 2)).toBeNull()
    })

    it('lists a restaurant tables ordered by numero with filters', async () => {
        await repo.save(table({ id: 't3', numero: 3, capacidad: 8, estado: 'ocupada' }))
        await repo.save(table({ id: 'x1', restaurantId: 'r2', numero: 1 }))
        expect((await repo.findByRestaurantId('r1', {})).map(t => t.numero)).toEqual([2, 3, 9])
        expect((await repo.findByRestaurantId('r1', { estado: 'ocupada' })).map(t => t.id)).toEqual(['t3'])
        expect((await repo.findByRestaurantId('r1', { minCapacidad: 8 })).map(t => t.id)).toEqual(['t3'])
    })

    it('lists available tables ordered by capacidad then numero', async () => {
        await repo.save(table({ id: 'a1', restaurantId: 'r2', numero: 5, capacidad: 6 }))
        await repo.save(table({ id: 'a2', restaurantId: 'r2', numero: 4, capacidad: 6 }))
        await repo.save(table({ id: 'a3', restaurantId: 'r2', numero: 6, capacidad: 2 }))
        const result = await repo.findAvailable('r2', 3)
        expect(result.map(t => t.id)).toEqual(['x1', 'a2', 'a1'])
    })

    it('occupies atomically only once', async () => {
        await repo.save(table({ id: 'o1', numero: 20 }))
        const [a, b] = await Promise.all([repo.occupyIfFree('r1', 'o1'), repo.occupyIfFree('r1', 'o1')])
        expect([a, b].filter(Boolean)).toHaveLength(1)
        expect((await repo.findById('o1'))?.estado).toBe('ocupada')
        expect(await repo.occupyIfFree('r2', 'o1')).toBe(false)
    })

    it('does not occupy a reserved table', async () => {
        await repo.save(table({ id: 'o2', numero: 21, estado: 'reservada' }))
        expect(await repo.occupyIfFree('r1', 'o2')).toBe(false)
    })

    it('enforces unique numero per restaurant', async () => {
        await expect(repo.save(table({ id: 'dup', numero: 20 }))).rejects.toThrow()
    })

    it('deletes', async () => {
        await repo.delete('t2')
        expect(await repo.findById('t2')).toBeNull()
    })
})
