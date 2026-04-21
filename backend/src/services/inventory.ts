import pool from '../pool'
import { AppError } from '../errors/AppError'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InventoryBatchDetail {
  id: number
  storeId: number
  priceBandId: number
  vendorId: number | null
  quantityAdded: number
  quantityRemaining: number
  costPrice: number | null
  addedBy: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
  vendorName: string | null
  categoryName: string
  bandPrice: number
  ageInDays: number
  margin: number | null
}

export interface MatrixRow {
  categoryId: number
  categoryName: string
  bands: Record<string, number>
}

export type BatchFilter = 'all' | 'low_stock' | 'aging' | 'new_arrivals'

// ── Row mapper ────────────────────────────────────────────────────────────────

function rowToBatchDetail(row: Record<string, unknown>): InventoryBatchDetail {
  return {
    id: row.id as number,
    storeId: row.store_id as number,
    priceBandId: row.price_band_id as number,
    vendorId: row.vendor_id as number | null,
    quantityAdded: row.quantity_added as number,
    quantityRemaining: row.quantity_remaining as number,
    costPrice: row.cost_price != null ? Number(row.cost_price) : null,
    addedBy: row.added_by as number | null,
    notes: row.notes as string | null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
    vendorName: row.vendor_name as string | null,
    categoryName: row.category_name as string,
    bandPrice: Number(row.band_price),
    ageInDays: row.age_in_days as number,
    margin: row.margin != null ? Number(row.margin) : null,
  }
}

// ── Base SELECT fragment ──────────────────────────────────────────────────────

const BASE_SELECT = `
  SELECT
    ib.id, ib.store_id, ib.price_band_id, ib.vendor_id,
    ib.quantity_added, ib.quantity_remaining, ib.cost_price,
    ib.added_by, ib.notes, ib.created_at, ib.updated_at,
    v.name AS vendor_name,
    c.name AS category_name,
    pb.price AS band_price,
    FLOOR(EXTRACT(EPOCH FROM (NOW() - ib.created_at)) / 86400)::INT AS age_in_days,
    CASE
      WHEN ib.cost_price IS NOT NULL AND pb.price > 0
      THEN ROUND(((pb.price - ib.cost_price) / pb.price * 100))::INT
      ELSE NULL
    END AS margin
  FROM inventory_batches ib
  JOIN price_bands pb ON pb.id = ib.price_band_id
  JOIN categories c ON c.id = pb.category_id
  LEFT JOIN vendors v ON v.id = ib.vendor_id
`

// ── 1. listBatches ────────────────────────────────────────────────────────────

export async function listBatches(
  storeId: number,
  filter: BatchFilter,
): Promise<InventoryBatchDetail[]> {
  let filterClause = ''
  if (filter === 'low_stock') {
    filterClause = `AND ib.quantity_remaining < 10`
  } else if (filter === 'aging') {
    filterClause = `AND ib.created_at < NOW() - INTERVAL '60 days'`
  } else if (filter === 'new_arrivals') {
    filterClause = `AND ib.created_at >= NOW() - INTERVAL '7 days'`
  }

  const sql = `
    ${BASE_SELECT}
    WHERE ib.store_id = $1
    ${filterClause}
    ORDER BY ib.created_at DESC
  `

  const result = await pool.query<Record<string, unknown>>(sql, [storeId])
  return result.rows.map(rowToBatchDetail)
}

// ── 2. addBatch ───────────────────────────────────────────────────────────────

export interface AddBatchData {
  priceBandId: number
  vendorId?: number
  quantityAdded: number
  costPrice?: number
  notes?: string
}

