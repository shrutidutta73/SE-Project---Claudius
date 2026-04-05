import pool from '../pool'
import { AppError } from '../errors/AppError'

// ── Types ────────────────────────────────────────────────────────────────────

export type ReorderStatus = 'draft' | 'sent' | 'acknowledged' | 'fulfilled'

export interface ReorderItem {
  id: number
  reorderId: number
  priceBandId: number
  categoryName: string
  bandPrice: number
  suggestedQty: number
  finalQty: number
}

export interface Reorder {
  id: number
  storeId: number
  vendorId: number
  vendorName: string
  createdBy: number
  status: ReorderStatus
  messageText: string | null
  createdAt: string
  sentAt: string | null
  items: ReorderItem[]
}

export interface CreateReorderItemInput {
  priceBandId: number
  categoryName: string
  bandPrice: number
  suggestedQty: number
  finalQty: number
}

export interface CreateReorderInput {
  vendorId: number
  items: CreateReorderItemInput[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToReorderItem(row: Record<string, any>): ReorderItem {
  return {
    id: row.id,
    reorderId: row.reorder_id,
    priceBandId: row.price_band_id,
    categoryName: row.category_name,
    bandPrice: Number(row.band_price),
    suggestedQty: row.suggested_qty,
    finalQty: row.final_qty,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToReorder(row: Record<string, any>, items: ReorderItem[]): Reorder {
  return {
    id: row.id,
    storeId: row.store_id,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name,
    createdBy: row.created_by,
    status: row.status as ReorderStatus,
    messageText: row.message_text ?? null,
    createdAt: (row.created_at as Date).toISOString(),
    sentAt: row.sent_at ? (row.sent_at as Date).toISOString() : null,
    items,
  }
}

// ── buildMessage ──────────────────────────────────────────────────────────────

function buildMessage(
  vendorName: string,
  items: { finalQty: number; categoryName: string; bandPrice: number }[],
): string {
  const lines = items
    .filter(i => i.finalQty > 0)
    .map(i => `${i.finalQty}x ${i.categoryName} ₹${i.bandPrice}`)
    .join(', ')
  return `Hi ${vendorName}, please send: ${lines}. Please confirm.`
}

// ── createReorder ─────────────────────────────────────────────────────────────

export async function createReorder(
  storeId: number,
  createdBy: number,
  data: CreateReorderInput,
): Promise<Reorder> {
  const { vendorId, items } = data

  // Get vendor name
  const vendorResult = await pool.query<{ name: string }>(
    'SELECT name FROM vendors WHERE id = $1 AND store_id = $2',
    [vendorId, storeId],
  )
  if (!vendorResult.rows[0]) {
    throw new AppError('Vendor not found', 404, 'NOT_FOUND')
  }
  const vendorName = vendorResult.rows[0].name

  // Only include items with finalQty > 0
  const activeItems = items.filter(i => i.finalQty > 0)
  const messageText = buildMessage(vendorName, items)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Insert reorder
    const reorderResult = await client.query(
      `INSERT INTO reorders (store_id, vendor_id, created_by, status, message_text, created_at, sent_at)
       VALUES ($1, $2, $3, 'sent', $4, NOW(), NOW())
       RETURNING *`,
      [storeId, vendorId, createdBy, messageText],
    )
    const reorderRow = reorderResult.rows[0]
    const reorderId: number = reorderRow.id

    // Insert reorder_items for each item with finalQty > 0
    const insertedItems: ReorderItem[] = []
    for (const item of activeItems) {
      const itemResult = await client.query(
        `INSERT INTO reorder_items (reorder_id, price_band_id, category_name, band_price, suggested_qty, final_qty)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [reorderId, item.priceBandId, item.categoryName, item.bandPrice, item.suggestedQty, item.finalQty],
      )
      insertedItems.push(rowToReorderItem(itemResult.rows[0]))
    }

    await client.query('COMMIT')

    return rowToReorder({ ...reorderRow, vendor_name: vendorName }, insertedItems)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// ── listReorders ──────────────────────────────────────────────────────────────

export async function listReorders(storeId: number): Promise<Reorder[]> {
  const reorderResult = await pool.query(
    `SELECT r.*, v.name AS vendor_name
     FROM reorders r
     JOIN vendors v ON v.id = r.vendor_id
     WHERE r.store_id = $1
     ORDER BY r.created_at DESC`,
    [storeId],
  )

  if (reorderResult.rows.length === 0) return []

  const reorderIds: number[] = reorderResult.rows.map(r => r.id)

  const itemsResult = await pool.query(
    'SELECT * FROM reorder_items WHERE reorder_id = ANY($1)',
    [reorderIds],
  )

  // Group items by reorder_id in JS
  const itemsByReorder = new Map<number, ReorderItem[]>()
  for (const row of itemsResult.rows) {
    const rid: number = row.reorder_id
    if (!itemsByReorder.has(rid)) itemsByReorder.set(rid, [])
    itemsByReorder.get(rid)!.push(rowToReorderItem(row))
  }

  return reorderResult.rows.map(row =>
    rowToReorder(row, itemsByReorder.get(row.id) ?? []),
  )
}

// ── updateReorderStatus ───────────────────────────────────────────────────────

export async function updateReorderStatus(
  storeId: number,
  reorderId: number,
  status: ReorderStatus,
): Promise<Reorder> {
  const result = await pool.query(
    `UPDATE reorders SET status = $1
     WHERE id = $2 AND store_id = $3
     RETURNING *`,
    [status, reorderId, storeId],
  )

  if (result.rowCount === 0) {
    throw new AppError('Reorder not found', 404, 'NOT_FOUND')
  }

  const reorderRow = result.rows[0]

  // Fetch vendor name
  const vendorResult = await pool.query<{ name: string }>(
    'SELECT name FROM vendors WHERE id = $1',
    [reorderRow.vendor_id],
  )
  const vendorName = vendorResult.rows[0]?.name ?? ''

  // Fetch items
  const itemsResult = await pool.query(
    'SELECT * FROM reorder_items WHERE reorder_id = $1',
    [reorderId],
  )

  return rowToReorder(
    { ...reorderRow, vendor_name: vendorName },
    itemsResult.rows.map(rowToReorderItem),
  )
}
