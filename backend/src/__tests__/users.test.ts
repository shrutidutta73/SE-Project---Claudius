import request from 'supertest'
import app from '../app'
import { resetDb, seedBase, pool } from './helpers/db'
import type { BaseSeeds } from './helpers/db'
import { getOwnerToken, getManagerToken, getStaffToken } from './helpers/auth'

// ---------------------------------------------------------------------------
// State shared across all test suites
// ---------------------------------------------------------------------------

let seeds: BaseSeeds
let ownerToken: string
let managerToken: string
let staffToken: string

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** POST /api/users as the owner and return the response. */
function addUser(token: string, body: Record<string, unknown>) {
  return request(app).post('/api/users').set('Authorization', `Bearer ${token}`).send(body)
}

/** PATCH /api/users/:id as the given token. */
function patchUser(token: string, id: number, body: Record<string, unknown>) {
  return request(app)
    .patch(`/api/users/${id}`)
    .set('Authorization', `Bearer ${token}`)
    .send(body)
}

/** DELETE /api/users/:id as the given token. */
function deleteUser(token: string, id: number) {
  return request(app).delete(`/api/users/${id}`).set('Authorization', `Bearer ${token}`)
}

/** Unique 10-digit phone string (avoids collisions between tests). */
let phoneCounter = 6000000000
function nextPhone(): string {
  return String(phoneCounter++)
}

// ---------------------------------------------------------------------------
// GET /api/users
// ---------------------------------------------------------------------------

describe('GET /api/users', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/users')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 401 for a malformed / invalid token', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer this.is.not.a.valid.jwt')
    expect(res.status).toBe(401)
  })

  it('owner can list users and response is an array', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    // At minimum the three seeded users should be present
    expect(res.body.length).toBeGreaterThanOrEqual(3)
  })

  it('response array items have expected shape', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    const user = res.body[0]
    // Required keys
    expect(user).toHaveProperty('id')
    expect(user).toHaveProperty('storeId')
    expect(user).toHaveProperty('name')
    expect(user).toHaveProperty('phone')
    expect(user).toHaveProperty('role')
    expect(user).toHaveProperty('isActive')
    expect(user).toHaveProperty('avatar')
    expect(user).toHaveProperty('createdAt')
    expect(user).toHaveProperty('updatedAt')
    // Sensitive fields must NOT be present
    expect(user).not.toHaveProperty('password_hash')
    expect(user).not.toHaveProperty('pin_hash')
  })

  it('manager can list users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${managerToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('staff can list users (any authenticated user is allowed)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${staffToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('only returns users belonging to the same store (no cross-store leakage)', async () => {
    // Seed a second store + user directly, then verify they do NOT appear in
    // the owner's list.
    const store2 = await pool.query(`
      INSERT INTO stores (name, address, gps_latitude, gps_longitude, gps_radius_m, billing_mode)
      VALUES ('Other Store', 'Other Address', 26.0, 80.0, 100, 'structured')
      RETURNING id
    `)
    const store2Id = store2.rows[0].id
    const bcrypt = await import('bcrypt')
    const hash = await bcrypt.hash('Other@1234', 10)
    await pool.query(
      `INSERT INTO users (store_id, name, phone, email, role, password_hash, is_active)
       VALUES ($1, 'Other Owner', '6500000001', 'other@test.com', 'owner', $2, TRUE)`,
      [store2Id, hash],
    )

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    const phones = (res.body as Array<{ phone: string }>).map((u) => u.phone)
    expect(phones).not.toContain('6500000001')
  })
})

// ---------------------------------------------------------------------------
// POST /api/users
// ---------------------------------------------------------------------------

