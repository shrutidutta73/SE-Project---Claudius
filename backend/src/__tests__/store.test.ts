import request from 'supertest'
import app from '../app'
import { resetDb, seedBase, pool } from './helpers/db'
import type { BaseSeeds } from './helpers/db'

let seeds: BaseSeeds
let ownerToken: string
let managerToken: string
let staffToken: string

beforeAll(async () => {
  await resetDb()
  seeds = await seedBase()

  const [ownerRes, managerRes, staffRes] = await Promise.all([
    request(app).post('/api/auth/login').send({ identifier: 'owner@test.com', credential: 'Test@1234' }),
    request(app).post('/api/auth/login').send({ identifier: 'manager@test.com', credential: 'Manager@1234' }),
    request(app).post('/api/auth/login').send({ identifier: '7777777777', credential: '1111' }),
  ])

  ownerToken = ownerRes.body.token
  managerToken = managerRes.body.token
  staffToken = staffRes.body.token

  if (!ownerToken) throw new Error(`Owner login failed: ${JSON.stringify(ownerRes.body)}`)
  if (!managerToken) throw new Error(`Manager login failed: ${JSON.stringify(managerRes.body)}`)
  if (!staffToken) throw new Error(`Staff login failed: ${JSON.stringify(staffRes.body)}`)
})

