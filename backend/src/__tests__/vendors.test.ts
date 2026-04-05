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

// ── GET /api/vendors ──────────────────────────────────────────────────────────

describe('GET /api/vendors', () => {
  it('returns 200 with an array for owner', async () => {
    const res = await request(app)
      .get('/api/vendors')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('includes the seeded vendor', async () => {
    const res = await request(app)
      .get('/api/vendors')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
    const v = res.body.find((x: { id: number }) => x.id === seeds.vendorId)
    expect(v).toBeDefined()
    expect(v.name).toBe('Test Vendor')
  })

  it('each vendor has the expected shape', async () => {
    const res = await request(app)
      .get('/api/vendors')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    const v = res.body[0]
    expect(v).toHaveProperty('id')
    expect(v).toHaveProperty('storeId')
    expect(v).toHaveProperty('name')
    expect(v).toHaveProperty('isActive')
    expect(v).toHaveProperty('dues')
    expect(v).toHaveProperty('suppliedBands')
    expect(Array.isArray(v.suppliedBands)).toBe(true)
    expect(typeof v.dues).toBe('number')
  })

  it('returns 200 with an array for manager', async () => {
    const res = await request(app)
      .get('/api/vendors')
      .set('Authorization', `Bearer ${managerToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns 200 with an array for staff (GET is open to all authenticated)', async () => {
    const res = await request(app)
      .get('/api/vendors')
      .set('Authorization', `Bearer ${staffToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/vendors')

    expect(res.status).toBe(401)
  })

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/vendors')
      .set('Authorization', 'Bearer bad.token.here')

    expect(res.status).toBe(401)
  })
})

// ── POST /api/vendors ─────────────────────────────────────────────────────────

describe('POST /api/vendors', () => {
  it('creates a vendor with name, phone, city for owner', async () => {
    const res = await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'New Vendor', phone: '9200000001', city: 'Mumbai' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      name: 'New Vendor',
      phone: '9200000001',
      city: 'Mumbai',
      isActive: true,
      dues: 0,
    })
    expect(res.body).toHaveProperty('id')
    expect(res.body).toHaveProperty('createdAt')
    expect(res.body).toHaveProperty('updatedAt')
  })

  it('creates a vendor with name only (optional fields omitted)', async () => {
    const res = await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Minimal Vendor' })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Minimal Vendor')
    expect(res.body.phone).toBeNull()
    expect(res.body.city).toBeNull()
  })

  it('creates a vendor for manager (has permission)', async () => {
    const res = await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Manager Vendor', phone: '9200000002', city: 'Pune' })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Manager Vendor')
  })

  it('creates a vendor with notes', async () => {
    const res = await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Noted Vendor', notes: 'Preferred supplier' })

    expect(res.status).toBe(201)
    expect(res.body.notes).toBe('Preferred supplier')
  })

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ phone: '9200000099', city: 'Delhi' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when name is too short (less than 2 chars)', async () => {
    const res = await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'A' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when body is empty', async () => {
    const res = await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})

    expect(res.status).toBe(400)
  })

  it('allows two vendors with the same phone (no unique constraint on vendor phone)', async () => {
    // The vendors table does not have a unique constraint on phone,
    // so two vendors with the same phone number is permitted.
    await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Dup Phone Vendor A', phone: '9300000001' })

    const res = await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Dup Phone Vendor B', phone: '9300000001' })

    expect(res.status).toBe(201)
  })

  it('returns 403 for staff', async () => {
    const res = await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'Staff Vendor' })

    expect(res.status).toBe(403)
  })

  it('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/vendors')
      .send({ name: 'No Auth Vendor' })

    expect(res.status).toBe(401)
  })
})

// ── PATCH /api/vendors/:id ────────────────────────────────────────────────────

