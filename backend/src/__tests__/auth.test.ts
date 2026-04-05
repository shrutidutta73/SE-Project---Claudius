import request from 'supertest'
import app from '../app'
import { resetDb, seedBase, pool } from './helpers/db'
import type { BaseSeeds } from './helpers/db'

let seeds: BaseSeeds

beforeAll(async () => {
  await resetDb()
  seeds = await seedBase()
})

afterAll(async () => {
  await pool.end()
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  const validPayload = {
    shopName: 'New Shop',
    address: '123 Market St, Delhi',
    ownerName: 'Jane Doe',
    email: 'jane@newshop.com',
    phone: '9876543210',
    password: 'Secure@123',
  }

  it('201 — creates store + owner and returns token + user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(validPayload)

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('token')
    expect(typeof res.body.token).toBe('string')
    expect(res.body.token.length).toBeGreaterThan(0)

    const { user } = res.body
    expect(user).toBeDefined()
    expect(user.role).toBe('owner')
    expect(user.email).toBe(validPayload.email)
    expect(user.name).toBe(validPayload.ownerName)
    expect(user.phone).toBe(validPayload.phone)
    expect(user.isActive).toBe(true)
    expect(user).not.toHaveProperty('password_hash')
    expect(user).not.toHaveProperty('pin_hash')
    expect(user).toHaveProperty('storeId')
    expect(typeof user.storeId).toBe('number')
  })

  it('201 — accepts optional logo field', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        ...validPayload,
        shopName: 'Shop With Logo',
        email: 'logo@shop.com',
        phone: '9111222333',
        logo: 'data:image/png;base64,abc123',
      })

    expect(res.status).toBe(201)
    expect(res.body.user.email).toBe('logo@shop.com')
  })

  it('400 — duplicate email returns error', async () => {
    // owner@test.com is already seeded
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        ...validPayload,
        shopName: 'Another Shop',
        email: 'owner@test.com',
        phone: '9000000001',
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toMatch(/email/i)
  })

  it('400 — duplicate shop name returns error', async () => {
    // 'Test Store' is already seeded
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        ...validPayload,
        shopName: 'Test Store',
        email: 'unique_for_dup@test.com',
        phone: '9000000002',
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — missing shopName', async () => {
    const { shopName: _omitted, ...payload } = validPayload
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...payload, email: 'missing1@test.com', phone: '9000000003' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — missing ownerName', async () => {
    const { ownerName: _omitted, ...payload } = validPayload
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...payload, email: 'missing2@test.com', phone: '9000000004', shopName: 'Shop Missing Owner' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — missing email', async () => {
    const { email: _omitted, ...payload } = validPayload
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...payload, shopName: 'Shop Missing Email', phone: '9000000005' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, shopName: 'Bad Email Shop', email: 'not-an-email', phone: '9000000006' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — phone not exactly 10 digits', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, shopName: 'Bad Phone Shop', email: 'badphone@test.com', phone: '98765' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — phone with non-digit characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, shopName: 'Bad Phone Shop 2', email: 'badphone2@test.com', phone: '+919876543210' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — password shorter than 6 characters (weak password)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, shopName: 'Weak Pass Shop', email: 'weakpass@test.com', phone: '9000000007', password: 'abc' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — missing address', async () => {
    const { address: _omitted, ...payload } = validPayload
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...payload, shopName: 'Shop No Addr', email: 'noaddr@test.com', phone: '9000000008' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — empty body', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('200 — owner login with email + password returns token and user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'owner@test.com', credential: 'Test@1234' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(typeof res.body.token).toBe('string')
    expect(res.body.token.length).toBeGreaterThan(0)

    const { user } = res.body
    expect(user).toBeDefined()
    expect(user.email).toBe('owner@test.com')
    expect(user.role).toBe('owner')
    expect(user.isActive).toBe(true)
    expect(user).toHaveProperty('id')
    expect(user).toHaveProperty('storeId')
    expect(user).toHaveProperty('name')
    expect(user).toHaveProperty('createdAt')
    expect(user).toHaveProperty('updatedAt')
    expect(user).not.toHaveProperty('password_hash')
    expect(user).not.toHaveProperty('pin_hash')
  })

  it('200 — manager login with email + password returns token and user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'manager@test.com', credential: 'Manager@1234' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')

    const { user } = res.body
    expect(user.role).toBe('manager')
    expect(user.email).toBe('manager@test.com')
    expect(user.isActive).toBe(true)
  })

  it('200 — staff login with phone + PIN returns token and user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: '7777777777', credential: '1111' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')

    const { user } = res.body
    expect(user.role).toBe('staff')
    expect(user.phone).toBe('7777777777')
    expect(user.isActive).toBe(true)
    // staff may have no email
    expect(user.email).toBeNull()
  })

  it('200 — login token is a valid JWT (three dot-separated parts)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'owner@test.com', credential: 'Test@1234' })

    expect(res.status).toBe(200)
    const parts = res.body.token.split('.')
    expect(parts).toHaveLength(3)
  })

  it('401 — wrong password for owner', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'owner@test.com', credential: 'WrongPassword' })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('401 — wrong PIN for staff', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: '7777777777', credential: '9999' })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('401 — non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'ghost@nowhere.com', credential: 'SomePassword' })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('401 — non-existent phone', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: '0000000000', credential: '0000' })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — missing identifier', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ credential: 'Test@1234' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — missing credential', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'owner@test.com' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — empty body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — empty string identifier', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: '', credential: 'Test@1234' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('400 — empty string credential', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'owner@test.com', credential: '' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('401 — correct email but wrong role has no password_hash (staff login via email fails gracefully)', async () => {
    // Staff user has no email and no password_hash; attempting email login with
    // a non-existent email results in 401, not a crash
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'staff@nonexistent.com', credential: '1111' })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })
})