afterAll(async () => {
  await pool.end()
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/store
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/store', () => {
  it('200 — owner can get their store', async () => {
    const res = await request(app)
      .get('/api/store')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('id', seeds.storeId)
    expect(res.body).toHaveProperty('name', 'Test Store')
    expect(res.body).toHaveProperty('address', 'Test Address, City')
    expect(res.body).toHaveProperty('billingMode')
    expect(res.body).toHaveProperty('ownerId', seeds.ownerId)
    expect(res.body).toHaveProperty('createdAt')
    expect(res.body).toHaveProperty('updatedAt')
  })

  it('200 — manager can get the store', async () => {
    const res = await request(app)
      .get('/api/store')
      .set('Authorization', `Bearer ${managerToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('id', seeds.storeId)
    expect(res.body).toHaveProperty('name', 'Test Store')
  })

  it('200 — staff can get the store', async () => {
    const res = await request(app)
      .get('/api/store')
      .set('Authorization', `Bearer ${staffToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('id', seeds.storeId)
  })

  it('200 — store response contains expected shape', async () => {
    const res = await request(app)
      .get('/api/store')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    const store = res.body
    expect(store).toHaveProperty('id')
    expect(store).toHaveProperty('name')
    expect(store).toHaveProperty('address')
    expect(store).toHaveProperty('logo')
    expect(store).toHaveProperty('ownerId')
    expect(store).toHaveProperty('billingMode')
    expect(store).toHaveProperty('retentionDays')
    expect(store).toHaveProperty('gpsLatitude')
    expect(store).toHaveProperty('gpsLongitude')
    expect(store).toHaveProperty('gpsRadiusM')
  })

  it('401 — no token returns 401', async () => {
    const res = await request(app).get('/api/store')

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('401 — malformed Bearer token returns 401', async () => {
    const res = await request(app)
      .get('/api/store')
      .set('Authorization', 'Bearer not.a.jwt')

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('401 — Authorization header without Bearer prefix returns 401', async () => {
    const res = await request(app)
      .get('/api/store')
      .set('Authorization', ownerToken) // missing "Bearer " prefix

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/store
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/store', () => {
  it('200 — owner can update store name', async () => {
    const res = await request(app)
      .patch('/api/store')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Updated Store Name' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('name', 'Updated Store Name')
  })

  it('200 — owner can update store address', async () => {
    const res = await request(app)
      .patch('/api/store')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ address: '456 New Address, Mumbai' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('address', '456 New Address, Mumbai')
  })

  it('200 — owner can update name and address together', async () => {
    const res = await request(app)
      .patch('/api/store')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Test Store', address: 'Test Address, City' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Test Store')
    expect(res.body.address).toBe('Test Address, City')
  })

  it('200 — owner can update logo', async () => {
    const res = await request(app)
      .patch('/api/store')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ logo: 'data:image/png;base64,logodata==' })

    expect(res.status).toBe(200)
    expect(res.body.logo).toBe('data:image/png;base64,logodata==')
  })

  it('200 — empty body returns current store (no-op update)', async () => {
    const res = await request(app)
      .patch('/api/store')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('id', seeds.storeId)
  })

  it('403 — manager cannot update store', async () => {
    const res = await request(app)
      .patch('/api/store')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Manager Renamed' })

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('error')
  })

  it('403 — staff cannot update store', async () => {
    const res = await request(app)
      .patch('/api/store')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'Staff Renamed' })

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('error')
  })

  it('401 — no token returns 401', async () => {
    const res = await request(app)
      .patch('/api/store')
      .send({ name: 'No Token' })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — empty string for name fails validation', async () => {
    const res = await request(app)
      .patch('/api/store')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: '' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/store/billing-mode
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/store/billing-mode', () => {
  it('200 — owner can set billing mode to "structured"', async () => {
    const res = await request(app)
      .patch('/api/store/billing-mode')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ billingMode: 'structured' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('billingMode', 'structured')
  })

  it('200 — owner can set billing mode to "ephemeral"', async () => {
    const res = await request(app)
      .patch('/api/store/billing-mode')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ billingMode: 'ephemeral' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('billingMode', 'ephemeral')
  })

  it('200 — switching to "structured" clears retentionDays', async () => {
    // First set a retention value while in ephemeral mode
    await request(app)
      .patch('/api/store/retention')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ retentionDays: 30 })

    // Now switch to structured
    const res = await request(app)
      .patch('/api/store/billing-mode')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ billingMode: 'structured' })

    expect(res.status).toBe(200)
    expect(res.body.billingMode).toBe('structured')
    expect(res.body.retentionDays).toBeNull()
  })

  it('400 — invalid billing mode "custom" returns 400', async () => {
    const res = await request(app)
      .patch('/api/store/billing-mode')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ billingMode: 'custom' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — invalid billing mode "daily" returns 400', async () => {
    const res = await request(app)
      .patch('/api/store/billing-mode')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ billingMode: 'daily' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — missing billingMode field returns 400', async () => {
    const res = await request(app)
      .patch('/api/store/billing-mode')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('403 — manager cannot update billing mode', async () => {
    const res = await request(app)
      .patch('/api/store/billing-mode')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ billingMode: 'ephemeral' })

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('error')
  })

  it('403 — staff cannot update billing mode', async () => {
    const res = await request(app)
      .patch('/api/store/billing-mode')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ billingMode: 'ephemeral' })

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('error')
  })

  it('401 — no token returns 401', async () => {
    const res = await request(app)
      .patch('/api/store/billing-mode')
      .send({ billingMode: 'structured' })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/store/retention
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/store/retention', () => {
  beforeEach(async () => {
    // Ensure store is in ephemeral mode so retention is meaningful
    await request(app)
      .patch('/api/store/billing-mode')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ billingMode: 'ephemeral' })
  })

  it('200 — owner can set retentionDays to 7', async () => {
    const res = await request(app)
      .patch('/api/store/retention')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ retentionDays: 7 })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('retentionDays', 7)
  })

  it('200 — owner can set retentionDays to 14', async () => {
    const res = await request(app)
      .patch('/api/store/retention')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ retentionDays: 14 })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('retentionDays', 14)
  })

  it('200 — owner can set retentionDays to 30', async () => {
    const res = await request(app)
      .patch('/api/store/retention')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ retentionDays: 30 })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('retentionDays', 30)
  })

  it('200 — owner can set retentionDays to 90', async () => {
    const res = await request(app)
      .patch('/api/store/retention')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ retentionDays: 90 })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('retentionDays', 90)
  })

  it('200 — owner can set retentionDays to null', async () => {
    const res = await request(app)
      .patch('/api/store/retention')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ retentionDays: null })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('retentionDays', null)
  })

  it('400 — invalid retentionDays value 15', async () => {
    const res = await request(app)
      .patch('/api/store/retention')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ retentionDays: 15 })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — invalid retentionDays value 0', async () => {
    const res = await request(app)
      .patch('/api/store/retention')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ retentionDays: 0 })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — invalid retentionDays value 365', async () => {
    const res = await request(app)
      .patch('/api/store/retention')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ retentionDays: 365 })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — string value for retentionDays returns 400', async () => {
    const res = await request(app)
      .patch('/api/store/retention')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ retentionDays: 'thirty' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — missing retentionDays field returns 400', async () => {
    const res = await request(app)
      .patch('/api/store/retention')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('403 — manager cannot update retention', async () => {
    const res = await request(app)
      .patch('/api/store/retention')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ retentionDays: 30 })

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('error')
  })

  it('403 — staff cannot update retention', async () => {
    const res = await request(app)
      .patch('/api/store/retention')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ retentionDays: 30 })

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('error')
  })

  it('401 — no token returns 401', async () => {
    const res = await request(app)
      .patch('/api/store/retention')
      .send({ retentionDays: 30 })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/store/gps-settings
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/store/gps-settings', () => {
  const validGps = {
    gpsLatitude: 28.6139,
    gpsLongitude: 77.209,
    gpsRadiusM: 150,
  }

  it('200 — owner can update GPS settings', async () => {
    const res = await request(app)
      .patch('/api/store/gps-settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(validGps)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('gpsLatitude', validGps.gpsLatitude)
    expect(res.body).toHaveProperty('gpsLongitude', validGps.gpsLongitude)
    expect(res.body).toHaveProperty('gpsRadiusM', validGps.gpsRadiusM)
  })

  it('200 — updates are reflected when fetching store', async () => {
    const newGps = { gpsLatitude: 19.076, gpsLongitude: 72.8777, gpsRadiusM: 300 }

    await request(app)
      .patch('/api/store/gps-settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(newGps)

    const getRes = await request(app)
      .get('/api/store')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(getRes.status).toBe(200)
    expect(getRes.body.gpsLatitude).toBeCloseTo(newGps.gpsLatitude, 4)
    expect(getRes.body.gpsLongitude).toBeCloseTo(newGps.gpsLongitude, 4)
    expect(getRes.body.gpsRadiusM).toBe(newGps.gpsRadiusM)
  })

  it('200 — boundary latitude -90 is accepted', async () => {
    const res = await request(app)
      .patch('/api/store/gps-settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ gpsLatitude: -90, gpsLongitude: 0, gpsRadiusM: 100 })

    expect(res.status).toBe(200)
    expect(res.body.gpsLatitude).toBe(-90)
  })

  it('200 — boundary latitude 90 is accepted', async () => {
    const res = await request(app)
      .patch('/api/store/gps-settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ gpsLatitude: 90, gpsLongitude: 0, gpsRadiusM: 100 })

    expect(res.status).toBe(200)
    expect(res.body.gpsLatitude).toBe(90)
  })

  it('200 — boundary longitude -180/180 is accepted', async () => {
    const res = await request(app)
      .patch('/api/store/gps-settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ gpsLatitude: 0, gpsLongitude: 180, gpsRadiusM: 100 })

    expect(res.status).toBe(200)
    expect(res.body.gpsLongitude).toBe(180)
  })

  it('400 — latitude out of range (> 90)', async () => {
    const res = await request(app)
      .patch('/api/store/gps-settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ gpsLatitude: 91, gpsLongitude: 0, gpsRadiusM: 100 })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — latitude out of range (< -90)', async () => {
    const res = await request(app)
      .patch('/api/store/gps-settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ gpsLatitude: -91, gpsLongitude: 0, gpsRadiusM: 100 })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — longitude out of range (> 180)', async () => {
    const res = await request(app)
      .patch('/api/store/gps-settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ gpsLatitude: 0, gpsLongitude: 181, gpsRadiusM: 100 })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — negative radius is rejected', async () => {
    const res = await request(app)
      .patch('/api/store/gps-settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ gpsLatitude: 0, gpsLongitude: 0, gpsRadiusM: -50 })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — zero radius is rejected', async () => {
    const res = await request(app)
      .patch('/api/store/gps-settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ gpsLatitude: 0, gpsLongitude: 0, gpsRadiusM: 0 })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — missing gpsLatitude returns 400', async () => {
    const res = await request(app)
      .patch('/api/store/gps-settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ gpsLongitude: 77.209, gpsRadiusM: 150 })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — missing gpsLongitude returns 400', async () => {
    const res = await request(app)
      .patch('/api/store/gps-settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ gpsLatitude: 28.6139, gpsRadiusM: 150 })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — missing gpsRadiusM returns 400', async () => {
    const res = await request(app)
      .patch('/api/store/gps-settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ gpsLatitude: 28.6139, gpsLongitude: 77.209 })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — string values for coordinates return 400', async () => {
    const res = await request(app)
      .patch('/api/store/gps-settings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ gpsLatitude: '28.6139', gpsLongitude: '77.209', gpsRadiusM: '150' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('403 — manager cannot update GPS settings', async () => {
    const res = await request(app)
      .patch('/api/store/gps-settings')
      .set('Authorization', `Bearer ${managerToken}`)
      .send(validGps)

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('error')
  })

  it('403 — staff cannot update GPS settings', async () => {
    const res = await request(app)
      .patch('/api/store/gps-settings')
      .set('Authorization', `Bearer ${staffToken}`)
      .send(validGps)

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('error')
  })

  it('401 — no token returns 401', async () => {
    const res = await request(app)
      .patch('/api/store/gps-settings')
      .send(validGps)

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('401 — malformed token returns 401', async () => {
    const res = await request(app)
      .patch('/api/store/gps-settings')
      .set('Authorization', 'Bearer bad.token.here')
      .send(validGps)

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })
})
