import { describe, it, expect, vi } from 'vitest'
import { restrictToOwnRestaurant } from './middlewares.js'

const run = (user: any, restaurantId: string) => {
    const req: any = { user, params: { restaurantId } }
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    const next = vi.fn()
    restrictToOwnRestaurant(req, res, next)
    return { res, next }
}

describe('restrictToOwnRestaurant', () => {
    it.each(['manager', 'camarero', 'cocinero'])('lets a %s through for their own restaurant', role => {
        expect(run({ role, restaurantId: 'r1' }, 'r1').next).toHaveBeenCalled()
    })

    it.each(['manager', 'camarero', 'cocinero'])('returns 403 for a %s on another restaurant', role => {
        const { res, next } = run({ role, restaurantId: 'r1' }, 'r2')
        expect(next).not.toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(403)
        expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden: Insufficient permissions' })
    })

    it.each(['admin', 'cliente'])('does not restrict %s', role => {
        expect(run({ role, restaurantId: null }, 'r2').next).toHaveBeenCalled()
    })
})
