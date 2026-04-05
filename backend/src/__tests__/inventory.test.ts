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

// ── GET /api/inventory/batches ────────────────────────────────────────────────

describe('GET /api/inventory/batches', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/inventory/batches')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 401 when an invalid token is provided', async () => {
    const res = await request(app)
      .get('/api/inventory/batches')
      .set('Authorization', 'Bearer notavalidtoken')
    expect(res.status).toBe(401)
  })

  it('returns an array for authenticated owner (no filter)', async () => {
    const res = await request(app)
      .get('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('includes the seeded batch in the response', async () => {
    const res = await request(app)
      .get('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    const ids = (res.body as Array<{ id: number }>).map((b) => b.id)
    expect(ids).toContain(seeds.batchId)
  })

  it('returns batches with correct shape', async () => {
    const res = await request(app)
      .get('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    const [first] = res.body as Array<Record<string, unknown>>
    expect(first).toHaveProperty('id')
    expect(first).toHaveProperty('storeId')
    expect(first).toHaveProperty('priceBandId')
    expect(first).toHaveProperty('quantityAdded')
    expect(first).toHaveProperty('quantityRemaining')
    expect(first).toHaveProperty('categoryName')
    expect(first).toHaveProperty('bandPrice')
    expect(first).toHaveProperty('ageInDays')
    expect(first).toHaveProperty('createdAt')
    expect(first).toHaveProperty('updatedAt')
  })

  it('returns batches only for the authenticated store', async () => {
    const res = await request(app)
      .get('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
    const batches = res.body as Array<{ storeId: number }>
    batches.forEach((b) => {
      expect(b.storeId).toBe(seeds.storeId)
    })
  })

  it('allows manager to list batches', async () => {
    const res = await request(app)
      .get('/api/inventory/batches')
      .set('Authorization', `Bearer ${managerToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('allows staff to list batches', async () => {
    const res = await request(app)
      .get('/api/inventory/batches')
      .set('Authorization', `Bearer ${staffToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('filter=all returns all batches', async () => {
    const res = await request(app)
      .get('/api/inventory/batches?filter=all')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('filter=low_stock returns batches with quantityRemaining < 10', async () => {
    // First add a low-stock batch (2 units)
    await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        priceBandId: seeds.priceBandId,
        quantityAdded: 2,
        costPrice: 100,
      })

    const res = await request(app)
      .get('/api/inventory/batches?filter=low_stock')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    const batches = res.body as Array<{ quantityRemaining: number }>
    batches.forEach((b) => {
      expect(b.quantityRemaining).toBeLessThan(10)
    })
  })

  it('filter=new_arrivals returns batches created within the last 7 days', async () => {
    const res = await request(app)
      .get('/api/inventory/batches?filter=new_arrivals')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    const batches = res.body as Array<{ ageInDays: number }>
    batches.forEach((b) => {
      expect(b.ageInDays).toBeLessThanOrEqual(7)
    })
  })

  it('filter=aging returns batches older than 60 days (may be empty for seeded data)', async () => {
    const res = await request(app)
      .get('/api/inventory/batches?filter=aging')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    const batches = res.body as Array<{ ageInDays: number }>
    batches.forEach((b) => {
      expect(b.ageInDays).toBeGreaterThan(60)
    })
  })

  it('returns 400 for an invalid filter value', async () => {
    const res = await request(app)
      .get('/api/inventory/batches?filter=invalid_filter')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(400)
  })

  it('seeded batch has quantityAdded=20 and quantityRemaining=20', async () => {
    const res = await request(app)
      .get('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
    const batches = res.body as Array<{
      id: number
      quantityAdded: number
      quantityRemaining: number
    }>
    const seeded = batches.find((b) => b.id === seeds.batchId)
    expect(seeded).toBeDefined()
    expect(seeded!.quantityAdded).toBe(20)
    expect(seeded!.quantityRemaining).toBe(20)
  })

  it('seeded batch has correct vendorId and costPrice', async () => {
    const res = await request(app)
      .get('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
    const batches = res.body as Array<{
      id: number
      vendorId: number | null
      costPrice: number | null
    }>
    const seeded = batches.find((b) => b.id === seeds.batchId)
    expect(seeded).toBeDefined()
    expect(seeded!.vendorId).toBe(seeds.vendorId)
    expect(seeded!.costPrice).toBe(180)
  })

  it('margin is computed when costPrice and price are present', async () => {
    // seeded batch: cost=180, price=299 → margin = round((299-180)/299*100) = round(39.8) = 40
    const res = await request(app)
      .get('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
    const batches = res.body as Array<{ id: number; margin: number | null }>
    const seeded = batches.find((b) => b.id === seeds.batchId)
    expect(seeded).toBeDefined()
    expect(seeded!.margin).not.toBeNull()
    expect(seeded!.margin).toBeGreaterThan(0)
  })
})

// ── GET /api/inventory/matrix ─────────────────────────────────────────────────

describe('GET /api/inventory/matrix', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/inventory/matrix')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('returns an array for authenticated owner', async () => {
    const res = await request(app)
      .get('/api/inventory/matrix')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('each row has categoryId, categoryName, and bands object', async () => {
    const res = await request(app)
      .get('/api/inventory/matrix')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    const rows = res.body as Array<Record<string, unknown>>
    expect(rows.length).toBeGreaterThan(0)
    rows.forEach((row) => {
      expect(row).toHaveProperty('categoryId')
      expect(row).toHaveProperty('categoryName')
      expect(row).toHaveProperty('bands')
      expect(typeof row.bands).toBe('object')
    })
  })

  it('includes the seeded category in the matrix', async () => {
    const res = await request(app)
      .get('/api/inventory/matrix')
      .set('Authorization', `Bearer ${ownerToken}`)
    const rows = res.body as Array<{ categoryId: number; categoryName: string }>
    const shirtsRow = rows.find((r) => r.categoryId === seeds.categoryId)
    expect(shirtsRow).toBeDefined()
    expect(shirtsRow!.categoryName).toBe('Shirts')
  })

  it('bands object contains the seeded price (299) with correct stock (20)', async () => {
    const res = await request(app)
      .get('/api/inventory/matrix')
      .set('Authorization', `Bearer ${ownerToken}`)
    const rows = res.body as Array<{
      categoryId: number
      bands: Record<string, number>
    }>
    const shirtsRow = rows.find((r) => r.categoryId === seeds.categoryId)
    expect(shirtsRow).toBeDefined()
    // price 299 stored as key "299" or "299.00" depending on DB type — check either
    const stockAt299 =
      shirtsRow!.bands['299'] ??
      shirtsRow!.bands['299.00'] ??
      undefined
    expect(stockAt299).toBeDefined()
    expect(stockAt299).toBeGreaterThanOrEqual(20)
  })

  it('allows staff to access the matrix', async () => {
    const res = await request(app)
      .get('/api/inventory/matrix')
      .set('Authorization', `Bearer ${staffToken}`)
    expect(res.status).toBe(200)
  })

  it('stock values in bands are non-negative integers', async () => {
    const res = await request(app)
      .get('/api/inventory/matrix')
      .set('Authorization', `Bearer ${ownerToken}`)
    const rows = res.body as Array<{ bands: Record<string, number> }>
    rows.forEach((row) => {
      Object.values(row.bands).forEach((stock) => {
        expect(typeof stock).toBe('number')
        expect(stock).toBeGreaterThanOrEqual(0)
      })
    })
  })
})

// ── POST /api/inventory/batches ───────────────────────────────────────────────

describe('POST /api/inventory/batches', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .post('/api/inventory/batches')
      .send({ priceBandId: seeds.priceBandId, quantityAdded: 10 })
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 403 when staff tries to add a batch', async () => {
    const res = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ priceBandId: seeds.priceBandId, quantityAdded: 10 })
    expect(res.status).toBe(403)
  })

  it('creates a batch as owner and returns 201 with the created object', async () => {
    const res = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        priceBandId: seeds.priceBandId,
        quantityAdded: 15,
        costPrice: 200,
        vendorId: seeds.vendorId,
        notes: 'Test batch',
      })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      priceBandId: seeds.priceBandId,
      quantityAdded: 15,
      quantityRemaining: 15,
      costPrice: 200,
      vendorId: seeds.vendorId,
      notes: 'Test batch',
    })
    expect(res.body).toHaveProperty('id')
    expect(res.body).toHaveProperty('categoryName')
    expect(res.body).toHaveProperty('bandPrice')
    expect(res.body).toHaveProperty('createdAt')
  })

  it('creates a batch as manager and returns 201', async () => {
    const res = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        priceBandId: seeds.priceBandId,
        quantityAdded: 8,
      })
    expect(res.status).toBe(201)
    expect(res.body.quantityAdded).toBe(8)
  })

  it('creates a batch without optional fields (vendorId, costPrice, notes)', async () => {
    const res = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        priceBandId: seeds.priceBandId,
        quantityAdded: 5,
      })
    expect(res.status).toBe(201)
    expect(res.body.vendorId).toBeNull()
    expect(res.body.costPrice).toBeNull()
    expect(res.body.notes).toBeNull()
  })

  it('returns 400 when priceBandId is missing', async () => {
    const res = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ quantityAdded: 10 })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when quantityAdded is missing', async () => {
    const res = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ priceBandId: seeds.priceBandId })
    expect(res.status).toBe(400)
  })

  it('returns 400 when quantityAdded is 0', async () => {
    const res = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ priceBandId: seeds.priceBandId, quantityAdded: 0 })
    expect(res.status).toBe(400)
  })

  it('returns 400 when quantityAdded is negative', async () => {
    const res = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ priceBandId: seeds.priceBandId, quantityAdded: -5 })
    expect(res.status).toBe(400)
  })

  it('returns 400 when quantityAdded is a float', async () => {
    const res = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ priceBandId: seeds.priceBandId, quantityAdded: 5.5 })
    expect(res.status).toBe(400)
  })

  it('returns 400 when costPrice is zero or negative', async () => {
    const res = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ priceBandId: seeds.priceBandId, quantityAdded: 5, costPrice: 0 })
    expect(res.status).toBe(400)
  })

  it('returns 404 when priceBandId does not belong to the store', async () => {
    const res = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ priceBandId: 999999, quantityAdded: 10 })
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error')
  })

  it('newly added batch appears in GET /api/inventory/batches', async () => {
    const createRes = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ priceBandId: seeds.priceBandId, quantityAdded: 3 })
    expect(createRes.status).toBe(201)
    const newId = createRes.body.id as number

    const listRes = await request(app)
      .get('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
    const ids = (listRes.body as Array<{ id: number }>).map((b) => b.id)
    expect(ids).toContain(newId)
  })

  it('quantityRemaining equals quantityAdded on creation', async () => {
    const res = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ priceBandId: seeds.priceBandId, quantityAdded: 12 })
    expect(res.status).toBe(201)
    expect(res.body.quantityRemaining).toBe(res.body.quantityAdded)
  })
})

