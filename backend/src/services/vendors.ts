import pool from '../pool'
import { AppError } from '../errors/AppError'

// ── Types ────────────────────────────────────────────────────────────────────

export interface SuppliedBand {
  bandId: number
  price: number
  categoryName: string
}

export interface VendorWithDues {
  id: number
  storeId: number
  name: string
  phone: string | null
  email: string | null
  city: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  dues: number
  suppliedBands: SuppliedBand[]
}

export interface SuggestOrderItem {
  priceBandId: number
  categoryName: string
  bandPrice: number
  dailyAvg: number
  currentStock: number
  suggestedQty: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToVendor(row: Record<string, any>): Omit<VendorWithDues, 'suppliedBands'> {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    phone: row.phone ?? null,
    email: row.email ?? null,
    city: row.city ?? null,
    notes: row.notes ?? null,
    isActive: row.is_active,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
    dues: Number(row.dues ?? 0),
  }
}

// ── listVendors ───────────────────────────────────────────────────────────────

export async function listVendors(storeId: number): Promise<VendorWithDues[]> {
  // Query 1: all active vendors with dues
  const vendorResult = await pool.query(
    `SELECT
       v.*,
       COALESCE(
         (SELECT SUM(ri.final_qty * ri.band_price)
          FROM reorders r
          JOIN reorder_items ri ON ri.reorder_id = r.id
          WHERE r.vendor_id = v.id AND r.status NOT IN ('fulfilled') AND r.store_id = $1),
         0
       )::FLOAT AS dues
     FROM vendors v
     WHERE v.store_id = $1 AND v.is_active = TRUE
     ORDER BY v.name`,
    [storeId],
  )

  if (vendorResult.rows.length === 0) return []

  // Query 2: all supplied bands for this store (not per-vendor — 2 queries total, not N+1)
  const bandsResult = await pool.query(
    `SELECT DISTINCT ib.vendor_id, ib.price_band_id AS band_id, pb.price, c.name AS category_name
     FROM inventory_batches ib
     JOIN price_bands pb ON pb.id = ib.price_band_id
     JOIN categories c ON c.id = pb.category_id
     WHERE ib.store_id = $1`,
    [storeId],
  )

  // Group bands by vendor_id in JS
  const bandsByVendor = new Map<number, SuppliedBand[]>()
  for (const row of bandsResult.rows) {
    const vendorId: number = row.vendor_id
    if (!bandsByVendor.has(vendorId)) bandsByVendor.set(vendorId, [])
    bandsByVendor.get(vendorId)!.push({
      bandId: row.band_id,
      price: Number(row.price),
      categoryName: row.category_name,
    })
  }

  return vendorResult.rows.map(row => ({
    ...rowToVendor(row),
    suppliedBands: bandsByVendor.get(row.id) ?? [],
  }))
}

// ── createVendor ──────────────────────────────────────────────────────────────

export interface CreateVendorData {
  name: string
  phone?: string
  city?: string
  notes?: string
}

export async function createVendor(
  storeId: number,
  data: CreateVendorData,
): Promise<VendorWithDues> {
  const { name, phone = null, city = null, notes = null } = data

  const result = await pool.query(
    `INSERT INTO vendors (store_id, name, phone, city, notes, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
     RETURNING *`,
    [storeId, name, phone, city, notes],
  )

  return { ...rowToVendor(result.rows[0]), dues: 0, suppliedBands: [] }
}

// ── updateVendor ──────────────────────────────────────────────────────────────

export interface UpdateVendorData {
  name?: string
  phone?: string
  city?: string
  notes?: string
}

export async function updateVendor(
  storeId: number,
  vendorId: number,
  data: UpdateVendorData,
): Promise<VendorWithDues> {
  // Build SET clause dynamically from provided fields
  const fields: string[] = []
  const values: unknown[] = []
  let paramIdx = 1

  if (data.name !== undefined) { fields.push(`name = $${paramIdx++}`); values.push(data.name) }
  if (data.phone !== undefined) { fields.push(`phone = $${paramIdx++}`); values.push(data.phone) }
  if (data.city !== undefined) { fields.push(`city = $${paramIdx++}`); values.push(data.city) }
  if (data.notes !== undefined) { fields.push(`notes = $${paramIdx++}`); values.push(data.notes) }

  if (fields.length === 0) {
    throw new AppError('No fields to update', 400, 'VALIDATION_ERROR')
  }

  fields.push(`updated_at = NOW()`)
  values.push(vendorId, storeId)

  const result = await pool.query(
    `UPDATE vendors SET ${fields.join(', ')}
     WHERE id = $${paramIdx++} AND store_id = $${paramIdx++}
     RETURNING *`,
    values,
  )

  if (result.rowCount === 0) {
    throw new AppError('Vendor not found', 404, 'NOT_FOUND')
  }

  return { ...rowToVendor(result.rows[0]), suppliedBands: [] }
}

// ── deleteVendor (soft delete) ────────────────────────────────────────────────

export async function deleteVendor(storeId: number, vendorId: number): Promise<void> {
  const result = await pool.query(
    `UPDATE vendors SET is_active = FALSE, updated_at = NOW()
     WHERE id = $1 AND store_id = $2 AND is_active = TRUE`,
    [vendorId, storeId],
  )

  if (result.rowCount === 0) {
    throw new AppError('Vendor not found', 404, 'NOT_FOUND')
  }
}

// ── getSuggestOrder ───────────────────────────────────────────────────────────

export async function getSuggestOrder(
  storeId: number,
  vendorId: number,
): Promise<SuggestOrderItem[]> {
  // Verify vendor exists and belongs to store
  const vendorCheck = await pool.query(
    'SELECT id FROM vendors WHERE id = $1 AND store_id = $2 AND is_active = TRUE',
    [vendorId, storeId],
  )
  if (vendorCheck.rowCount === 0) {
    throw new AppError('Vendor not found', 404, 'NOT_FOUND')
  }

  const result = await pool.query(
    `SELECT
       pb.id AS price_band_id,
       c.name AS category_name,
       pb.price AS band_price,
       COALESCE(SUM(ib2.quantity_remaining), 0)::INT AS current_stock,
       COALESCE(
         (SELECT SUM(si.quantity)::FLOAT / 30
          FROM sale_items si
          JOIN sales s ON s.id = si.sale_id
          WHERE si.price_band_id = pb.id
            AND s.store_id = $1
            AND s.created_at >= NOW() - INTERVAL '30 days'),
         0
       )::FLOAT AS daily_avg
     FROM inventory_batches ib
     JOIN price_bands pb ON pb.id = ib.price_band_id
     JOIN categories c ON c.id = pb.category_id
     LEFT JOIN inventory_batches ib2 ON ib2.price_band_id = pb.id AND ib2.store_id = $1
     WHERE ib.vendor_id = $2 AND ib.store_id = $1
     GROUP BY pb.id, c.name, pb.price`,
    [storeId, vendorId],
  )

  return result.rows.map(r => ({
    priceBandId: r.price_band_id,
    categoryName: r.category_name,
    bandPrice: Number(r.band_price),
    dailyAvg: Number(r.daily_avg),
    currentStock: r.current_stock,
    suggestedQty: Math.max(0, Math.ceil(Number(r.daily_avg) * 14) - r.current_stock),
  }))
}
