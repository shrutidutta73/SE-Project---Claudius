import bcrypt from 'bcrypt'
import pool from '../pool'
import { AppError } from '../errors/AppError'

interface UserRow {
  id: number
  store_id: number
  name: string
  phone: string
  email: string | null
  role: 'owner' | 'manager' | 'staff'
  password_hash: string | null
  pin_hash: string | null
  avatar: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

function mapUser(row: UserRow) {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    avatar: row.avatar,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listUsers(storeId: number) {
  const result = await pool.query<UserRow>(
    'SELECT * FROM users WHERE store_id = $1 AND is_active = TRUE ORDER BY role, name',
    [storeId],
  )
  return result.rows.map(mapUser)
}

export async function addUser(
  storeId: number,
  data: {
    name: string
    phone: string
    role: 'owner' | 'manager' | 'staff'
    email?: string
    password?: string
    pin?: string
  },
) {
  let passwordHash: string | null = null
  let pinHash: string | null = null

  if (data.role === 'staff') {
    if (!data.pin) {
      throw new AppError('PIN is required for staff role', 400)
    }
    pinHash = await bcrypt.hash(data.pin, 10)
  } else if (data.role === 'manager' || data.role === 'owner') {
    if (!data.password) {
      throw new AppError('Password is required for manager/owner role', 400)
    }
    passwordHash = await bcrypt.hash(data.password, 10)
  }

  const result = await pool.query<UserRow>(
    `INSERT INTO users (store_id, name, phone, email, role, password_hash, pin_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [storeId, data.name, data.phone, data.email ?? null, data.role, passwordHash, pinHash],
  )

  return mapUser(result.rows[0])
}

export async function updateUser(
  storeId: number,
  userId: number,
  data: { name?: string; phone?: string; email?: string },
) {
  const fields: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (data.name !== undefined) {
    fields.push(`name = $${idx++}`)
    values.push(data.name)
  }
  if (data.phone !== undefined) {
    fields.push(`phone = $${idx++}`)
    values.push(data.phone)
  }
  if (data.email !== undefined) {
    fields.push(`email = $${idx++}`)
    values.push(data.email)
  }

  if (fields.length === 0) {
    // Nothing to update — return existing user
    const existing = await pool.query<UserRow>(
      'SELECT * FROM users WHERE id = $1 AND store_id = $2',
      [userId, storeId],
    )
    if (existing.rows.length === 0) {
      throw new AppError('User not found', 404)
    }
    return mapUser(existing.rows[0])
  }

  fields.push(`updated_at = NOW()`)
  // userId and storeId come after the field values
  values.push(userId)
  values.push(storeId)

  const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx++} AND store_id = $${idx} RETURNING *`
  const result = await pool.query<UserRow>(query, values)

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404)
  }
  return mapUser(result.rows[0])
}

export async function deleteUser(storeId: number, userId: number) {
  // Fetch user first to check role
  const existing = await pool.query<UserRow>(
    'SELECT * FROM users WHERE id = $1 AND store_id = $2',
    [userId, storeId],
  )

  if (existing.rows.length === 0) {
    throw new AppError('User not found', 404)
  }

  if (existing.rows[0].role === 'owner') {
    throw new AppError('Cannot delete the store owner', 400)
  }

  await pool.query(
    'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1 AND store_id = $2',
    [userId, storeId],
  )
}

export async function updatePassword(
  storeId: number,
  userId: number,
  data: { currentPassword: string; newPassword: string },
) {
  if (data.newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters', 400)
  }

  const existing = await pool.query<UserRow>(
    'SELECT * FROM users WHERE id = $1 AND store_id = $2 AND is_active = TRUE',
    [userId, storeId],
  )

  if (existing.rows.length === 0) {
    throw new AppError('User not found', 404)
  }

  const user = existing.rows[0]

  if (!user.password_hash) {
    throw new AppError('This user does not have a password set', 400)
  }

  const isMatch = await bcrypt.compare(data.currentPassword, user.password_hash)
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401)
  }

  const newHash = await bcrypt.hash(data.newPassword, 10)
  await pool.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 AND store_id = $3',
    [newHash, userId, storeId],
  )
}

export async function updatePin(
  storeId: number,
  userId: number,
  data: { pin: string },
) {
  if (!/^\d{4}$/.test(data.pin)) {
    throw new AppError('PIN must be exactly 4 digits', 400)
  }

  const existing = await pool.query<UserRow>(
    'SELECT * FROM users WHERE id = $1 AND store_id = $2 AND is_active = TRUE',
    [userId, storeId],
  )

  if (existing.rows.length === 0) {
    throw new AppError('User not found', 404)
  }

  if (existing.rows[0].role !== 'staff') {
    throw new AppError('PIN can only be updated for staff users', 400)
  }

  const pinHash = await bcrypt.hash(data.pin, 10)
  await pool.query(
    'UPDATE users SET pin_hash = $1, updated_at = NOW() WHERE id = $2 AND store_id = $3',
    [pinHash, userId, storeId],
  )
}

export async function updateAvatar(
  storeId: number,
  userId: number,
  avatar: string,
) {
  const result = await pool.query<UserRow>(
    'UPDATE users SET avatar = $1, updated_at = NOW() WHERE id = $2 AND store_id = $3 RETURNING *',
    [avatar, userId, storeId],
  )

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404)
  }
  return mapUser(result.rows[0])
}
