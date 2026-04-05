import pool from '../../pool'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import bcrypt from 'bcrypt'

export async function resetDb(): Promise<void> {
  const schema = readFileSync(resolve(__dirname, '../../../database/schema.sql'), 'utf8')
  await pool.query(schema)
}

export interface BaseSeeds {
  storeId: number
  ownerId: number
  managerId: number
  staffId: number
  categoryId: number
  priceBandId: number
  vendorId: number
  batchId: number
}

export async function seedBase(): Promise<BaseSeeds> {
  // Store
  const storeRes = await pool.query(`
    INSERT INTO stores (name, address, gps_latitude, gps_longitude, gps_radius_m, billing_mode)
    VALUES ('Test Store', 'Test Address, City', 26.4499, 80.3319, 200, 'structured')
    RETURNING id
  `)
  const storeId: number = storeRes.rows[0].id

  // Hash credentials
  const [ownerHash, managerHash, staffHash] = await Promise.all([
    bcrypt.hash('Test@1234', 10),
    bcrypt.hash('Manager@1234', 10),
    bcrypt.hash('1111', 10),
  ])

  // Owner
  const ownerRes = await pool.query(`
    INSERT INTO users (store_id, name, phone, email, role, password_hash, is_active)
    VALUES ($1, 'Test Owner', '9999999999', 'owner@test.com', 'owner', $2, TRUE)
    RETURNING id
  `, [storeId, ownerHash])
  const ownerId: number = ownerRes.rows[0].id
  await pool.query('UPDATE stores SET owner_id = $1 WHERE id = $2', [ownerId, storeId])

  // Manager
  const managerRes = await pool.query(`
    INSERT INTO users (store_id, name, phone, email, role, password_hash, is_active)
    VALUES ($1, 'Test Manager', '8888888888', 'manager@test.com', 'manager', $2, TRUE)
    RETURNING id
  `, [storeId, managerHash])
  const managerId: number = managerRes.rows[0].id

  // Staff
  const staffRes = await pool.query(`
    INSERT INTO users (store_id, name, phone, role, pin_hash, is_active)
    VALUES ($1, 'Test Staff', '7777777777', 'staff', $2, TRUE)
    RETURNING id
  `, [storeId, staffHash])
  const staffId: number = staffRes.rows[0].id

  // Category
  const catRes = await pool.query(`
    INSERT INTO categories (store_id, name) VALUES ($1, 'Shirts') RETURNING id
  `, [storeId])
  const categoryId: number = catRes.rows[0].id

  // Price band
  const bandRes = await pool.query(`
    INSERT INTO price_bands (store_id, category_id, price, is_active)
    VALUES ($1, $2, 299, TRUE) RETURNING id
  `, [storeId, categoryId])
  const priceBandId: number = bandRes.rows[0].id

  // Vendor
  const vendorRes = await pool.query(`
    INSERT INTO vendors (store_id, name, phone, city, is_active)
    VALUES ($1, 'Test Vendor', '9111111111', 'Delhi', TRUE)
    RETURNING id
  `, [storeId])
  const vendorId: number = vendorRes.rows[0].id

  // Inventory batch (20 units)
  const batchRes = await pool.query(`
    INSERT INTO inventory_batches (store_id, price_band_id, vendor_id, quantity_added, quantity_remaining, cost_price, added_by)
    VALUES ($1, $2, $3, 20, 20, 180, $4) RETURNING id
  `, [storeId, priceBandId, vendorId, ownerId])
  const batchId: number = batchRes.rows[0].id

  return { storeId, ownerId, managerId, staffId, categoryId, priceBandId, vendorId, batchId }
}

export { pool }
