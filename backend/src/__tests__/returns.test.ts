import request from 'supertest'
import app from '../app'
import { resetDb, seedBase, pool } from './helpers/db'
import { getOwnerToken, getManagerToken, getStaffToken } from './helpers/auth'
import type { BaseSeeds } from './helpers/db'

let seeds: BaseSeeds
let ownerToken: string
let managerToken: string
let staffToken: string

// IDs obtained after creating a sale in beforeAll
let saleId: number
let saleItemId: number

beforeAll(async () => {
  await resetDb()
  seeds = await seedBase()
  ;[ownerToken, managerToken, staffToken] = await Promise.all([
    getOwnerToken(),
    getManagerToken(),
    getStaffToken(),
  ])

  // Create a baseline sale of 3 units so we have saleId and saleItemId for tests.
  // The seed batch starts with 20 units so this is always safe.
  const saleRes = await request(app)
    .post('/api/sales')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      items: [
        {
          priceBandId: seeds.priceBandId,
          categoryName: 'Shirts',
          price: 299,
          quantity: 3,
          subtotal: 897,
        },
      ],
      paymentMethod: 'cash',
      discountAmount: 0,
    })

  if (saleRes.status !== 201) {
    throw new Error(`Failed to create baseline sale: ${JSON.stringify(saleRes.body)}`)
  }
  saleId = saleRes.body.id

  // Fetch the sale_item id from the DB
  const itemRes = await pool.query<{ id: number }>(
    `SELECT id FROM sale_items WHERE sale_id = $1 LIMIT 1`,
    [saleId],
  )
  if (!itemRes.rows[0]) {
    throw new Error('No sale_item found for baseline sale')
  }
  saleItemId = itemRes.rows[0].id
})