describe('PATCH /api/vendors/:id', () => {
  let createdVendorId: number

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Patch Target Vendor', phone: '9400000001', city: 'Chennai' })
    createdVendorId = res.body.id
  })

  it('updates the vendor name', async () => {
    const res = await request(app)
      .patch(`/api/vendors/${createdVendorId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Updated Vendor Name' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Updated Vendor Name')
    expect(res.body.id).toBe(createdVendorId)
  })

  it('updates the vendor city', async () => {
    const res = await request(app)
      .patch(`/api/vendors/${createdVendorId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ city: 'Bangalore' })

    expect(res.status).toBe(200)
    expect(res.body.city).toBe('Bangalore')
  })

  it('updates multiple fields at once', async () => {
    const res = await request(app)
      .patch(`/api/vendors/${createdVendorId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Multi Update', city: 'Hyderabad', notes: 'Updated notes' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Multi Update')
    expect(res.body.city).toBe('Hyderabad')
    expect(res.body.notes).toBe('Updated notes')
  })

  it('manager can update vendor', async () => {
    const res = await request(app)
      .patch(`/api/vendors/${createdVendorId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Manager Updated' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Manager Updated')
  })

  it('returns 400 when name is too short', async () => {
    const res = await request(app)
      .patch(`/api/vendors/${createdVendorId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'X' })

    expect(res.status).toBe(400)
  })

  it('returns 400 when body has no recognized fields', async () => {
    const res = await request(app)
      .patch(`/api/vendors/${createdVendorId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 404 for non-existent vendor id', async () => {
    const res = await request(app)
      .patch('/api/vendors/999999')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Ghost Vendor' })

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 for non-numeric vendor id', async () => {
    const res = await request(app)
      .patch('/api/vendors/abc')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Bad Id Vendor' })

    expect(res.status).toBe(400)
  })

  it('returns 403 for staff', async () => {
    const res = await request(app)
      .patch(`/api/vendors/${createdVendorId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'Staff Attempt' })

    expect(res.status).toBe(403)
  })

  it('returns 401 without token', async () => {
    const res = await request(app)
      .patch(`/api/vendors/${createdVendorId}`)
      .send({ name: 'No Auth Update' })

    expect(res.status).toBe(401)
  })
})

// ── DELETE /api/vendors/:id ───────────────────────────────────────────────────

describe('DELETE /api/vendors/:id', () => {
  let vendorToDeleteId: number

  beforeEach(async () => {
    // Create a fresh vendor for each deletion test
    const res = await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Delete Me Vendor', phone: `950${Date.now().toString().slice(-7)}` })
    vendorToDeleteId = res.body.id
  })

  it('soft-deletes a vendor (sets is_active = false) and returns success', async () => {
    const res = await request(app)
      .delete(`/api/vendors/${vendorToDeleteId}`)
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ success: true })
  })

  it('vendor no longer appears in GET /api/vendors after deletion', async () => {
    await request(app)
      .delete(`/api/vendors/${vendorToDeleteId}`)
      .set('Authorization', `Bearer ${ownerToken}`)

    const listRes = await request(app)
      .get('/api/vendors')
      .set('Authorization', `Bearer ${ownerToken}`)

    const found = listRes.body.find((v: { id: number }) => v.id === vendorToDeleteId)
    expect(found).toBeUndefined()
  })

  it('returns 404 for non-existent vendor id', async () => {
    const res = await request(app)
      .delete('/api/vendors/999999')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 for non-numeric id', async () => {
    const res = await request(app)
      .delete('/api/vendors/notanid')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(400)
  })

  it('returns 403 for manager (only owner can delete)', async () => {
    const res = await request(app)
      .delete(`/api/vendors/${vendorToDeleteId}`)
      .set('Authorization', `Bearer ${managerToken}`)

    expect(res.status).toBe(403)
  })

  it('returns 403 for staff', async () => {
    const res = await request(app)
      .delete(`/api/vendors/${vendorToDeleteId}`)
      .set('Authorization', `Bearer ${staffToken}`)

    expect(res.status).toBe(403)
  })

  it('returns 401 without token', async () => {
    const res = await request(app).delete(`/api/vendors/${vendorToDeleteId}`)

    expect(res.status).toBe(401)
  })

  it('returns 404 when attempting to delete an already-deleted vendor', async () => {
    // First delete
    await request(app)
      .delete(`/api/vendors/${vendorToDeleteId}`)
      .set('Authorization', `Bearer ${ownerToken}`)

    // Second delete of same id — row still exists but is_active=FALSE so UPDATE affects 0 rows
    const res = await request(app)
      .delete(`/api/vendors/${vendorToDeleteId}`)
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(404)
  })
})

// ── GET /api/vendors/:id/suggest-order ───────────────────────────────────────

describe('GET /api/vendors/:id/suggest-order', () => {
  it('returns 200 with an array of suggest-order items for owner', async () => {
    const res = await request(app)
      .get(`/api/vendors/${seeds.vendorId}/suggest-order`)
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('each item has the expected suggest-order shape', async () => {
    const res = await request(app)
      .get(`/api/vendors/${seeds.vendorId}/suggest-order`)
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)

    const item = res.body[0]
    expect(item).toHaveProperty('priceBandId')
    expect(item).toHaveProperty('categoryName')
    expect(item).toHaveProperty('bandPrice')
    expect(item).toHaveProperty('dailyAvg')
    expect(item).toHaveProperty('currentStock')
    expect(item).toHaveProperty('suggestedQty')
    expect(typeof item.suggestedQty).toBe('number')
    expect(item.suggestedQty).toBeGreaterThanOrEqual(0)
  })

  it('suggestedQty = max(0, ceil(dailyAvg * 14) - currentStock)', async () => {
    const res = await request(app)
      .get(`/api/vendors/${seeds.vendorId}/suggest-order`)
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    for (const item of res.body) {
      const expected = Math.max(
        0,
        Math.ceil(item.dailyAvg * 14) - item.currentStock,
      )
      expect(item.suggestedQty).toBe(expected)
    }
  })

  it('returns 200 with an array for manager', async () => {
    const res = await request(app)
      .get(`/api/vendors/${seeds.vendorId}/suggest-order`)
      .set('Authorization', `Bearer ${managerToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns 404 for a non-existent vendor', async () => {
    const res = await request(app)
      .get('/api/vendors/999999/suggest-order')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(404)
  })

  it('returns 400 for non-numeric vendor id', async () => {
    const res = await request(app)
      .get('/api/vendors/abc/suggest-order')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(res.status).toBe(400)
  })

  it('returns 403 for staff', async () => {
    const res = await request(app)
      .get(`/api/vendors/${seeds.vendorId}/suggest-order`)
      .set('Authorization', `Bearer ${staffToken}`)

    expect(res.status).toBe(403)
  })

  it('returns 401 without token', async () => {
    const res = await request(app)
      .get(`/api/vendors/${seeds.vendorId}/suggest-order`)

    expect(res.status).toBe(401)
  })
})