export async function addBatch(
  storeId: number,
  userId: number,
  data: AddBatchData,
): Promise<InventoryBatchDetail> {
  // Verify the price band belongs to this store
  const bandCheck = await pool.query<Record<string, unknown>>(
    'SELECT id FROM price_bands WHERE id = $1 AND store_id = $2',
    [data.priceBandId, storeId],
  )
  if (bandCheck.rowCount === 0) {
    throw new AppError('Price band not found for this store', 404, 'NOT_FOUND')
  }

  // Capture the new id via RETURNING — the previous approach re-selected
  // by (store, band, user) ORDER BY created_at DESC, which can return a
  // different concurrently-inserted row for the same user/band combo.
  const insertResult = await pool.query<{ id: number }>(
    `INSERT INTO inventory_batches
       (store_id, price_band_id, vendor_id, quantity_added, quantity_remaining,
        cost_price, added_by, notes)
     VALUES ($1, $2, $3, $4, $4, $5, $6, $7)
     RETURNING id`,
    [
      storeId,
      data.priceBandId,
      data.vendorId ?? null,
      data.quantityAdded,
      data.costPrice ?? null,
      userId,
      data.notes ?? null,
    ],
  )
  const newBatchId = insertResult.rows[0].id

  const fetchSql = `
    ${BASE_SELECT}
    WHERE ib.id = $1 AND ib.store_id = $2
  `
  const result = await pool.query<Record<string, unknown>>(fetchSql, [newBatchId, storeId])

  if (result.rowCount === 0) {
    throw new AppError('Failed to retrieve inserted batch', 500)
  }

  return rowToBatchDetail(result.rows[0])
}

// ── 3. updateBatch ────────────────────────────────────────────────────────────

export type BatchAction = 'close' | 'adjust' | 'defective'

export async function updateBatch(
  storeId: number,
  batchId: number,
  action: BatchAction,
  payload?: { quantity?: number },
): Promise<InventoryBatchDetail> {
  let updateSql: string
  const params: unknown[] = [batchId, storeId]

  if (action === 'close') {
    updateSql = `
      UPDATE inventory_batches
      SET quantity_remaining = 0, updated_at = NOW()
      WHERE id = $1 AND store_id = $2
    `
  } else if (action === 'adjust') {
    if (payload?.quantity == null || payload.quantity < 0) {
      throw new AppError('quantity is required and must be >= 0 for adjust action', 400, 'VALIDATION_ERROR')
    }
    params.push(payload.quantity)
    updateSql = `
      UPDATE inventory_batches
      SET quantity_remaining = $3, updated_at = NOW()
      WHERE id = $1 AND store_id = $2
    `
  } else {
    // defective
    updateSql = `
      UPDATE inventory_batches
      SET notes = COALESCE(notes || ' [DEFECTIVE]', '[DEFECTIVE]'), updated_at = NOW()
      WHERE id = $1 AND store_id = $2
    `
  }

  const updateResult = await pool.query(updateSql, params)
  if (updateResult.rowCount === 0) {
    throw new AppError('Inventory batch not found', 404, 'NOT_FOUND')
  }

  const fetchSql = `
    ${BASE_SELECT}
    WHERE ib.id = $1 AND ib.store_id = $2
  `
  const result = await pool.query<Record<string, unknown>>(fetchSql, [batchId, storeId])

  if (result.rowCount === 0) {
    throw new AppError('Inventory batch not found', 404, 'NOT_FOUND')
  }

  return rowToBatchDetail(result.rows[0])
}

// ── 4. getMatrix ──────────────────────────────────────────────────────────────

export async function getMatrix(storeId: number): Promise<MatrixRow[]> {
  const sql = `
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      pb.price,
      COALESCE(SUM(ib.quantity_remaining), 0)::INT AS total_stock
    FROM categories c
    JOIN price_bands pb ON pb.category_id = c.id AND pb.store_id = c.store_id
    LEFT JOIN inventory_batches ib ON ib.price_band_id = pb.id AND ib.store_id = c.store_id
    WHERE c.store_id = $1 AND pb.is_active = TRUE
    GROUP BY c.id, c.name, pb.price
    ORDER BY c.name, pb.price
  `

  const result = await pool.query<Record<string, unknown>>(sql, [storeId])

  const map = new Map<number, MatrixRow>()
  for (const row of result.rows) {
    const categoryId = row.category_id as number
    if (!map.has(categoryId)) {
      map.set(categoryId, {
        categoryId,
        categoryName: row.category_name as string,
        bands: {},
      })
    }
    // pg returns NUMERIC as a string ("299.00"); the matrix view keys by
    // canonical integer-ish price so the frontend lookup matches.
    const priceKey = String(Number(row.price))
    map.get(categoryId)!.bands[priceKey] = row.total_stock as number
  }

  return [...map.values()]
}
