import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import {
    InvalidTableError,
    RestaurantNotFoundError,
    TableNotAvailableError,
    TableNotFoundError,
    TableNumberAlreadyExistsError,
    TableOccupiedError
} from '@errors/DomainErrors.js'

describe('TableService', () => {
    let tableRepo: MockTableRepository
    let orderRepo: MockOrderRepository
    let service: TableService

    beforeEach(async () => {
        tableRepo = new MockTableRepository()
        orderRepo = new MockOrderRepository()
        const restaurantRepo = new MockRestaurantRepository()
        await restaurantRepo.save({ id: 'r1' } as any)
        service = new TableService(tableRepo, orderRepo, restaurantRepo)
    })

    describe('create', () => {
        it('creates a table with estado libre and empty descripcion by default', async () => {
            const table = await service.create('r1', { numero: 1, capacidad: 4 })
            expect(table).toMatchObject({ restaurantId: 'r1', numero: 1, descripcion: '', capacidad: 4, estado: 'libre' })
            expect(table.id).toBeTruthy()
        })

        it('rejects a non-integer or non-positive numero or capacidad', async () => {
            await expect(service.create('r1', { numero: 0, capacidad: 4 })).rejects.toThrow(InvalidTableError)
            await expect(service.create('r1', { numero: 1.5, capacidad: 4 })).rejects.toThrow(InvalidTableError)
            await expect(service.create('r1', { numero: 1, capacidad: 0 })).rejects.toThrow(InvalidTableError)
            await expect(service.create('r1', { numero: 1, capacidad: '4' as any })).rejects.toThrow(InvalidTableError)
        })

        it('rejects an invalid estado', async () => {
            await expect(service.create('r1', { numero: 1, capacidad: 4, estado: 'roto' })).rejects.toThrow(InvalidTableError)
        })

        it('rejects a duplicated numero in the same restaurant', async () => {
            await service.create('r1', { numero: 1, capacidad: 4 })
            await expect(service.create('r1', { numero: 1, capacidad: 2 })).rejects.toThrow(TableNumberAlreadyExistsError)
        })

        it('throws RestaurantNotFoundError if the restaurant does not exist', async () => {
            await expect(service.create('nope', { numero: 1, capacidad: 4 })).rejects.toThrow(RestaurantNotFoundError)
        })
    })

    describe('update', () => {
        it('replaces data and keeps estado when omitted', async () => {
            const t = await service.create('r1', { numero: 1, capacidad: 4, estado: 'reservada' })
            const updated = await service.update('r1', t.id, { numero: 2, descripcion: 'Terraza', capacidad: 6 })
            expect(updated).toMatchObject({ id: t.id, numero: 2, descripcion: 'Terraza', capacidad: 6, estado: 'reservada' })
        })

        it('allows keeping the same numero', async () => {
            const t = await service.create('r1', { numero: 1, capacidad: 4 })
            await expect(service.update('r1', t.id, { numero: 1, capacidad: 5 })).resolves.toBeTruthy()
        })

        it('rejects a numero used by another table', async () => {
            await service.create('r1', { numero: 1, capacidad: 4 })
            const t2 = await service.create('r1', { numero: 2, capacidad: 4 })
            await expect(service.update('r1', t2.id, { numero: 1, capacidad: 4 })).rejects.toThrow(TableNumberAlreadyExistsError)
        })

        it('throws TableNotFoundError for unknown table or table of another restaurant', async () => {
            const t = await service.create('r1', { numero: 1, capacidad: 4 })
            await expect(service.update('r1', 'nope', { numero: 1, capacidad: 4 })).rejects.toThrow(TableNotFoundError)
            await expect(service.update('r2', t.id, { numero: 1, capacidad: 4 })).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('delete', () => {
        it('deletes free and reserved tables', async () => {
            const t = await service.create('r1', { numero: 1, capacidad: 4 })
            const r = await service.create('r1', { numero: 2, capacidad: 4, estado: 'reservada' })
            await service.delete('r1', t.id)
            await service.delete('r1', r.id)
            expect(tableRepo.tables).toHaveLength(0)
        })

        it('rejects deleting an occupied table', async () => {
            const t = await service.create('r1', { numero: 1, capacidad: 4, estado: 'ocupada' })
            await expect(service.delete('r1', t.id)).rejects.toThrow(TableOccupiedError)
        })

        it('throws TableNotFoundError if missing', async () => {
            await expect(service.delete('r1', 'nope')).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('list / get', () => {
        beforeEach(async () => {
            await service.create('r1', { numero: 3, capacidad: 2 })
            await service.create('r1', { numero: 1, capacidad: 6, estado: 'ocupada' })
            await service.create('r1', { numero: 2, capacidad: 4 })
        })

        it('lists ordered by numero', async () => {
            const tables = await service.list('r1', {})
            expect(tables.map(t => t.numero)).toEqual([1, 2, 3])
        })

        it('filters by estado and minCapacidad', async () => {
            expect((await service.list('r1', { estado: 'libre' })).map(t => t.numero)).toEqual([2, 3])
            expect((await service.list('r1', { minCapacidad: 4 })).map(t => t.numero)).toEqual([1, 2])
        })

        it('rejects invalid filters', async () => {
            await expect(service.list('r1', { estado: 'x' })).rejects.toThrow(InvalidTableError)
            await expect(service.list('r1', { minCapacidad: 'abc' })).rejects.toThrow(InvalidTableError)
        })

        it('throws RestaurantNotFoundError for an unknown restaurant', async () => {
            await expect(service.list('nope', {})).rejects.toThrow(RestaurantNotFoundError)
        })

        it('gets a table by id within its restaurant', async () => {
            const [first] = await service.list('r1', {})
            await expect(service.getById('r1', first!.id)).resolves.toEqual(first)
            await expect(service.getById('r2', first!.id)).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('changeStatus', () => {
        it('allows any transition', async () => {
            const t = await service.create('r1', { numero: 1, capacidad: 4 })
            expect((await service.changeStatus('r1', t.id, 'ocupada')).estado).toBe('ocupada')
            expect((await service.changeStatus('r1', t.id, 'reservada')).estado).toBe('reservada')
            expect((await service.changeStatus('r1', t.id, 'libre')).estado).toBe('libre')
        })

        it('rejects an invalid or missing estado', async () => {
            const t = await service.create('r1', { numero: 1, capacidad: 4 })
            await expect(service.changeStatus('r1', t.id, 'x')).rejects.toThrow(InvalidTableError)
            await expect(service.changeStatus('r1', t.id, undefined)).rejects.toThrow(InvalidTableError)
        })

        it('throws TableNotFoundError if missing', async () => {
            await expect(service.changeStatus('r1', 'nope', 'libre')).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('listAvailable', () => {
        it('returns free tables with enough capacity ordered by capacidad then numero', async () => {
            await service.create('r1', { numero: 1, capacidad: 6 })
            await service.create('r1', { numero: 2, capacidad: 2 })
            await service.create('r1', { numero: 3, capacidad: 4 })
            await service.create('r1', { numero: 4, capacidad: 4 })
            await service.create('r1', { numero: 5, capacidad: 4, estado: 'ocupada' })
            await service.create('r1', { numero: 6, capacidad: 4, estado: 'reservada' })
            const tables = await service.listAvailable('r1', '3')
            expect(tables.map(t => t.numero)).toEqual([3, 4, 1])
        })

        it('rejects a missing or invalid people value', async () => {
            await expect(service.listAvailable('r1', undefined)).rejects.toThrow(InvalidTableError)
            await expect(service.listAvailable('r1', '0')).rejects.toThrow(InvalidTableError)
            await expect(service.listAvailable('r1', '2.5')).rejects.toThrow(InvalidTableError)
            await expect(service.listAvailable('r1', 'abc')).rejects.toThrow(InvalidTableError)
        })
    })

    describe('occupy', () => {
        it('occupies a free table', async () => {
            const t = await service.create('r1', { numero: 1, capacidad: 4 })
            expect((await service.occupy('r1', t.id, 3)).estado).toBe('ocupada')
        })

        it('works without people', async () => {
            const t = await service.create('r1', { numero: 1, capacidad: 4 })
            expect((await service.occupy('r1', t.id, undefined)).estado).toBe('ocupada')
        })

        it('throws TableNotAvailableError if not free (occupied or reserved)', async () => {
            const o = await service.create('r1', { numero: 1, capacidad: 4, estado: 'ocupada' })
            const r = await service.create('r1', { numero: 2, capacidad: 4, estado: 'reservada' })
            await expect(service.occupy('r1', o.id, undefined)).rejects.toThrow(TableNotAvailableError)
            await expect(service.occupy('r1', r.id, undefined)).rejects.toThrow(TableNotAvailableError)
        })

        it('only one of two concurrent occupy calls succeeds', async () => {
            const t = await service.create('r1', { numero: 1, capacidad: 4 })
            const results = await Promise.allSettled([service.occupy('r1', t.id, 2), service.occupy('r1', t.id, 2)])
            expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
            expect(results.filter(r => r.status === 'rejected')).toHaveLength(1)
        })

        it('rejects people above capacity or invalid', async () => {
            const t = await service.create('r1', { numero: 1, capacidad: 4 })
            await expect(service.occupy('r1', t.id, 5)).rejects.toThrow(InvalidTableError)
            await expect(service.occupy('r1', t.id, 0)).rejects.toThrow(InvalidTableError)
            expect(tableRepo.tables[0]!.estado).toBe('libre')
        })

        it('throws TableNotFoundError if missing or from another restaurant', async () => {
            const t = await service.create('r1', { numero: 1, capacidad: 4 })
            await expect(service.occupy('r1', 'nope', undefined)).rejects.toThrow(TableNotFoundError)
            await expect(service.occupy('r2', t.id, undefined)).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('listOccupiedWithOrders', () => {
        it('returns only occupied tables with their orders sorted by createdAt', async () => {
            const occupied = await service.create('r1', { numero: 2, capacidad: 4, estado: 'ocupada' })
            const empty = await service.create('r1', { numero: 1, capacidad: 4, estado: 'ocupada' })
            await service.create('r1', { numero: 3, capacidad: 4 })
            const base = { restaurantId: 'r1', clientId: null, items: [] }
            await orderRepo.create({ ...base, id: 'o2', tableId: occupied.id, createdAt: new Date('2026-01-01T12:10:00Z') })
            await orderRepo.create({ ...base, id: 'o1', tableId: occupied.id, createdAt: new Date('2026-01-01T12:00:00Z') })
            await orderRepo.create({ ...base, id: 'o3', tableId: null, createdAt: new Date() })

            const result = await service.listOccupiedWithOrders('r1')

            expect(result.map(r => r.table.numero)).toEqual([1, 2])
            expect(result[0]!.table.id).toBe(empty.id)
            expect(result[0]!.orders).toEqual([])
            expect(result[1]!.orders.map(o => o.id)).toEqual(['o1', 'o2'])
        })
    })
})
