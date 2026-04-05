import request from 'supertest'
import app from '../app'
import { resetDb, seedBase, pool } from './helpers/db'
import type { BaseSeeds } from './helpers/db'
import { getOwnerToken, getManagerToken, getStaffToken } from './helpers/auth'

let seeds: BaseSeeds
let ownerToken: string
let managerToken: string
let staffToken: string

// GPS constants matching the seeded store (lat: 26.4499, lng: 80.3319, radius: 200 m)
// Coords exactly on the store location — always within radius
const INSIDE_LAT = 26.4499
const INSIDE_LNG = 80.3319

// Coords far away — Mumbai; well outside 200 m of Kanpur
const OUTSIDE_LAT = 19.076
const OUTSIDE_LNG = 72.8777

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
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Remove today's attendance row for the given userId so tests are repeatable. */
async function clearAttendance(userId: number): Promise<void> {
  await pool.query(
    `DELETE FROM attendance WHERE user_id = $1 AND date = CURRENT_DATE`,
    [userId],
  )
}

/** Enable GPS clock-in enforcement on the store. */
async function requireGpsOnClockIn(storeId: number, _userId: number): Promise<void> {
  await pool.query(
    `UPDATE stores SET gps_require_clock_in = TRUE WHERE id = $1`,
    [storeId],
  )
}