// ── PATCH /api/inventory/batches/:id (close) ──────────────────────────────────

describe('PATCH /api/inventory/batches/:id — action: close', () => {
  let closeBatchId: number

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ priceBandId: seeds.priceBandId, quantityAdded: 10 })
    closeBatchId = res.body.id as number
  })

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .patch(`/api/inventory/batches/${closeBatchId}`)
      .send({ action: 'close' })
    expect(res.status).toBe(401)
  })

  it('returns 403 when staff tries to close a batch', async () => {
    const res = await request(app)
      .patch(`/api/inventory/batches/${closeBatchId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ action: 'close' })
    expect(res.status).toBe(403)
  })

  it('closes an active batch (sets quantityRemaining to 0) and returns 200', async () => {
    const res = await request(app)
      .patch(`/api/inventory/batches/${closeBatchId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'close' })
    expect(res.status).toBe(200)
    expect(res.body.quantityRemaining).toBe(0)
    expect(res.body.id).toBe(closeBatchId)
  })

  it('returns 404 when batch id does not exist', async () => {
    const res = await request(app)
      .patch('/api/inventory/batches/999999')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'close' })
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when batch id is not a number', async () => {
    const res = await request(app)
      .patch('/api/inventory/batches/notanumber')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'close' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when action field is missing', async () => {
    const res = await request(app)
      .patch(`/api/inventory/batches/${closeBatchId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it('returns 400 when action has an invalid value', async () => {
    const res = await request(app)
      .patch(`/api/inventory/batches/${closeBatchId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'reopen' })
    expect(res.status).toBe(400)
  })

  it('manager can close a batch', async () => {
    // Create a fresh batch for the manager to close
    const createRes = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ priceBandId: seeds.priceBandId, quantityAdded: 5 })
    const batchId = createRes.body.id as number

    const res = await request(app)
      .patch(`/api/inventory/batches/${batchId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ action: 'close' })
    expect(res.status).toBe(200)
    expect(res.body.quantityRemaining).toBe(0)
  })
})

// ── PATCH /api/inventory/batches/:id (adjust) ─────────────────────────────────

describe('PATCH /api/inventory/batches/:id — action: adjust', () => {
  let adjustBatchId: number

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ priceBandId: seeds.priceBandId, quantityAdded: 50 })
    adjustBatchId = res.body.id as number
  })

  it('adjusts quantity upward and returns 200 with new quantity', async () => {
    const res = await request(app)
      .patch(`/api/inventory/batches/${adjustBatchId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'adjust', quantity: 60 })
    expect(res.status).toBe(200)
    expect(res.body.quantityRemaining).toBe(60)
  })

  it('adjusts quantity downward and returns 200 with new quantity', async () => {
    const res = await request(app)
      .patch(`/api/inventory/batches/${adjustBatchId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'adjust', quantity: 30 })
    expect(res.status).toBe(200)
    expect(res.body.quantityRemaining).toBe(30)
  })

  it('adjusts quantity to 0 (fully deplete) and returns 200', async () => {
    const res = await request(app)
      .patch(`/api/inventory/batches/${adjustBatchId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'adjust', quantity: 0 })
    expect(res.status).toBe(200)
    expect(res.body.quantityRemaining).toBe(0)
  })

  it('returns 400 when quantity is missing for adjust action', async () => {
    const res = await request(app)
      .patch(`/api/inventory/batches/${adjustBatchId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'adjust' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when quantity is negative for adjust action', async () => {
    const res = await request(app)
      .patch(`/api/inventory/batches/${adjustBatchId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'adjust', quantity: -5 })
    expect(res.status).toBe(400)
  })

  it('returns 404 when batch id does not exist', async () => {
    const res = await request(app)
      .patch('/api/inventory/batches/999999')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'adjust', quantity: 10 })
    expect(res.status).toBe(404)
  })

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .patch(`/api/inventory/batches/${adjustBatchId}`)
      .send({ action: 'adjust', quantity: 10 })
    expect(res.status).toBe(401)
  })

  it('returns 403 when staff tries to adjust', async () => {
    const res = await request(app)
      .patch(`/api/inventory/batches/${adjustBatchId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ action: 'adjust', quantity: 10 })
    expect(res.status).toBe(403)
  })

  it('adjusted quantity is reflected in GET /api/inventory/batches', async () => {
    // Create a fresh batch and adjust it
    const createRes = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ priceBandId: seeds.priceBandId, quantityAdded: 25 })
    const batchId = createRes.body.id as number

    await request(app)
      .patch(`/api/inventory/batches/${batchId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'adjust', quantity: 18 })

    const listRes = await request(app)
      .get('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
    const batches = listRes.body as Array<{ id: number; quantityRemaining: number }>
    const updated = batches.find((b) => b.id === batchId)
    expect(updated).toBeDefined()
    expect(updated!.quantityRemaining).toBe(18)
  })
})

