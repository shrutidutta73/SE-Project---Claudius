import request from 'supertest'
import app from '../app'
import { resetDb, seedBase, pool } from './helpers/db'
import type { BaseSeeds } from './helpers/db'
import { getOwnerToken, getManagerToken, getStaffToken } from './helpers/auth'

let seeds: BaseSeeds
let ownerToken: string
let managerToken: string
let staffToken: string

beforeAll(async () => {
  await resetDb()
  seeds = await seedBase()
  ownerToken = await getOwnerToken()
  managerToken = await getManagerToken()
  staffToken = await getStaffToken()
})

afterAll(async () => {
  await pool.end()
})

// ── GET /api/price-bands ──────────────────────────────────────────────────────

describe('GET /api/price-bands', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/price-bands')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 401 when an invalid token is provided', async () => {
    const res = await request(app)
      .get('/api/price-bands')
      .set('Authorization', 'Bearer badtoken')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('returns an array for authenticated owner', async () => {
    const res = await request(app)
      .get('/api/price-bands')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('includes the seeded price band', async () => {
    const res = await request(app)
      .get('/api/price-bands')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    const ids = (res.body as Array<{ id: number }>).map((b) => b.id)
    expect(ids).toContain(seeds.priceBandId)
  })

  it('returns price bands with correct shape (id, storeId, categoryId, price, isActive, createdAt)', async () => {
    const res = await request(app)
      .get('/api/price-bands')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    const [first] = res.body as Array<Record<string, unknown>>
    expect(first).toHaveProperty('id')
    expect(first).toHaveProperty('storeId')
    expect(first).toHaveProperty('categoryId')
    expect(first).toHaveProperty('price')
    expect(first).toHaveProperty('isActive')
    expect(first).toHaveProperty('createdAt')
  })

  it('returns only active price bands (isActive = true)', async () => {
    const res = await request(app)
      .get('/api/price-bands')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    const bands = res.body as Array<{ isActive: boolean }>
    bands.forEach((band) => {
      expect(band.isActive).toBe(true)
    })
  })

  it('returns price bands only for the authenticated store', async () => {
    const res = await request(app)
      .get('/api/price-bands')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    const bands = res.body as Array<{ storeId: number }>
    bands.forEach((band) => {
      expect(band.storeId).toBe(seeds.storeId)
    })
  })

  it('allows authenticated manager to list price bands', async () => {
    const res = await request(app)
      .get('/api/price-bands')
      .set('Authorization', `Bearer ${managerToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('allows authenticated staff to list price bands', async () => {
    const res = await request(app)
      .get('/api/price-bands')
      .set('Authorization', `Bearer ${staffToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns price as a number, not a string', async () => {
    const res = await request(app)
      .get('/api/price-bands')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    const bands = res.body as Array<{ price: unknown }>
    bands.forEach((band) => {
      expect(typeof band.price).toBe('number')
    })
  })
})

// ── GET /api/price-bands/with-stock ──────────────────────────────────────────

describe('GET /api/price-bands/with-stock', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/price-bands/with-stock')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('returns an array for authenticated owner', async () => {
    const res = await request(app)
      .get('/api/price-bands/with-stock')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('includes totalStock and categoryName fields in each band', async () => {
    const res = await request(app)
      .get('/api/price-bands/with-stock')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    const bands = res.body as Array<Record<string, unknown>>
    expect(bands.length).toBeGreaterThan(0)
    const [first] = bands
    expect(first).toHaveProperty('totalStock')
    expect(first).toHaveProperty('categoryName')
  })

  it('totalStock reflects the seeded batch (20 units)', async () => {
    const res = await request(app)
      .get('/api/price-bands/with-stock')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    const bands = res.body as Array<{ id: number; totalStock: number }>
    const seeded = bands.find((b) => b.id === seeds.priceBandId)
    expect(seeded).toBeDefined()
    expect(seeded!.totalStock).toBe(20)
  })

  it('totalStock is a non-negative integer', async () => {
    const res = await request(app)
      .get('/api/price-bands/with-stock')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    const bands = res.body as Array<{ totalStock: unknown }>
    bands.forEach((band) => {
      expect(typeof band.totalStock).toBe('number')
      expect(band.totalStock as number).toBeGreaterThanOrEqual(0)
    })
  })

  it('categoryName matches the seeded category name', async () => {
    const res = await request(app)
      .get('/api/price-bands/with-stock')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    const bands = res.body as Array<{ id: number; categoryName: string }>
    const seeded = bands.find((b) => b.id === seeds.priceBandId)
    expect(seeded).toBeDefined()
    expect(seeded!.categoryName).toBe('Shirts')
  })

  it('allows staff to access with-stock endpoint', async () => {
    const res = await request(app)
      .get('/api/price-bands/with-stock')
      .set('Authorization', `Bearer ${staffToken}`)
    expect(res.status).toBe(200)
  })
})

// ── POST /api/price-bands ─────────────────────────────────────────────────────

describe('POST /api/price-bands', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .post('/api/price-bands')
      .send({ categoryId: seeds.categoryId, price: 499 })
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 403 when staff tries to create a price band', async () => {
    const res = await request(app)
      .post('/api/price-bands')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ categoryId: seeds.categoryId, price: 399 })
    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('error')
  })

  it('creates a new price band as owner and returns 201 with the created object', async () => {
    const res = await request(app)
      .post('/api/price-bands')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ categoryId: seeds.categoryId, price: 599 })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      categoryId: seeds.categoryId,
      storeId: seeds.storeId,
    })
    expect(res.body.price).toBeCloseTo(599)
    expect(res.body).toHaveProperty('id')
    expect(res.body).toHaveProperty('isActive')
    expect(res.body).toHaveProperty('createdAt')
  })

  it('creates a new price band as manager and returns 201', async () => {
    const res = await request(app)
      .post('/api/price-bands')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ categoryId: seeds.categoryId, price: 799 })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ categoryId: seeds.categoryId })
  })

  it('returns 400 when categoryId is missing', async () => {
    const res = await request(app)
      .post('/api/price-bands')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ price: 399 })
    expect(res.status).toBe(400)
  })

  it('returns 400 when price is missing', async () => {
    const res = await request(app)
      .post('/api/price-bands')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ categoryId: seeds.categoryId })
    expect(res.status).toBe(400)
  })

  it('returns 400 when price is zero', async () => {
    const res = await request(app)
      .post('/api/price-bands')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ categoryId: seeds.categoryId, price: 0 })
    expect(res.status).toBe(400)
  })

  it('returns 400 when price is negative', async () => {
    const res = await request(app)
      .post('/api/price-bands')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ categoryId: seeds.categoryId, price: -50 })
    expect(res.status).toBe(400)
  })

  it('returns 400 when categoryId is not a positive integer', async () => {
    const res = await request(app)
      .post('/api/price-bands')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ categoryId: -1, price: 299 })
    expect(res.status).toBe(400)
  })

  it('returns 400 when categoryId is a float', async () => {
    const res = await request(app)
      .post('/api/price-bands')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ categoryId: 1.5, price: 299 })
    expect(res.status).toBe(400)
  })

  it('returns 404 when categoryId does not belong to the store', async () => {
    const res = await request(app)
      .post('/api/price-bands')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ categoryId: 999999, price: 299 })
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error')
  })

  it('accepts decimal prices', async () => {
    const res = await request(app)
      .post('/api/price-bands')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ categoryId: seeds.categoryId, price: 299.99 })
    expect(res.status).toBe(201)
    expect(res.body.price).toBeCloseTo(299.99)
  })

  it('newly created price band appears in GET /api/price-bands', async () => {
    const createRes = await request(app)
      .post('/api/price-bands')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ categoryId: seeds.categoryId, price: 1099 })
    expect(createRes.status).toBe(201)
    const newId = createRes.body.id as number

    const listRes = await request(app)
      .get('/api/price-bands')
      .set('Authorization', `Bearer ${ownerToken}`)
    const ids = (listRes.body as Array<{ id: number }>).map((b) => b.id)
    expect(ids).toContain(newId)
  })

  it('newly created price band appears in GET /api/price-bands/with-stock with totalStock = 0', async () => {
    const createRes = await request(app)
      .post('/api/price-bands')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ categoryId: seeds.categoryId, price: 1199 })
    expect(createRes.status).toBe(201)
    const newId = createRes.body.id as number

    const listRes = await request(app)
      .get('/api/price-bands/with-stock')
      .set('Authorization', `Bearer ${ownerToken}`)
    const bands = listRes.body as Array<{ id: number; totalStock: number }>
    const created = bands.find((b) => b.id === newId)
    expect(created).toBeDefined()
    expect(created!.totalStock).toBe(0)
  })
})

