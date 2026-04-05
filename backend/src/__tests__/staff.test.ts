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

// ── GET /api/staff/leaderboard ────────────────────────────────────────────────

describe('GET /api/staff/leaderboard', () => {
  it('returns 200 with an array for owner', async () => {
    const res = await request(app)
      .get('/api/staff/leaderboard')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('includes the seeded users in the leaderboard', async () => {
    const res = await request(app)
      .get('/api/staff/leaderboard')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    // seedBase creates owner + manager + staff = at least 3 active users
    expect(res.body.length).toBeGreaterThanOrEqual(3)
  })

  it('each entry has the expected shape with sales stats', async () => {
    const res = await request(app)
      .get('/api/staff/leaderboard')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)

    const entry = res.body[0]
    expect(entry).toHaveProperty('userId')
    expect(entry).toHaveProperty('name')
    expect(entry).toHaveProperty('role')
    expect(entry).toHaveProperty('isActive')
    expect(entry).toHaveProperty('clockedIn')
    expect(entry).toHaveProperty('checkInAt')
    expect(entry).toHaveProperty('revenueToday')
    expect(entry).toHaveProperty('salesCountToday')
    expect(typeof entry.userId).toBe('number')
    expect(typeof entry.name).toBe('string')
    expect(typeof entry.revenueToday).toBe('number')
    expect(typeof entry.salesCountToday).toBe('number')
    expect(typeof entry.isActive).toBe('boolean')
    expect(typeof entry.clockedIn).toBe('boolean')
  })

  it('only includes active users belonging to the store', async () => {
    const res = await request(app)
      .get('/api/staff/leaderboard')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    for (const entry of res.body) {
      expect(entry.isActive).toBe(true)
    }
  })

  it('returns 200 with an array for manager', async () => {
    const res = await request(app)
      .get('/api/staff/leaderboard')
      .set('Authorization', `Bearer ${managerToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns 200 for staff (leaderboard is accessible to all authenticated users)', async () => {
    const res = await request(app)
      .get('/api/staff/leaderboard')
      .set('Authorization', `Bearer ${staffToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/staff/leaderboard')

    expect(res.status).toBe(401)
  })

  it('returns 401 with an invalid token', async () => {
    const res = await request(app)
      .get('/api/staff/leaderboard')
      .set('Authorization', 'Bearer invalidtoken')

    expect(res.status).toBe(401)
  })

  it('returns 401 with Bearer prefix but empty token', async () => {
    const res = await request(app)
      .get('/api/staff/leaderboard')
      .set('Authorization', 'Bearer ')

    expect(res.status).toBe(401)
  })

  it('entries are sorted by revenueToday descending', async () => {
    const res = await request(app)
      .get('/api/staff/leaderboard')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    const revenues: number[] = res.body.map((e: { revenueToday: number }) => e.revenueToday)
    for (let i = 0; i < revenues.length - 1; i++) {
      expect(revenues[i]).toBeGreaterThanOrEqual(revenues[i + 1])
    }
  })

  it('salesCountToday defaults to 0 when no sales recorded today', async () => {
    const res = await request(app)
      .get('/api/staff/leaderboard')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    // No sales seeded, so every member should have 0 today
    for (const entry of res.body) {
      expect(entry.salesCountToday).toBe(0)
      expect(entry.revenueToday).toBe(0)
    }
  })

  it('checkInAt is null or an ISO string', async () => {
    const res = await request(app)
      .get('/api/staff/leaderboard')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    for (const entry of res.body) {
      expect(
        entry.checkInAt === null || typeof entry.checkInAt === 'string',
      ).toBe(true)
    }
  })
})