// ── PATCH /api/inventory/batches/:id (defective) ──────────────────────────────

describe('PATCH /api/inventory/batches/:id — action: defective', () => {
  let defectiveBatchId: number

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        priceBandId: seeds.priceBandId,
        quantityAdded: 10,
        notes: 'Initial note',
      })
    defectiveBatchId = res.body.id as number
  })

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .patch(`/api/inventory/batches/${defectiveBatchId}`)
      .send({ action: 'defective' })
    expect(res.status).toBe(401)
  })

  it('returns 403 when staff tries to mark as defective', async () => {
    const res = await request(app)
      .patch(`/api/inventory/batches/${defectiveBatchId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ action: 'defective' })
    expect(res.status).toBe(403)
  })

  it('marks batch as defective and returns 200 with [DEFECTIVE] in notes', async () => {
    const res = await request(app)
      .patch(`/api/inventory/batches/${defectiveBatchId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'defective' })
    expect(res.status).toBe(200)
    expect(res.body.notes).toContain('[DEFECTIVE]')
  })

  it('appends [DEFECTIVE] to existing notes', async () => {
    // The batch had notes='Initial note', after defective action it should be 'Initial note [DEFECTIVE]'
    const res = await request(app)
      .get('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
    const batches = res.body as Array<{ id: number; notes: string | null }>
    const batch = batches.find((b) => b.id === defectiveBatchId)
    expect(batch).toBeDefined()
    expect(batch!.notes).toContain('Initial note')
    expect(batch!.notes).toContain('[DEFECTIVE]')
  })

  it('marks batch as defective when notes are null — sets notes to [DEFECTIVE]', async () => {
    const createRes = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ priceBandId: seeds.priceBandId, quantityAdded: 4 })
    const batchId = createRes.body.id as number

    const res = await request(app)
      .patch(`/api/inventory/batches/${batchId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'defective' })
    expect(res.status).toBe(200)
    expect(res.body.notes).toBe('[DEFECTIVE]')
  })

  it('returns 404 when batch id does not exist', async () => {
    const res = await request(app)
      .patch('/api/inventory/batches/999999')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'defective' })
    expect(res.status).toBe(404)
  })

  it('manager can mark a batch as defective', async () => {
    const createRes = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ priceBandId: seeds.priceBandId, quantityAdded: 6 })
    const batchId = createRes.body.id as number

    const res = await request(app)
      .patch(`/api/inventory/batches/${batchId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ action: 'defective' })
    expect(res.status).toBe(200)
    expect(res.body.notes).toContain('[DEFECTIVE]')
  })

  it('defective action does not change quantityRemaining', async () => {
    const createRes = await request(app)
      .post('/api/inventory/batches')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ priceBandId: seeds.priceBandId, quantityAdded: 7 })
    const batchId = createRes.body.id as number

    const res = await request(app)
      .patch(`/api/inventory/batches/${batchId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ action: 'defective' })
    expect(res.status).toBe(200)
    expect(res.body.quantityRemaining).toBe(7)
  })
})
