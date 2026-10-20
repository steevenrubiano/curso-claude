import { Router } from 'express'
import { TableController } from '@controllers/table.controller.js'
import { dbConfig } from '@config/database.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { SqliteOrderRepository } from '@repositories/order.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { TableService } from '@services/table.service.js'
import { authenticate, authorize, restrictToOwnRestaurant } from '@shared/infrastructure/http/middlewares.js'

const tableRepository = new SqliteTableRepository(dbConfig)
const orderRepository = new SqliteOrderRepository(dbConfig)
const restaurantRepository = new SqliteRestaurantRepository(dbConfig)
const tableService = new TableService(tableRepository, orderRepository, restaurantRepository)
const tableController = new TableController(tableService)

const router = Router({ mergeParams: true })

const readers = ['admin', 'manager', 'camarero', 'cocinero']
const writers = ['admin', 'manager']

router.post('/', authenticate, authorize(writers), restrictToOwnRestaurant, tableController.create)
router.get('/', authenticate, authorize(readers), restrictToOwnRestaurant, tableController.getAll)
router.get('/available', authenticate, authorize(['cliente', 'admin', 'manager', 'camarero']), restrictToOwnRestaurant, tableController.getAvailable)
router.get('/occupied-orders', authenticate, authorize(readers), restrictToOwnRestaurant, tableController.getOccupiedWithOrders)
router.get('/:id', authenticate, authorize(readers), restrictToOwnRestaurant, tableController.getById)
router.put('/:id', authenticate, authorize(writers), restrictToOwnRestaurant, tableController.update)
router.delete('/:id', authenticate, authorize(writers), restrictToOwnRestaurant, tableController.delete)
router.patch('/:id/status', authenticate, authorize(['admin', 'manager', 'camarero']), restrictToOwnRestaurant, tableController.changeStatus)
router.post('/:id/occupy', authenticate, authorize(['cliente']), tableController.occupy)

export default router
