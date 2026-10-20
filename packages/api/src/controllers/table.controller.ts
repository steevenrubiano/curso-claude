import type { Request, Response, NextFunction } from 'express'
import type { TableService } from '@services/table.service.js'

export class TableController {
    constructor(private readonly tableService: TableService) {}

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.create(this.restaurantId(req), req.body ?? {})
            res.status(201).json(table)
        } catch (error) {
            next(error)
        }
    }

    getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { estado, minCapacidad } = req.query
            const tables = await this.tableService.list(this.restaurantId(req), { estado, minCapacidad })
            res.status(200).json(tables)
        } catch (error) {
            next(error)
        }
    }

    getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.getById(this.restaurantId(req), req.params['id'] as string)
            res.status(200).json(table)
        } catch (error) {
            next(error)
        }
    }

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.update(this.restaurantId(req), req.params['id'] as string, req.body ?? {})
            res.status(200).json(table)
        } catch (error) {
            next(error)
        }
    }

    delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.tableService.delete(this.restaurantId(req), req.params['id'] as string)
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }

    changeStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.changeStatus(this.restaurantId(req), req.params['id'] as string, req.body?.estado)
            res.status(200).json(table)
        } catch (error) {
            next(error)
        }
    }

    getAvailable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const tables = await this.tableService.listAvailable(this.restaurantId(req), req.query['people'])
            res.status(200).json(tables)
        } catch (error) {
            next(error)
        }
    }

    occupy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.occupy(this.restaurantId(req), req.params['id'] as string, req.body?.people)
            res.status(200).json(table)
        } catch (error) {
            next(error)
        }
    }

    getOccupiedWithOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.tableService.listOccupiedWithOrders(this.restaurantId(req))
            res.status(200).json(result)
        } catch (error) {
            next(error)
        }
    }

    private restaurantId(req: Request): string {
        return req.params['restaurantId'] as string
    }
}
