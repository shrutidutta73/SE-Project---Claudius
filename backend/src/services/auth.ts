import bcrypt from 'bcrypt'
import pool from '../pool'
import { AppError } from '../errors/AppError'
import { signToken } from '../middleware/auth'

// ── Types ────────────────────────────────────────────────────────────────────

export interface UserResponse {
  id: number
  storeId: number
  name: string
  phone: string
  email: string | null
  role: 'owner' | 'manager' | 'staff'
  isActive: boolean
  avatar: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthResult {
  token: string
  user: UserResponse
}

// ── Helper ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToUser(row: Record<string, any>): UserResponse {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? null,
    role: row.role as 'owner' | 'manager' | 'staff',
    isActive: row.is_active,
    avatar: row.avatar ?? null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  }
}

// ── registerStore ────────────────────────────────────────────────────────────

export interface RegisterStoreData {
  shopName: string
  address: string
  logo?: string
  ownerName: string
  email: string
  phone: string
  password: string
}

export async function registerStore(data: RegisterStoreData): Promise<AuthResult> {
  const { shopName, address, logo, ownerName, email, phone, password } = data

  const client = await pool.connect()
  try {
    // Check email uniqueness before starting the transaction
    const emailCheck = await client.query<{ id: number }>(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [email],
    )
    if (emailCheck.rowCount && emailCheck.rowCount > 0) {
      throw new AppError('Email is already registered', 400, 'EMAIL_TAKEN')
    }

    // Check store name uniqueness
    const nameCheck = await client.query<{ id: number }>(
      'SELECT id FROM stores WHERE name = $1 LIMIT 1',
      [shopName],
    )
    if (nameCheck.rowCount && nameCheck.rowCount > 0) {
      throw new AppError('Shop name is already taken', 400, 'SHOP_NAME_TAKEN')
    }

    await client.query('BEGIN')

    // a. Insert store (owner_id will be set after user is created)
    const storeResult = await client.query<{ id: number }>(
      `INSERT INTO stores (name, address, logo, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id`,
      [shopName, address, logo ?? null],
    )
    const storeId: number = storeResult.rows[0].id

    // b. Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // c. Insert owner user
    const userResult = await client.query(
      `INSERT INTO users (store_id, name, phone, email, role, password_hash, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'owner', $5, TRUE, NOW(), NOW())
       RETURNING *`,
      [storeId, ownerName, phone, email, passwordHash],
    )
    const userRow = userResult.rows[0]
    const userId: number = userRow.id

    // d. Update store with owner_id
    await client.query('UPDATE stores SET owner_id = $1 WHERE id = $2', [userId, storeId])

    await client.query('COMMIT')

    const token = signToken({ userId, storeId, role: 'owner' })
    return { token, user: rowToUser(userRow) }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// ── login ────────────────────────────────────────────────────────────────────

export interface LoginData {
  identifier: string
  credential: string
}

export async function login(data: LoginData): Promise<AuthResult> {
  const { identifier, credential } = data

  const isEmailLogin = identifier.includes('@')

  let userRow: Record<string, unknown> | undefined

  if (isEmailLogin) {
    // Owner / manager login via email + password
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE LIMIT 1',
      [identifier],
    )
    userRow = result.rows[0]

    if (!userRow) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }

    const passwordHash = userRow.password_hash as string | null
    if (!passwordHash) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }

    const valid = await bcrypt.compare(credential, passwordHash)
    if (!valid) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }
  } else {
    // Staff login via phone + PIN
    const result = await pool.query(
      'SELECT * FROM users WHERE phone = $1 AND is_active = TRUE LIMIT 1',
      [identifier],
    )
    userRow = result.rows[0]

    if (!userRow) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }

    const pinHash = userRow.pin_hash as string | null
    if (!pinHash) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }

    const valid = await bcrypt.compare(credential, pinHash)
    if (!valid) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }
  }

  const token = signToken({
    userId: userRow.id as number,
    storeId: userRow.store_id as number,
    role: userRow.role as 'owner' | 'manager' | 'staff',
  })

  return { token, user: rowToUser(userRow as Record<string, unknown>) }
}
