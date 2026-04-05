import request from 'supertest'
import app from '../app'
import { resetDb, seedBase, pool, BaseSeeds } from './helpers/db'
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

// ── GET /api/dashboard/summary ────────────────────────────────────────────────

describe('GET /api/dashboard/summary', () => {
  it('returns 200 with KPI fields for owner', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      totalRevenue: expect.any(Number),
      unitsSold: expect.any(Number),
      agingBatchCount: expect.any(Number),
      activeVendors: expect.any(Number),
    })
    // topBand is null when no sales exist, otherwise an object
    expect(
      res.body.topBand === null ||
        (typeof res.body.topBand === 'object' &&
          typeof res.body.topBand.priceBandId === 'number'),
    ).toBe(true)
  })

  it('returns 200 with KPI fields for manager', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${managerToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('totalRevenue')
    expect(res.body).toHaveProperty('unitsSold')
    expect(res.body).toHaveProperty('agingBatchCount')
    expect(res.body).toHaveProperty('activeVendors')
  })

  it('counts seeded vendor in activeVendors', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    // seedBase inserts one active vendor
    expect(res.body.activeVendors).toBeGreaterThanOrEqual(1)
  })

  it('returns 403 for staff', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${staffToken}`)

    expect(res.status).toBe(403)
  })

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/dashboard/summary')

    expect(res.status).toBe(401)
  })

  it('returns 401 with malformed token', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', 'Bearer not-a-real-token')

    expect(res.status).toBe(401)
  })
})

// ── GET /api/dashboard/daily-summary ─────────────────────────────────────────

describe('GET /api/dashboard/daily-summary', () => {
  it('returns 200 with an array (default / no range param)', async () => {
    const res = await request(app)
      .get('/api/dashboard/daily-summary')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns 200 with an array for ?range=weekly', async () => {
    const res = await request(app)
      .get('/api/dashboard/daily-summary?range=weekly')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns 200 with an array for ?range=monthly', async () => {
    const res = await request(app)
      .get('/api/dashboard/daily-summary?range=monthly')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('each row has expected shape when rows are present', async () => {
    // Insert a daily_sales_summary row so we can validate the shape
    await pool.query(
      `INSERT INTO daily_sales_summary
         (store_id, date, price_band_id, category_name, band_price,
          total_qty_sold, total_revenue, total_returns, total_refunds)
       VALUES ($1, CURRENT_DATE, $2, 'Shirts', 299, 5, 1495, 0, 0)
       ON CONFLICT DO NOTHING`,
      [seeds.storeId, seeds.priceBandId],
    )

    const res = await request(app)
      .get('/api/dashboard/daily-summary?range=weekly')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    if (res.body.length > 0) {
      const row = res.body[0]
      expect(row).toHaveProperty('id')
      expect(row).toHaveProperty('storeId')
      expect(row).toHaveProperty('date')
      expect(row).toHaveProperty('priceBandId')
      expect(row).toHaveProperty('categoryName')
      expect(row).toHaveProperty('bandPrice')
      expect(row).toHaveProperty('totalQtySold')
      expect(row).toHaveProperty('totalRevenue')
      expect(row).toHaveProperty('totalReturns')
      expect(row).toHaveProperty('totalRefunds')
      // date is formatted as YYYY-MM-DD string
      expect(typeof row.date).toBe('string')
      expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('returns 200 with an array for manager', async () => {
    const res = await request(app)
      .get('/api/dashboard/daily-summary')
      .set('Authorization', `Bearer ${managerToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns 400 for invalid range value', async () => {
    const res = await request(app)
      .get('/api/dashboard/daily-summary?range=hourly')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 for another invalid range value', async () => {
    const res = await request(app)
      .get('/api/dashboard/daily-summary?range=yearly')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(400)
  })

  it('returns 403 for staff', async () => {
    const res = await request(app)
      .get('/api/dashboard/daily-summary')
      .set('Authorization', `Bearer ${staffToken}`)

    expect(res.status).toBe(403)
  })

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/dashboard/daily-summary')

    expect(res.status).toBe(401)
  })
})
