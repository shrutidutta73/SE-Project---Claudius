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
  ;[ownerToken, managerToken, staffToken] = await Promise.all([
    getOwnerToken(),
    getManagerToken(),
    getStaffToken(),
  ])
})

afterAll(async () => {
  await pool.end()
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sales
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/sales', () => {
  // ── Auth ────────────────────────────────────────────────────────────────────

  it('401 — no token returns 401', async () => {
    const res = await request(app)
      .post('/api/sales')
      .send({
        items: [
          {
            priceBandId: 1,
            categoryName: 'Shirts',
            price: 299,
            quantity: 1,
            subtotal: 299,
          },
        ],
        paymentMethod: 'cash',
      })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  // ── Validation errors ────────────────────────────────────────────────────────

  it('400 — missing items array', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ paymentMethod: 'cash' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — empty items array', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ items: [], paymentMethod: 'cash' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — missing paymentMethod', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        items: [
          {
            priceBandId: seeds.priceBandId,
            categoryName: 'Shirts',
            price: 299,
            quantity: 1,
            subtotal: 299,
          },
        ],
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — invalid paymentMethod value', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        items: [
          {
            priceBandId: seeds.priceBandId,
            categoryName: 'Shirts',
            price: 299,
            quantity: 1,
            subtotal: 299,
          },
        ],
        paymentMethod: 'bitcoin',
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — item missing categoryName', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        items: [
          {
            priceBandId: seeds.priceBandId,
            price: 299,
            quantity: 1,
            subtotal: 299,
          },
        ],
        paymentMethod: 'cash',
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — item quantity less than 1', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        items: [
          {
            priceBandId: seeds.priceBandId,
            categoryName: 'Shirts',
            price: 299,
            quantity: 0,
            subtotal: 0,
          },
        ],
        paymentMethod: 'cash',
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — item price not positive', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        items: [
          {
            priceBandId: seeds.priceBandId,
            categoryName: 'Shirts',
            price: -10,
            quantity: 1,
            subtotal: -10,
          },
        ],
        paymentMethod: 'cash',
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — invalid customerPhone (non-10-digit)', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        items: [
          {
            priceBandId: 0,
            categoryName: 'Custom Item',
            price: 50,
            quantity: 1,
            subtotal: 50,
          },
        ],
        paymentMethod: 'cash',
        customerPhone: '12345',
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  // ── Successful sale — standard FIFO item ────────────────────────────────────

  it('201 — staff can create a sale; response includes id and createdAt', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        items: [
          {
            priceBandId: seeds.priceBandId,
            categoryName: 'Shirts',
            price: 299,
            quantity: 2,
            subtotal: 598,
          },
        ],
        paymentMethod: 'cash',
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(typeof res.body.id).toBe('number')
    expect(res.body).toHaveProperty('createdAt')
    expect(typeof res.body.createdAt).toBe('string')
  })

  it('201 — owner can create a sale with upi payment method', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        items: [
          {
            priceBandId: seeds.priceBandId,
            categoryName: 'Shirts',
            price: 299,
            quantity: 1,
            subtotal: 299,
          },
        ],
        paymentMethod: 'upi',
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
  })

  it('201 — manager can create a sale with store_credit payment method', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        items: [
          {
            priceBandId: seeds.priceBandId,
            categoryName: 'Shirts',
            price: 299,
            quantity: 1,
            subtotal: 299,
          },
        ],
        paymentMethod: 'store_credit',
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
  })

  // ── FIFO batch deduction across multiple batches ─────────────────────────────

  it('201 — FIFO: deducts from the oldest batch first, then spills into the newer batch', async () => {
    // Insert two additional batches for a fresh price band so this test is
    // independent of the running batch stock from seedBase.
    const catRes = await pool.query(
      `INSERT INTO categories (store_id, name) VALUES ($1, 'Trousers') RETURNING id`,
      [seeds.storeId],
    )
    const categoryId: number = catRes.rows[0].id

    const bandRes = await pool.query(
      `INSERT INTO price_bands (store_id, category_id, price, is_active)
       VALUES ($1, $2, 499, TRUE) RETURNING id`,
      [seeds.storeId, categoryId],
    )
    const priceBandId: number = bandRes.rows[0].id

    // Batch A — older, 3 units
    const batchARes = await pool.query(
      `INSERT INTO inventory_batches
         (store_id, price_band_id, vendor_id, quantity_added, quantity_remaining, cost_price, added_by)
       VALUES ($1, $2, $3, 3, 3, 300, $4)
       RETURNING id`,
      [seeds.storeId, priceBandId, seeds.vendorId, seeds.ownerId],
    )
    const batchAId: number = batchARes.rows[0].id

    // Batch B — newer, 5 units (simulate "newer" by inserted after A)
    const batchBRes = await pool.query(
      `INSERT INTO inventory_batches
         (store_id, price_band_id, vendor_id, quantity_added, quantity_remaining, cost_price, added_by)
       VALUES ($1, $2, $3, 5, 5, 300, $4)
       RETURNING id`,
      [seeds.storeId, priceBandId, seeds.vendorId, seeds.ownerId],
    )
    const batchBId: number = batchBRes.rows[0].id

    // Sell 5 units — should take all 3 from batchA, then 2 from batchB
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        items: [
          {
            priceBandId,
            categoryName: 'Trousers',
            price: 499,
            quantity: 5,
            subtotal: 2495,
          },
        ],
        paymentMethod: 'cash',
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')

    // Verify batch A fully depleted
    const batchARow = await pool.query(
      'SELECT quantity_remaining FROM inventory_batches WHERE id = $1',
      [batchAId],
    )
    expect(Number(batchARow.rows[0].quantity_remaining)).toBe(0)

    // Verify batch B reduced by 2
    const batchBRow = await pool.query(
      'SELECT quantity_remaining FROM inventory_batches WHERE id = $1',
      [batchBId],
    )
    expect(Number(batchBRow.rows[0].quantity_remaining)).toBe(3)
  })

  // ── Insufficient stock ───────────────────────────────────────────────────────

  it('400 — insufficient stock returns error with item name', async () => {
    // The seedBase batch starts at 20 units; previous tests consumed some,
    // but to make this deterministic we request far more than any batch holds.
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        items: [
          {
            priceBandId: seeds.priceBandId,
            categoryName: 'Shirts',
            price: 299,
            quantity: 9999,
            subtotal: 2990701,
          },
        ],
        paymentMethod: 'cash',
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toMatch(/insufficient stock/i)
  })

  it('400 — priceBandId that does not exist has zero batches (insufficient stock)', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        items: [
          {
            priceBandId: 99999,
            categoryName: 'Ghost Item',
            price: 100,
            quantity: 1,
            subtotal: 100,
          },
        ],
        paymentMethod: 'cash',
      })

    // No batches for a nonexistent band → insufficient stock → 400
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  // ── Custom item (priceBandId = 0) ────────────────────────────────────────────

  it('201 — custom item (priceBandId: 0) is accepted without any stock deduction', async () => {
    // Snapshot all batch quantities before
    const beforeRes = await pool.query<{ id: number; quantity_remaining: string }>(
      'SELECT id, quantity_remaining FROM inventory_batches WHERE store_id = $1',
      [seeds.storeId],
    )
    const before = new Map<number, number>(
      beforeRes.rows.map((r: { id: number; quantity_remaining: string }) => [
        r.id,
        Number(r.quantity_remaining),
      ]),
    )

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        items: [
          {
            priceBandId: 0,
            categoryName: 'Custom Alteration',
            price: 150,
            quantity: 3,
            subtotal: 450,
          },
        ],
        paymentMethod: 'upi',
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')

    // Verify no batch quantities changed
    const afterRes = await pool.query(
      'SELECT id, quantity_remaining FROM inventory_batches WHERE store_id = $1',
      [seeds.storeId],
    )
    for (const row of afterRes.rows) {
      expect(Number(row.quantity_remaining)).toBe(before.get(row.id as number))
    }
  })

  it('201 — custom item mixed with a normal item processes correctly', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        items: [
          {
            priceBandId: seeds.priceBandId,
            categoryName: 'Shirts',
            price: 299,
            quantity: 1,
            subtotal: 299,
          },
          {
            priceBandId: 0,
            categoryName: 'Stitching Charge',
            price: 100,
            quantity: 1,
            subtotal: 100,
          },
        ],
        paymentMethod: 'cash',
        discountAmount: 50,
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
  })

  // ── Customer upsert ──────────────────────────────────────────────────────────

  it('201 — new customer created when phone not previously seen', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        items: [
          {
            priceBandId: 0,
            categoryName: 'Custom Item',
            price: 200,
            quantity: 1,
            subtotal: 200,
          },
        ],
        paymentMethod: 'cash',
        customerName: 'Rahul Singh',
        customerPhone: '9123456780',
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')

    const customerRow = await pool.query(
      'SELECT name, phone FROM customers WHERE store_id = $1 AND phone = $2',
      [seeds.storeId, '9123456780'],
    )
    expect(customerRow.rowCount).toBe(1)
    expect(customerRow.rows[0].name).toBe('Rahul Singh')
  })

  it('201 — existing customer name is updated on second sale with same phone', async () => {
    const phone = '9123456781'

    // First sale — creates customer as "Old Name"
    await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        items: [{ priceBandId: 0, categoryName: 'Custom', price: 50, quantity: 1, subtotal: 50 }],
        paymentMethod: 'cash',
        customerName: 'Old Name',
        customerPhone: phone,
      })

    // Second sale — updates customer name to "New Name"
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        items: [{ priceBandId: 0, categoryName: 'Custom', price: 75, quantity: 1, subtotal: 75 }],
        paymentMethod: 'upi',
        customerName: 'New Name',
        customerPhone: phone,
      })

    expect(res.status).toBe(201)

    const customerRow = await pool.query(
      'SELECT name FROM customers WHERE store_id = $1 AND phone = $2',
      [seeds.storeId, phone],
    )
    expect(customerRow.rowCount).toBe(1)
    expect(customerRow.rows[0].name).toBe('New Name')
  })

  it('201 — sale without customerPhone creates no customer record', async () => {
    const countBefore = (
      await pool.query('SELECT COUNT(*) FROM customers WHERE store_id = $1', [seeds.storeId])
    ).rows[0].count as string

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        items: [{ priceBandId: 0, categoryName: 'Walk-in', price: 100, quantity: 1, subtotal: 100 }],
        paymentMethod: 'cash',
      })

    expect(res.status).toBe(201)

    const countAfter = (
      await pool.query('SELECT COUNT(*) FROM customers WHERE store_id = $1', [seeds.storeId])
    ).rows[0].count as string

    expect(parseInt(countAfter)).toBe(parseInt(countBefore))
  })

  // ── discountAmount ────────────────────────────────────────────────────────────

  it('201 — discountAmount is optional and defaults to 0', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        items: [
          {
            priceBandId: 0,
            categoryName: 'Hat',
            price: 199,
            quantity: 1,
            subtotal: 199,
          },
        ],
        paymentMethod: 'cash',
        // discountAmount omitted intentionally
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
  })

  it('400 — negative discountAmount is rejected', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        items: [{ priceBandId: 0, categoryName: 'Hat', price: 199, quantity: 1, subtotal: 199 }],
        paymentMethod: 'cash',
        discountAmount: -10,
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })
})
