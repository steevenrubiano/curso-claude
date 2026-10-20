import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import { dbConfig } from '@config/database.js'

const sign = (role: string, restaurantId: string | null) =>
    `Bearer ${jwt.sign({ id: `${role}-id`, role, restaurantId }, process.env['JWT_SECRET'] || 'super-secret-resttek-key')}`

const admin = sign('admin', null)
const manager = sign('manager', 'r1')
const camarero = sign('camarero', 'r1')
const cocinero = sign('cocinero', 'r1')
const cliente = sign('cliente', null)

describe('Tables HTTP API', () => {
    beforeAll(async () => {
        process.env['NODE_ENV'] = 'test'
        await dbConfig.initialize()
        for (const id of ['r1', 'r2']) {
            await dbConfig.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, 'Resto', 'Calle 1', 'a@b.com', '600000000', 'A', 'B', new Date().toISOString(), new Date().toISOString()]
            )
        }
        await dbConfig.run(
            "INSERT INTO dishes (id, name, description, price, category, available, restaurant_id, created_at, updated_at) VALUES ('d1', 'Paella', null, 10, 'principal', 1, 'r1', 'x', 'x')"
        )
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    it('requires authentication and the right role', async () => {
        await request(app).get('/api/v1/restaurants/r1/tables').expect(401)
        await request(app).post('/api/v1/restaurants/r1/tables').set('Authorization', camarero).send({ numero: 1, capacidad: 2 }).expect(403)
        await request(app).get('/api/v1/restaurants/r1/tables').set('Authorization', cliente).expect(403)
    })

    it('runs the full flow: CRUD, availability, occupation, order and occupied-orders', async () => {
        const base = '/api/v1/restaurants/r1/tables'
        const created = await request(app).post(base).set('Authorization', manager).send({ numero: 1, descripcion: 'Terraza', capacidad: 4 }).expect(201)
        expect(created.body).toMatchObject({ restaurantId: 'r1', numero: 1, descripcion: 'Terraza', capacidad: 4, estado: 'libre' })
        const id = created.body.id

        const dup = await request(app).post(base).set('Authorization', admin).send({ numero: 1, capacidad: 2 }).expect(409)
        expect(dup.body.error).toBe('TableNumberAlreadyExistsError')
        await request(app).post(base).set('Authorization', admin).send({ numero: 0, capacidad: 2 }).expect(400)
        await request(app).post('/api/v1/restaurants/r2/tables').set('Authorization', manager).send({ numero: 1, capacidad: 2 }).expect(403)
        await request(app).post('/api/v1/restaurants/nope/tables').set('Authorization', admin).send({ numero: 1, capacidad: 2 }).expect(404)

        await request(app).put(`${base}/${id}`).set('Authorization', manager).send({ numero: 1, descripcion: 'Interior', capacidad: 6 }).expect(200)
        await request(app).get(`${base}/${id}`).set('Authorization', cocinero).expect(200)
        await request(app).get(`${base}/nope`).set('Authorization', cocinero).expect(404)
        expect((await request(app).get(`${base}?estado=libre&minCapacidad=5`).set('Authorization', camarero).expect(200)).body).toHaveLength(1)

        await request(app).get(`${base}/available`).set('Authorization', cliente).expect(400)
        expect((await request(app).get(`${base}/available?people=7`).set('Authorization', cliente).expect(200)).body).toEqual([])
        expect((await request(app).get(`${base}/available?people=3`).set('Authorization', cliente).expect(200)).body).toHaveLength(1)

        await request(app).post(`${base}/${id}/occupy`).set('Authorization', cliente).send({ people: 9 }).expect(400)
        const occupied = await request(app).post(`${base}/${id}/occupy`).set('Authorization', cliente).send({ people: 3 }).expect(200)
        expect(occupied.body.estado).toBe('ocupada')
        const again = await request(app).post(`${base}/${id}/occupy`).set('Authorization', cliente).expect(409)
        expect(again.body.error).toBe('TableNotAvailableError')
        await request(app).delete(`${base}/${id}`).set('Authorization', manager).expect(409)

        await request(app).post('/api/v1/orders').set('Authorization', cliente)
            .send({ restaurantId: 'r1', tableId: 'nope', items: [{ dishId: 'd1', quantity: 1 }] }).expect(404)
        await request(app).post('/api/v1/orders').set('Authorization', cliente)
            .send({ restaurantId: 'r1', tableId: id, items: [{ dishId: 'd1', quantity: 2 }] }).expect(201)

        const occ = await request(app).get(`${base}/occupied-orders`).set('Authorization', cocinero).expect(200)
        expect(occ.body).toHaveLength(1)
        expect(occ.body[0].table.id).toBe(id)
        expect(occ.body[0].orders[0].items).toHaveLength(2)
        expect(occ.body[0].orders[0].items[0].dishName).toBe('Paella')

        await request(app).patch(`${base}/${id}/status`).set('Authorization', cocinero).send({ estado: 'libre' }).expect(403)
        await request(app).patch(`${base}/${id}/status`).set('Authorization', camarero).send({ estado: 'x' }).expect(400)
        const freed = await request(app).patch(`${base}/${id}/status`).set('Authorization', camarero).send({ estado: 'libre' }).expect(200)
        expect(freed.body.estado).toBe('libre')
        await request(app).delete(`${base}/${id}`).set('Authorization', manager).expect(204)
    })
})