/** Disable GPS enforcement on the store. */
async function removeGpsPolicy(storeId: number, _userId: number): Promise<void> {
  await pool.query(
    `UPDATE stores SET gps_require_clock_in = FALSE, gps_require_clock_out = FALSE WHERE id = $1`,
    [storeId],
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/attendance/clock-in
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/attendance/clock-in', () => {
  beforeEach(async () => {
    await clearAttendance(seeds.staffId)
    await removeGpsPolicy(seeds.storeId, seeds.staffId)
  })

  it('401 — no token returns 401', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .send({ lat: INSIDE_LAT, lng: INSIDE_LNG })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — missing lat/lng fields returns validation error', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({})

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — lat provided but lng missing returns validation error', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ lat: INSIDE_LAT })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('200 — successful clock-in returns clockedIn: true and checkInAt', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ lat: INSIDE_LAT, lng: INSIDE_LNG })

    expect(res.status).toBe(200)
    expect(res.body.clockedIn).toBe(true)
    expect(res.body).toHaveProperty('checkInAt')
    expect(typeof res.body.checkInAt).toBe('string')
    // checkInAt should be a valid ISO date string
    expect(new Date(res.body.checkInAt).getTime()).not.toBeNaN()
  })

  it('400 — duplicate clock-in on same day returns error', async () => {
    // First clock-in
    await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ lat: INSIDE_LAT, lng: INSIDE_LNG })

    // Second clock-in same day
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ lat: INSIDE_LAT, lng: INSIDE_LNG })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toMatch(/already clocked in/i)
  })

  it('owner can clock in (GPS not required)', async () => {
    await clearAttendance(seeds.ownerId)
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ lat: INSIDE_LAT, lng: INSIDE_LNG })

    expect(res.status).toBe(200)
    expect(res.body.clockedIn).toBe(true)
    await clearAttendance(seeds.ownerId)
  })

  // ── GPS policy: require_on_clock_in = true ───────────────────────────────────

  it('200 — GPS required + valid coords within radius: clock-in succeeds', async () => {
    await requireGpsOnClockIn(seeds.storeId, seeds.staffId)

    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ lat: INSIDE_LAT, lng: INSIDE_LNG })

    expect(res.status).toBe(200)
    expect(res.body.clockedIn).toBe(true)
  })

  it('400 — GPS required + coords outside radius: clock-in rejected', async () => {
    await requireGpsOnClockIn(seeds.storeId, seeds.staffId)

    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ lat: OUTSIDE_LAT, lng: OUTSIDE_LNG })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toMatch(/outside store gps radius/i)
  })

  it('200 — GPS not required: coords outside radius are still accepted', async () => {
    // No GPS policy row → GPS not enforced
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ lat: OUTSIDE_LAT, lng: OUTSIDE_LNG })

    // GPS not required so location doesn't matter
    expect(res.status).toBe(200)
    expect(res.body.clockedIn).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/attendance/clock-out
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/attendance/clock-out', () => {
  beforeEach(async () => {
    await clearAttendance(seeds.staffId)
    await removeGpsPolicy(seeds.storeId, seeds.staffId)
  })

  it('401 — no token returns 401', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-out')
      .send({ lat: INSIDE_LAT, lng: INSIDE_LNG })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — missing lat/lng fields returns validation error', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-out')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({})

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — clock-out without prior clock-in returns error', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-out')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ lat: INSIDE_LAT, lng: INSIDE_LNG })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toMatch(/not clocked in/i)
  })

  it('200 — successful clock-out after clock-in returns clockedIn: false and checkOutAt', async () => {
    // Clock in first
    await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ lat: INSIDE_LAT, lng: INSIDE_LNG })

    // Now clock out
    const res = await request(app)
      .post('/api/attendance/clock-out')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ lat: INSIDE_LAT, lng: INSIDE_LNG })

    expect(res.status).toBe(200)
    expect(res.body.clockedIn).toBe(false)
    expect(res.body).toHaveProperty('checkOutAt')
    expect(typeof res.body.checkOutAt).toBe('string')
    expect(new Date(res.body.checkOutAt).getTime()).not.toBeNaN()
  })

  it('400 — second clock-out after already clocked out returns error', async () => {
    // Clock in then out
    await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ lat: INSIDE_LAT, lng: INSIDE_LNG })

    await request(app)
      .post('/api/attendance/clock-out')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ lat: INSIDE_LAT, lng: INSIDE_LNG })

    // Attempt second clock-out
    const res = await request(app)
      .post('/api/attendance/clock-out')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ lat: INSIDE_LAT, lng: INSIDE_LNG })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toMatch(/not clocked in/i)
  })

  it('200 — GPS not required: clock-out with remote coords succeeds', async () => {
    // Clock in first
    await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ lat: INSIDE_LAT, lng: INSIDE_LNG })

    // Clock out with far-away coords — should still succeed (no GPS requirement)
    const res = await request(app)
      .post('/api/attendance/clock-out')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ lat: OUTSIDE_LAT, lng: OUTSIDE_LNG })

    expect(res.status).toBe(200)
    expect(res.body.clockedIn).toBe(false)
  })

  it('attendance row records check_in_lat and check_out_lat in database', async () => {
    // Clock in
    await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ lat: INSIDE_LAT, lng: INSIDE_LNG })

    // Clock out
    await request(app)
      .post('/api/attendance/clock-out')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ lat: INSIDE_LAT, lng: INSIDE_LNG })

    const row = await pool.query(
      `SELECT check_in_lat, check_in_lng, check_out_lat, check_out_lng
       FROM attendance
       WHERE user_id = $1 AND date = CURRENT_DATE`,
      [seeds.staffId],
    )

    expect(row.rowCount).toBe(1)
    expect(parseFloat(row.rows[0].check_in_lat)).toBeCloseTo(INSIDE_LAT, 3)
    expect(parseFloat(row.rows[0].check_in_lng)).toBeCloseTo(INSIDE_LNG, 3)
    expect(parseFloat(row.rows[0].check_out_lat)).toBeCloseTo(INSIDE_LAT, 3)
    expect(parseFloat(row.rows[0].check_out_lng)).toBeCloseTo(INSIDE_LNG, 3)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/attendance/today
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/attendance/today', () => {
  beforeAll(async () => {
    // Ensure staff has a fresh clock-in for today to appear in the roster
    await clearAttendance(seeds.staffId)
    await removeGpsPolicy(seeds.storeId, seeds.staffId)
    await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ lat: INSIDE_LAT, lng: INSIDE_LNG })
  })

  afterAll(async () => {
    await clearAttendance(seeds.staffId)
  })

  it('401 — no token returns 401', async () => {
    const res = await request(app).get('/api/attendance/today')

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('403 — staff token returns 403 (staff cannot view roster)', async () => {
    const res = await request(app)
      .get('/api/attendance/today')
      .set('Authorization', `Bearer ${staffToken}`)

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('error')
  })

  it('200 — owner can get today roster', async () => {
    const res = await request(app)
      .get('/api/attendance/today')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('200 — manager can get today roster', async () => {
    const res = await request(app)
      .get('/api/attendance/today')
      .set('Authorization', `Bearer ${managerToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('200 — roster contains only active staff members', async () => {
    const res = await request(app)
      .get('/api/attendance/today')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    // Every entry must be a staff member
    for (const entry of res.body) {
      expect(entry.role).toBe('staff')
      expect(entry.isActive).toBe(true)
    }
  })

  it('200 — clocked-in staff member appears with clockedIn: true and a checkInAt', async () => {
    const res = await request(app)
      .get('/api/attendance/today')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    const staffEntry = res.body.find((e: { userId: number }) => e.userId === seeds.staffId)
    expect(staffEntry).toBeDefined()
    expect(staffEntry.clockedIn).toBe(true)
    expect(staffEntry.checkInAt).not.toBeNull()
    expect(typeof staffEntry.checkInAt).toBe('string')
    expect(staffEntry.checkOutAt).toBeNull()
  })

  it('200 — roster entry has expected shape', async () => {
    const res = await request(app)
      .get('/api/attendance/today')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
    const entry = res.body[0]
    expect(entry).toHaveProperty('userId')
    expect(entry).toHaveProperty('name')
    expect(entry).toHaveProperty('role')
    expect(entry).toHaveProperty('isActive')
    expect(entry).toHaveProperty('clockedIn')
    expect(entry).toHaveProperty('checkInAt')
    expect(entry).toHaveProperty('checkOutAt')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/attendance/force-clockout/:userId
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/attendance/force-clockout/:userId', () => {
  beforeEach(async () => {
    // Ensure staff is clocked in so force-clockout has something to act on
    await clearAttendance(seeds.staffId)
    await removeGpsPolicy(seeds.storeId, seeds.staffId)
    await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ lat: INSIDE_LAT, lng: INSIDE_LNG })
  })

  afterEach(async () => {
    await clearAttendance(seeds.staffId)
  })

  it('401 — no token returns 401', async () => {
    const res = await request(app)
      .patch(`/api/attendance/force-clockout/${seeds.staffId}`)

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('403 — staff token cannot force-clockout another user', async () => {
    const res = await request(app)
      .patch(`/api/attendance/force-clockout/${seeds.staffId}`)
      .set('Authorization', `Bearer ${staffToken}`)

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('error')
  })

  it('200 — owner can force-clockout a staff member', async () => {
    const res = await request(app)
      .patch(`/api/attendance/force-clockout/${seeds.staffId}`)
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('200 — manager can force-clockout a staff member', async () => {
    const res = await request(app)
      .patch(`/api/attendance/force-clockout/${seeds.staffId}`)
      .set('Authorization', `Bearer ${managerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('200 — after force-clockout the attendance row has check_out_at set', async () => {
    await request(app)
      .patch(`/api/attendance/force-clockout/${seeds.staffId}`)
      .set('Authorization', `Bearer ${ownerToken}`)

    const row = await pool.query(
      `SELECT check_out_at FROM attendance
       WHERE user_id = $1 AND date = CURRENT_DATE`,
      [seeds.staffId],
    )

    expect(row.rowCount).toBe(1)
    expect(row.rows[0].check_out_at).not.toBeNull()
  })

  it('200 — force-clockout on a user not clocked in still returns success (idempotent)', async () => {
    // Force-clockout once to close the open record
    await request(app)
      .patch(`/api/attendance/force-clockout/${seeds.staffId}`)
      .set('Authorization', `Bearer ${ownerToken}`)

    // Force-clockout again — no open record, but should not error
    const res = await request(app)
      .patch(`/api/attendance/force-clockout/${seeds.staffId}`)
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('400 — non-numeric userId in path returns 400', async () => {
    const res = await request(app)
      .patch('/api/attendance/force-clockout/not-a-number')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })
})