afterAll(async () => {
  await pool.end()
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Creates a fresh sale of `quantity` units and returns { saleId, saleItemId }. */
async function createSale(
  token: string,
  quantity: number,
): Promise<{ saleId: number; saleItemId: number }> {
  const res = await request(app)
    .post('/api/sales')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: [
        {
          priceBandId: seeds.priceBandId,
          categoryName: 'Shirts',
          price: 299,
          quantity,
          subtotal: 299 * quantity,
        },
      ],
      paymentMethod: 'cash',
      discountAmount: 0,
    })

  if (res.status !== 201) {
    throw new Error(`createSale helper failed: ${JSON.stringify(res.body)}`)
  }
  const newSaleId: number = res.body.id

  const itemRes = await pool.query<{ id: number }>(
    `SELECT id FROM sale_items WHERE sale_id = $1 LIMIT 1`,
    [newSaleId],
  )
  return { saleId: newSaleId, saleItemId: itemRes.rows[0].id }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/returns
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/returns', () => {
  it('201 — owner can create a return for an existing sale', async () => {
    const { saleId: sid, saleItemId: siid } = await createSale(ownerToken, 2)

    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        saleId: sid,
        type: 'return',
        items: [{ saleItemId: siid, quantity: 1 }],
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body).toHaveProperty('createdAt')
    expect(typeof res.body.id).toBe('number')
    expect(typeof res.body.createdAt).toBe('string')
  })

  it('201 — manager can create a return', async () => {
    const { saleId: sid, saleItemId: siid } = await createSale(ownerToken, 2)

    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        saleId: sid,
        type: 'return',
        items: [{ saleItemId: siid, quantity: 1 }],
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
  })

  it('201 — staff can create a return (POST / has no role restriction)', async () => {
    const { saleId: sid, saleItemId: siid } = await createSale(ownerToken, 2)

    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        saleId: sid,
        type: 'return',
        items: [{ saleItemId: siid, quantity: 1 }],
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
  })

  it('201 — exchange type is accepted', async () => {
    const { saleId: sid, saleItemId: siid } = await createSale(ownerToken, 2)

    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        saleId: sid,
        type: 'exchange',
        items: [{ saleItemId: siid, quantity: 1 }],
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
  })

  it('201 — full quantity return (return all items)', async () => {
    const { saleId: sid, saleItemId: siid } = await createSale(ownerToken, 2)

    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        saleId: sid,
        type: 'return',
        items: [{ saleItemId: siid, quantity: 2 }],
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
  })

  it('stock is restored to inventory after a return', async () => {
    // Record stock before the sale
    const beforeSale = await pool.query<{ quantity_remaining: number }>(
      `SELECT quantity_remaining FROM inventory_batches WHERE id = $1`,
      [seeds.batchId],
    )
    const stockBeforeSale = beforeSale.rows[0].quantity_remaining

    // Create a sale of 2 units
    const { saleId: sid, saleItemId: siid } = await createSale(ownerToken, 2)

    const afterSale = await pool.query<{ quantity_remaining: number }>(
      `SELECT quantity_remaining FROM inventory_batches WHERE id = $1`,
      [seeds.batchId],
    )
    const stockAfterSale = afterSale.rows[0].quantity_remaining
    expect(stockAfterSale).toBe(stockBeforeSale - 2)

    // Return 1 unit
    const returnRes = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        saleId: sid,
        type: 'return',
        items: [{ saleItemId: siid, quantity: 1 }],
      })
    expect(returnRes.status).toBe(201)

    const afterReturn = await pool.query<{ quantity_remaining: number }>(
      `SELECT quantity_remaining FROM inventory_batches WHERE id = $1`,
      [seeds.batchId],
    )
    const stockAfterReturn = afterReturn.rows[0].quantity_remaining
    // Stock should have been restored by exactly 1 unit
    expect(stockAfterReturn).toBe(stockAfterSale + 1)
  })

  it('stock is fully restored when returning all sold units', async () => {
    const before = await pool.query<{ quantity_remaining: number }>(
      `SELECT quantity_remaining FROM inventory_batches WHERE id = $1`,
      [seeds.batchId],
    )
    const stockBefore = before.rows[0].quantity_remaining

    const { saleId: sid, saleItemId: siid } = await createSale(ownerToken, 2)

    await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        saleId: sid,
        type: 'return',
        items: [{ saleItemId: siid, quantity: 2 }],
      })

    const after = await pool.query<{ quantity_remaining: number }>(
      `SELECT quantity_remaining FROM inventory_batches WHERE id = $1`,
      [seeds.batchId],
    )
    expect(after.rows[0].quantity_remaining).toBe(stockBefore)
  })

  it('400 — return quantity exceeds sold quantity', async () => {
    // saleItemId from the baseline sale had quantity 3; try to return 5
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        saleId,
        type: 'return',
        items: [{ saleItemId, quantity: 999 }],
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toMatch(/exceed/i)
  })

  it('404 — non-existent saleId returns 404', async () => {
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        saleId: 999999,
        type: 'return',
        items: [{ saleItemId: 999999, quantity: 1 }],
      })

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error')
  })

  it('404 — valid saleId but non-existent saleItemId returns 404', async () => {
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        saleId,
        type: 'return',
        items: [{ saleItemId: 999999, quantity: 1 }],
      })

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error')
  })

  it('401 — no token is rejected', async () => {
    const res = await request(app)
      .post('/api/returns')
      .send({
        saleId,
        type: 'return',
        items: [{ saleItemId, quantity: 1 }],
      })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('401 — malformed token is rejected', async () => {
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', 'Bearer not.valid.jwt')
      .send({
        saleId,
        type: 'return',
        items: [{ saleItemId, quantity: 1 }],
      })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — missing saleId', async () => {
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        type: 'return',
        items: [{ saleItemId, quantity: 1 }],
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — missing type field', async () => {
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        saleId,
        items: [{ saleItemId, quantity: 1 }],
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — invalid type value', async () => {
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        saleId,
        type: 'refund', // not in enum
        items: [{ saleItemId, quantity: 1 }],
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — empty items array', async () => {
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        saleId,
        type: 'return',
        items: [],
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — missing items field', async () => {
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        saleId,
        type: 'return',
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — quantity of 0 is rejected', async () => {
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        saleId,
        type: 'return',
        items: [{ saleItemId, quantity: 0 }],
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — negative quantity is rejected', async () => {
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        saleId,
        type: 'return',
        items: [{ saleItemId, quantity: -1 }],
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — non-integer saleId is rejected', async () => {
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        saleId: 'abc',
        type: 'return',
        items: [{ saleItemId, quantity: 1 }],
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — empty request body is rejected', async () => {
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/returns
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/returns', () => {
  it('200 — owner receives list of returns', async () => {
    const res = await request(app)
      .get('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('200 — manager can list returns', async () => {
    const res = await request(app)
      .get('/api/returns')
      .set('Authorization', `Bearer ${managerToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('200 — return records have correct shape', async () => {
    // Ensure at least one return exists
    const { saleId: sid, saleItemId: siid } = await createSale(ownerToken, 1)
    await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        saleId: sid,
        type: 'return',
        items: [{ saleItemId: siid, quantity: 1 }],
      })

    const res = await request(app)
      .get('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)

    const record = res.body[0]
    expect(record).toHaveProperty('id')
    expect(record).toHaveProperty('storeId')
    expect(record).toHaveProperty('saleId')
    expect(record).toHaveProperty('staffId')
    expect(record).toHaveProperty('type')
    expect(record).toHaveProperty('createdAt')
    expect(typeof record.id).toBe('number')
    expect(typeof record.storeId).toBe('number')
    expect(typeof record.saleId).toBe('number')
    expect(typeof record.staffId).toBe('number')
    expect(['return', 'exchange']).toContain(record.type)
    expect(typeof record.createdAt).toBe('string')
  })

  it('200 — records belong only to the authenticated store', async () => {
    const res = await request(app)
      .get('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    for (const record of res.body as Array<{ storeId: number }>) {
      expect(record.storeId).toBe(seeds.storeId)
    }
  })

  it('200 — list is ordered newest first (most recent return is first)', async () => {
    // Create two returns in sequence
    const { saleId: sid1, saleItemId: siid1 } = await createSale(ownerToken, 1)
    await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        saleId: sid1,
        type: 'return',
        items: [{ saleItemId: siid1, quantity: 1 }],
      })

    const { saleId: sid2, saleItemId: siid2 } = await createSale(ownerToken, 1)
    const secondReturnRes = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        saleId: sid2,
        type: 'return',
        items: [{ saleItemId: siid2, quantity: 1 }],
      })
    const secondReturnId: number = secondReturnRes.body.id

    const listRes = await request(app)
      .get('/api/returns')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(listRes.status).toBe(200)
    expect(listRes.body.length).toBeGreaterThan(0)
    // The most recently created return should appear first
    expect(listRes.body[0].id).toBe(secondReturnId)
  })

  it('403 — staff cannot list returns', async () => {
    const res = await request(app)
      .get('/api/returns')
      .set('Authorization', `Bearer ${staffToken}`)

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('error')
  })

  it('401 — no token is rejected', async () => {
    const res = await request(app).get('/api/returns')

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('401 — malformed token is rejected', async () => {
    const res = await request(app)
      .get('/api/returns')
      .set('Authorization', 'Bearer x.y.z')

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('401 — missing Bearer prefix is rejected', async () => {
    const res = await request(app)
      .get('/api/returns')
      .set('Authorization', ownerToken) // raw token without "Bearer " prefix

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })
})
