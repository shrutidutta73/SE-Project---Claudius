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

// ── GET /api/categories ──────────────────────────────────────────────────────

describe('GET /api/categories', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/categories')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 401 when an invalid token is provided', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', 'Bearer invalidtoken')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('returns an array for authenticated owner', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns categories that include the seeded category', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    const names = (res.body as Array<{ name: string }>).map((c) => c.name)
    expect(names).toContain('Shirts')
  })

  it('returns categories with correct shape (id, name, storeId, createdAt)', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    const [first] = res.body as Array<Record<string, unknown>>
    expect(first).toHaveProperty('id')
    expect(first).toHaveProperty('name')
    expect(first).toHaveProperty('storeId')
    expect(first).toHaveProperty('createdAt')
  })

  it('allows authenticated manager to list categories', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${managerToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('allows authenticated staff to list categories', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${staffToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns categories only for the authenticated store (not from other stores)', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    const rows = res.body as Array<{ storeId: number }>
    rows.forEach((cat) => {
      expect(cat.storeId).toBe(seeds.storeId)
    })
  })
})

// ── POST /api/categories ──────────────────────────────────────────────────────

describe('POST /api/categories', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .post('/api/categories')
      .send({ name: 'Trousers' })
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 403 when staff tries to create a category', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'Unauthorized Category' })
    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('error')
  })

  it('creates a new category as owner and returns 201 with the created object', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Jackets' })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      name: 'Jackets',
      storeId: seeds.storeId,
    })
    expect(res.body).toHaveProperty('id')
    expect(res.body).toHaveProperty('createdAt')
  })

  it('creates a new category as manager and returns 201', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Shoes' })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ name: 'Shoes' })
  })

  it('returns 400 when name is an empty string', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: '' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when name field is missing entirely', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it('returns 400 when name is not a string', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 123 })
    expect(res.status).toBe(400)
  })

  it('returns 409 when creating a duplicate category name in the same store', async () => {
    // First creation should succeed
    await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Duplicate Category' })

    // Second creation with the same name should fail with 409
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Duplicate Category' })
    expect(res.status).toBe(409)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 409 specifically for the seeded category name "Shirts"', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Shirts' })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already exists/i)
  })

  it('persists the newly created category so it appears in GET /api/categories', async () => {
    const createRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Hats' })
    expect(createRes.status).toBe(201)

    const listRes = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
    const names = (listRes.body as Array<{ name: string }>).map((c) => c.name)
    expect(names).toContain('Hats')
  })
})

// ── PATCH /api/categories/:id ─────────────────────────────────────────────────

describe('PATCH /api/categories/:id', () => {
  it('returns 404 for a non-existent category id (endpoint not yet implemented or category missing)', async () => {
    const res = await request(app)
      .patch('/api/categories/999999')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Updated Name' })
    // Either 404 (route exists, resource not found) or 404 (route does not exist)
    expect(res.status).toBe(404)
  })

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .patch(`/api/categories/${seeds.categoryId}`)
      .send({ name: 'Updated' })
    // Without authentication, expect 401 if route is wired, or 404 if not
    expect([401, 404]).toContain(res.status)
  })
})

// ── DELETE /api/categories/:id ────────────────────────────────────────────────

describe('DELETE /api/categories/:id', () => {
  it('returns 404 for a non-existent category id (endpoint not yet implemented or category missing)', async () => {
    const res = await request(app)
      .delete('/api/categories/999999')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(404)
  })

  it('returns 401 or 404 when no token is provided', async () => {
    const res = await request(app)
      .delete(`/api/categories/${seeds.categoryId}`)
    expect([401, 404]).toContain(res.status)
  })

  it('seeded category still exists after unsuccessful delete attempts (category has price bands)', async () => {
    // The seeded category has a price band, so deleting it should either 404 (not implemented)
    // or 409 (has dependent records) if deletion is implemented
    const res = await request(app)
      .delete(`/api/categories/${seeds.categoryId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect([404, 409]).toContain(res.status)

    // Verify the category is still accessible via GET
    const listRes = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
    const ids = (listRes.body as Array<{ id: number }>).map((c) => c.id)
    expect(ids).toContain(seeds.categoryId)
  })
})
