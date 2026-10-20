import { describe, it, expect, beforeEach } from 'vitest'
import { OrderService } from './order.service.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import type { Order } from '@models/order.model.js'
import { OrderNotFoundError, InvalidOrderStatusError, TableNotFoundError } from '@errors/DomainErrors.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'

describe('OrderService.updateItemStatus', () => {
    let repo: MockOrderRepository
    let service: OrderService
    let testOrder: Order

    beforeEach(async () => {
        repo = new MockOrderRepository()
        service = new OrderService(repo)

        testOrder = {
            id: 'order-1',
            restaurantId: 'rest-1',
            tableId: null,
            clientId: null,
            createdAt: new Date(),
            items: [
                { id: 'item-1', dishId: 'dish-1', quantity: 1, notes: null, status: 'pendiente' }
            ]
        }
        await repo.create(testOrder)
    })

    it('should update the status of an item successfully', async () => {
        await service.updateItemStatus('order-1', 'item-1', 'preparando')
        const updatedItem = testOrder.items[0]!
        expect(updatedItem.status).toBe('preparando')
    })

    it('should throw an error if the order does not exist', async () => {
        await expect(service.updateItemStatus('order-bad', 'item-1', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw an error if the item does not exist inside the order', async () => {
        await expect(service.updateItemStatus('order-1', 'item-bad', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw DomainError if status is invalid', async () => {
        await expect(service.updateItemStatus('order-1', 'item-1', 'invalid-status'))
            .rejects.toThrow(InvalidOrderStatusError)
    })
})

describe('OrderService.create with tableId', () => {
    let tableRepo: MockTableRepository
    let service: OrderService

    beforeEach(async () => {
        tableRepo = new MockTableRepository()
        service = new OrderService(new MockOrderRepository(), tableRepo)
        await tableRepo.save({ id: 't1', restaurantId: 'rest-1', numero: 1, descripcion: '', capacidad: 4, estado: 'ocupada' })
    })

    const request = (tableId: string | null, restaurantId = 'rest-1') => ({
        restaurantId, tableId, clientId: null, items: [{ dishId: 'd1', quantity: 1, notes: null }]
    })

    it('creates the order when the table belongs to the restaurant', async () => {
        const order = await service.create(request('t1'))
        expect(order.tableId).toBe('t1')
    })

    it('creates the order without tableId', async () => {
        await expect(service.create(request(null))).resolves.toBeTruthy()
    })

    it('throws TableNotFoundError if the table does not exist', async () => {
        await expect(service.create(request('nope'))).rejects.toThrow(TableNotFoundError)
    })

    it('throws TableNotFoundError if the table belongs to another restaurant', async () => {
        await expect(service.create(request('t1', 'rest-2'))).rejects.toThrow(TableNotFoundError)
    })
})
