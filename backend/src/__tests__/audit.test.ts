import request from 'supertest'
import app from '../app'
import { resetDb, seedBase, pool } from './helpers/db'
import { getOwnerToken, getManagerToken, getStaffToken } from './helpers/auth'
import type { BaseSeeds } from './helpers/db'

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
// GET /api/audit/log
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/audit/log', () => {
  it('200 — owner receives audit log array', async () => {
    const res = await request(app)
      .get('/api/audit/log')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('200 — empty log has correct shape (no entries yet)', async () => {
    const res = await request(app)
      .get('/api/audit/log')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    // Fresh DB has no audit log entries
    expect(res.body).toHaveLength(0)
  })

  it('200 — log entries have expected fields after a wipe', async () => {
    // Create an audit entry by performing a wipe first
    await request(app)
      .post('/api/audit/wipe')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ password: 'Test@1234' })

    const res = await request(app)
      .get('/api/audit/log')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)

    const entry = res.body[0]
    expect(entry).toHaveProperty('id')
    expect(entry).toHaveProperty('timestamp')
    expect(entry).toHaveProperty('type')
    expect(entry).toHaveProperty('recordsPruned')
    expect(typeof entry.id).toBe('number')
    expect(typeof entry.timestamp).toBe('string')
    expect(['auto', 'manual']).toContain(entry.type)
    expect(typeof entry.recordsPruned).toBe('number')
  })

  it('401 — rejects request with no token', async () => {
    const res = await request(app).get('/api/audit/log')

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('401 — rejects request with malformed token', async () => {
    const res = await request(app)
      .get('/api/audit/log')
      .set('Authorization', 'Bearer not.a.valid.jwt')

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('401 — rejects request with Bearer prefix but empty token', async () => {
    const res = await request(app)
      .get('/api/audit/log')
      .set('Authorization', 'Bearer ')

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('403 — manager is forbidden from viewing audit log', async () => {
    const res = await request(app)
      .get('/api/audit/log')
      .set('Authorization', `Bearer ${managerToken}`)

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('error')
  })

  it('403 — staff is forbidden from viewing audit log', async () => {
    const res = await request(app)
      .get('/api/audit/log')
      .set('Authorization', `Bearer ${staffToken}`)

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('error')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/audit/wipe
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/audit/wipe', () => {
  it('200 — owner with correct password gets back a log entry', async () => {
    const res = await request(app)
      .post('/api/audit/wipe')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ password: 'Test@1234' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('id')
    expect(res.body).toHaveProperty('timestamp')
    expect(res.body).toHaveProperty('type', 'manual')
    expect(res.body).toHaveProperty('recordsPruned')
    expect(typeof res.body.id).toBe('number')
    expect(typeof res.body.recordsPruned).toBe('number')
    // recordsPruned should be 0 when there are no ephemeral/expired sales
    expect(res.body.recordsPruned).toBeGreaterThanOrEqual(0)
  })

  it('200 — wipe appears in audit log afterwards', async () => {
    // Perform a wipe
    const wipeRes = await request(app)
      .post('/api/audit/wipe')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ password: 'Test@1234' })
    expect(wipeRes.status).toBe(200)

    const wipeId = wipeRes.body.id

    // Confirm the new entry appears in the log
    const logRes = await request(app)
      .get('/api/audit/log')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(logRes.status).toBe(200)
    const ids = (logRes.body as Array<{ id: number }>).map((e) => e.id)
    expect(ids).toContain(wipeId)
  })

  it('200 — wipe with no ephemeral sales reports recordsPruned = 0', async () => {
    const res = await request(app)
      .post('/api/audit/wipe')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ password: 'Test@1234' })

    expect(res.status).toBe(200)
    expect(res.body.recordsPruned).toBe(0)
  })

  it('200 — wipe prunes ephemeral sales and increments recordsPruned', async () => {
    // Insert an ephemeral sale directly into the DB
    await pool.query(
      `INSERT INTO sales (store_id, staff_id, total_amount, discount_amount, payment_method, is_ephemeral, expires_at)
       VALUES ($1, $2, 299, 0, 'cash', TRUE, NOW() - INTERVAL '1 day')`,
      [seeds.storeId, seeds.staffId],
    )

    const res = await request(app)
      .post('/api/audit/wipe')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ password: 'Test@1234' })

    expect(res.status).toBe(200)
    expect(res.body.recordsPruned).toBeGreaterThanOrEqual(1)

    // Confirm ephemeral sale is gone
    const check = await pool.query(
      `SELECT COUNT(*) AS count FROM sales WHERE store_id = $1 AND is_ephemeral = TRUE`,
      [seeds.storeId],
    )
    expect(parseInt(check.rows[0].count, 10)).toBe(0)
  })

  it('401 — wrong password is rejected', async () => {
    const res = await request(app)
      .post('/api/audit/wipe')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ password: 'WrongPassword!' })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — missing password field', async () => {
    const res = await request(app)
      .post('/api/audit/wipe')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — empty string password', async () => {
    const res = await request(app)
      .post('/api/audit/wipe')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ password: '' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('401 — request with no token is rejected', async () => {
    const res = await request(app)
      .post('/api/audit/wipe')
      .send({ password: 'Test@1234' })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('401 — request with invalid token is rejected', async () => {
    const res = await request(app)
      .post('/api/audit/wipe')
      .set('Authorization', 'Bearer totally.invalid.token')
      .send({ password: 'Test@1234' })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('403 — manager cannot trigger wipe', async () => {
    const res = await request(app)
      .post('/api/audit/wipe')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ password: 'Manager@1234' })

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('error')
  })

  it('403 — staff cannot trigger wipe', async () => {
    const res = await request(app)
      .post('/api/audit/wipe')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ password: '1111' })

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('error')
  })
})