// ── PATCH /api/price-bands/:id ────────────────────────────────────────────────

describe('PATCH /api/price-bands/:id', () => {
  it('returns 401 or 404 when no token is provided (not implemented or unauthorized)', async () => {
    const res = await request(app)
      .patch(`/api/price-bands/${seeds.priceBandId}`)
      .send({ price: 349 })
    expect([401, 404]).toContain(res.status)
  })

  it('returns 404 for a non-existent price band id', async () => {
    const res = await request(app)
      .patch('/api/price-bands/999999')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ price: 349 })
    expect(res.status).toBe(404)
  })
})

// ── DELETE /api/price-bands/:id ───────────────────────────────────────────────

describe('DELETE /api/price-bands/:id', () => {
  it('returns 401 or 404 when no token is provided (not implemented or unauthorized)', async () => {
    const res = await request(app)
      .delete(`/api/price-bands/${seeds.priceBandId}`)
    expect([401, 404]).toContain(res.status)
  })

  it('returns 404 for a non-existent price band id', async () => {
    const res = await request(app)
      .delete('/api/price-bands/999999')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(404)
  })

  it('seeded price band still exists after unsuccessful delete attempts (has inventory batches)', async () => {
    // The seeded price band has at least one batch, so deleting it should either
    // 404 (not implemented) or 409 (has dependent records) if deletion is implemented
    const res = await request(app)
      .delete(`/api/price-bands/${seeds.priceBandId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect([404, 409]).toContain(res.status)

    // Verify the band is still accessible
    const listRes = await request(app)
      .get('/api/price-bands')
      .set('Authorization', `Bearer ${ownerToken}`)
    const ids = (listRes.body as Array<{ id: number }>).map((b) => b.id)
    expect(ids).toContain(seeds.priceBandId)
  })
})