describe('POST /api/users', () => {
  it('owner can add a staff user (phone + pin, no email)', async () => {
    const phone = nextPhone()
    const res = await addUser(ownerToken, {
      name: 'New Staff',
      phone,
      role: 'staff',
      pin: '2222',
    })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.role).toBe('staff')
    expect(res.body.phone).toBe(phone)
    expect(res.body).not.toHaveProperty('pin_hash')
    expect(res.body.email).toBeNull()
  })

  it('owner can add a manager user (email + password)', async () => {
    const phone = nextPhone()
    const res = await addUser(ownerToken, {
      name: 'New Manager',
      phone,
      email: 'newmgr@test.com',
      role: 'manager',
      password: 'Mgr@5678',
    })
    expect(res.status).toBe(201)
    expect(res.body.role).toBe('manager')
    expect(res.body.email).toBe('newmgr@test.com')
  })

  it('manager can add a staff user', async () => {
    const phone = nextPhone()
    const res = await addUser(managerToken, {
      name: 'Staff by Manager',
      phone,
      role: 'staff',
      pin: '3333',
    })
    expect(res.status).toBe(201)
    expect(res.body.role).toBe('staff')
  })

  it('staff cannot add users (403)', async () => {
    const res = await addUser(staffToken, {
      name: 'Unauthorized Staff',
      phone: nextPhone(),
      role: 'staff',
      pin: '4444',
    })
    expect(res.status).toBe(403)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).post('/api/users').send({
      name: 'Ghost',
      phone: nextPhone(),
      role: 'staff',
      pin: '9999',
    })
    expect(res.status).toBe(401)
  })

  it('returns 409 on duplicate phone number', async () => {
    // seeds.staffId already has phone 7777777777 — try inserting that again
    const res = await addUser(ownerToken, {
      name: 'Dupe Phone',
      phone: '7777777777',
      role: 'staff',
      pin: '5555',
    })
    expect(res.status).toBe(409)
  })

  it('returns 400 when staff PIN is missing', async () => {
    const res = await addUser(ownerToken, {
      name: 'No Pin Staff',
      phone: nextPhone(),
      role: 'staff',
      // pin intentionally omitted
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when manager password is missing', async () => {
    const res = await addUser(ownerToken, {
      name: 'No Pass Mgr',
      phone: nextPhone(),
      email: 'nopwd@test.com',
      role: 'manager',
      // password intentionally omitted
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when name is missing', async () => {
    const res = await addUser(ownerToken, {
      phone: nextPhone(),
      role: 'staff',
      pin: '1234',
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when phone is not 10 digits', async () => {
    const res = await addUser(ownerToken, {
      name: 'Bad Phone',
      phone: '123',
      role: 'staff',
      pin: '1234',
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when phone contains non-digit characters', async () => {
    const res = await addUser(ownerToken, {
      name: 'Bad Phone',
      phone: '99999abc99',
      role: 'staff',
      pin: '1234',
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when role is invalid', async () => {
    const res = await addUser(ownerToken, {
      name: 'Bad Role',
      phone: nextPhone(),
      role: 'superadmin',
      pin: '1234',
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when PIN is not 4 digits', async () => {
    const res = await addUser(ownerToken, {
      name: 'Bad PIN',
      phone: nextPhone(),
      role: 'staff',
      pin: '12',
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when email is malformed', async () => {
    const res = await addUser(ownerToken, {
      name: 'Bad Email Mgr',
      phone: nextPhone(),
      role: 'manager',
      email: 'not-an-email',
      password: 'Abc@1234',
    })
    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/users/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/users/:id', () => {
  it('owner can update another user\'s name', async () => {
    const res = await patchUser(ownerToken, seeds.staffId, { name: 'Updated Staff Name' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Updated Staff Name')
  })

  it('owner can update phone number', async () => {
    const newPhone = nextPhone()
    const res = await patchUser(ownerToken, seeds.staffId, { phone: newPhone })
    expect(res.status).toBe(200)
    expect(res.body.phone).toBe(newPhone)
  })

  it('manager can update a user', async () => {
    const res = await patchUser(managerToken, seeds.staffId, { name: 'Mgr Updated Staff' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Mgr Updated Staff')
  })

  it('staff cannot update users (403)', async () => {
    const res = await patchUser(staffToken, seeds.managerId, { name: 'Staff Hacked' })
    expect(res.status).toBe(403)
  })

  it('returns 401 without a token', async () => {
    const res = await request(app).patch(`/api/users/${seeds.staffId}`).send({ name: 'Ghost' })
    expect(res.status).toBe(401)
  })

  it('returns 404 for a non-existent user id', async () => {
    const res = await patchUser(ownerToken, 999999, { name: 'No One' })
    expect(res.status).toBe(404)
  })

  it('returns 404 when trying to update a user from another store (cross-store isolation)', async () => {
    // Create a user in a foreign store then attempt to update via ownerToken
    const store2 = await pool.query(`
      INSERT INTO stores (name, address, gps_latitude, gps_longitude, gps_radius_m, billing_mode)
      VALUES ('Isolation Store', 'Somewhere', 25.0, 79.0, 100, 'structured')
      RETURNING id
    `)
    const store2Id = store2.rows[0].id
    const bcrypt = await import('bcrypt')
    const pinHash = await bcrypt.hash('1234', 10)
    const userRes = await pool.query(
      `INSERT INTO users (store_id, name, phone, role, pin_hash, is_active)
       VALUES ($1, 'Foreign Staff', '6100000001', 'staff', $2, TRUE)
       RETURNING id`,
      [store2Id, pinHash],
    )
    const foreignUserId: number = userRes.rows[0].id

    const res = await patchUser(ownerToken, foreignUserId, { name: 'Attempted Takeover' })
    expect(res.status).toBe(404)
  })

  it('returns 400 for an invalid (non-numeric) user id', async () => {
    const res = await request(app)
      .patch('/api/users/not-a-number')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'test' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when phone format is invalid', async () => {
    const res = await patchUser(ownerToken, seeds.staffId, { phone: '12345' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when email is malformed', async () => {
    const res = await patchUser(ownerToken, seeds.managerId, { email: 'bad-email' })
    expect(res.status).toBe(400)
  })

  it('returns existing user unchanged when no fields are provided', async () => {
    const res = await patchUser(ownerToken, seeds.managerId, {})
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('id', seeds.managerId)
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/users/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/users/:id', () => {
  let deletableStaffId: number

  beforeAll(async () => {
    // Seed a fresh staff member that the delete tests can consume
    const phone = nextPhone()
    const res = await addUser(ownerToken, {
      name: 'Deletable Staff',
      phone,
      role: 'staff',
      pin: '6666',
    })
    expect(res.status).toBe(201)
    deletableStaffId = res.body.id as number
  })

  it('owner can soft-delete a staff user', async () => {
    const res = await deleteUser(ownerToken, deletableStaffId)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')

    // Confirm the user no longer appears in the active list
    const listRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${ownerToken}`)
    const ids = (listRes.body as Array<{ id: number }>).map((u) => u.id)
    expect(ids).not.toContain(deletableStaffId)
  })

  it('owner cannot delete themselves (owner is protected)', async () => {
    const res = await deleteUser(ownerToken, seeds.ownerId)
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('staff cannot delete users (403)', async () => {
    const res = await deleteUser(staffToken, seeds.managerId)
    expect(res.status).toBe(403)
  })

  it('manager cannot delete users (403 — owner-only route)', async () => {
    const res = await deleteUser(managerToken, seeds.staffId)
    expect(res.status).toBe(403)
  })

  it('returns 401 without a token', async () => {
    const res = await request(app).delete(`/api/users/${seeds.staffId}`)
    expect(res.status).toBe(401)
  })

  it('returns 404 for a non-existent user id', async () => {
    const res = await deleteUser(ownerToken, 999999)
    expect(res.status).toBe(404)
  })

  it('returns 400 for an invalid (non-numeric) user id', async () => {
    const res = await request(app)
      .delete('/api/users/abc')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/users/:id/password
// ---------------------------------------------------------------------------

describe('PATCH /api/users/:id/password', () => {
  it('owner can update manager password with correct currentPassword', async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.managerId}/password`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ currentPassword: 'Manager@1234', newPassword: 'Manager@5678' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')
  })

  it('manager can update own password', async () => {
    // The previous test changed it to Manager@5678 — chain from that
    const freshManagerToken = await (async () => {
      const r = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'manager@test.com', credential: 'Manager@5678' })
      return r.body.token as string
    })()

    const res = await request(app)
      .patch(`/api/users/${seeds.managerId}/password`)
      .set('Authorization', `Bearer ${freshManagerToken}`)
      .send({ currentPassword: 'Manager@5678', newPassword: 'Manager@1234' })
    expect(res.status).toBe(200)
  })

  it('returns 401 when currentPassword is wrong', async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.ownerId}/password`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ currentPassword: 'WrongPassword!', newPassword: 'NewPass@1234' })
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 400 when newPassword is too short (< 6 chars)', async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.ownerId}/password`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ currentPassword: 'Test@1234', newPassword: 'abc' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when currentPassword is absent', async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.ownerId}/password`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ newPassword: 'NewPass@1234' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when trying to change password of a staff user (no password set)', async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.staffId}/password`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ currentPassword: 'anything', newPassword: 'NewPass@1234' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/password/i)
  })

  it('staff cannot change another user\'s password (403)', async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.managerId}/password`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ currentPassword: 'Manager@1234', newPassword: 'Hacked@1234' })
    expect(res.status).toBe(403)
  })

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.ownerId}/password`)
      .send({ currentPassword: 'Test@1234', newPassword: 'Test@5678' })
    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/users/:id/pin
// ---------------------------------------------------------------------------

describe('PATCH /api/users/:id/pin', () => {
  it('owner can update staff PIN', async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.staffId}/pin`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ pin: '2468' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')
  })

  it('manager can update staff PIN', async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.staffId}/pin`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ pin: '1357' })
    expect(res.status).toBe(200)
  })

  it('returns 400 when PIN is not 4 digits', async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.staffId}/pin`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ pin: '12' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when PIN contains non-digit characters', async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.staffId}/pin`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ pin: 'ab12' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when trying to set a PIN on a manager/owner (not a staff role)', async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.managerId}/pin`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ pin: '1234' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/staff/i)
  })

  it('returns 400 when pin field is missing', async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.staffId}/pin`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it('staff cannot update any PIN (403 — owner/manager only route)', async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.staffId}/pin`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ pin: '9999' })
    expect(res.status).toBe(403)
  })

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.staffId}/pin`)
      .send({ pin: '1234' })
    expect(res.status).toBe(401)
  })

  it('returns 404 for non-existent user', async () => {
    const res = await request(app)
      .patch('/api/users/999999/pin')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ pin: '1234' })
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/users/:id/avatar
// ---------------------------------------------------------------------------

describe('PATCH /api/users/:id/avatar', () => {
  // A minimal valid base64 data URL (1x1 transparent PNG)
  const BASE64_AVATAR =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  it('owner can set avatar for any user', async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.staffId}/avatar`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ avatar: BASE64_AVATAR })
    expect(res.status).toBe(200)
    expect(res.body.avatar).toBe(BASE64_AVATAR)
  })

  it('accepts base64 data URL string (not rejected as invalid URL)', async () => {
    // This verifies the schema accepts arbitrary non-empty strings (base64 blobs)
    const res = await request(app)
      .patch(`/api/users/${seeds.managerId}/avatar`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ avatar: BASE64_AVATAR })
    expect(res.status).toBe(200)
  })

  it('manager can set avatar for another user', async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.staffId}/avatar`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ avatar: BASE64_AVATAR })
    expect(res.status).toBe(200)
  })

  it('staff can update their own avatar', async () => {
    // staffToken has userId === seeds.staffId
    const res = await request(app)
      .patch(`/api/users/${seeds.staffId}/avatar`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ avatar: BASE64_AVATAR })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('avatar', BASE64_AVATAR)
  })

  it("staff cannot update another user's avatar (403)", async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.managerId}/avatar`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ avatar: BASE64_AVATAR })
    expect(res.status).toBe(403)
  })

  it('returns 400 when avatar is an empty string', async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.staffId}/avatar`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ avatar: '' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when avatar field is missing', async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.staffId}/avatar`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .patch(`/api/users/${seeds.staffId}/avatar`)
      .send({ avatar: BASE64_AVATAR })
    expect(res.status).toBe(401)
  })

  it('returns 404 for non-existent user', async () => {
    const res = await request(app)
      .patch('/api/users/999999/avatar')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ avatar: BASE64_AVATAR })
    expect(res.status).toBe(404)
  })

  it('returns 400 for an invalid (non-numeric) user id', async () => {
    const res = await request(app)
      .patch('/api/users/abc/avatar')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ avatar: BASE64_AVATAR })
    expect(res.status).toBe(400)
  })

  it('owner can set a plain string (non-data-URL) as avatar', async () => {
    // The schema only requires min(1) — any non-empty string is valid
    const res = await request(app)
      .patch(`/api/users/${seeds.staffId}/avatar`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ avatar: 'https://example.com/avatar.png' })
    expect(res.status).toBe(200)
    expect(res.body.avatar).toBe('https://example.com/avatar.png')
  })
})
