import pool from '../pool'
import { AppError } from '../errors/AppError'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ReturnItem {
  saleItemId: number
  quantity: number
}

export interface CreateReturnInput {
  saleId: number
  type: 'return' | 'exchange'
  items: ReturnItem[]
}

export interface CreateReturnResult {
  id: number
  createdAt: string
}

export interface ReturnRecord {
  id: number
  storeId: number
  saleId: number
  staffId: number
  type: 'return' | 'exchange'
  createdAt: string
}

// ── createReturn ──────────────────────────────────────────────────────────────

export async function createReturn(
  storeId: number,
  staffId: number,
  data: CreateReturnInput,
): Promise<CreateReturnResult> {
  const { saleId, type, items } = data

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // a. Verify sale belongs to storeId
    const saleResult = await client.query<{ id: number }>(
      `SELECT id FROM sales WHERE id = $1 AND store_id = $2`,
      [saleId, storeId],
    )
    if (!saleResult.rows[0]) {
      throw new AppError('Sale not found', 404)
    }

    // b. Verify each sale_item and validate quantity
    const saleItemRows: Array<{
      id: number
      price_band_id: number | null
      inventory_batch_id: number | null
      quantity: number
      price: number
    }> = []

    for (const item of items) {
      const itemResult = await client.query<{
        id: number
        price_band_id: number | null
        inventory_batch_id: number | null
        quantity: number
        price: number
      }>(
        `SELECT id, price_band_id, inventory_batch_id, quantity, price
         FROM sale_items
         WHERE id = $1 AND sale_id = $2`,
        [item.saleItemId, saleId],
      )

      const row = itemResult.rows[0]
      if (!row) {
        throw new AppError(`Sale item ${item.saleItemId} not found on this sale`, 404)
      }
      if (item.quantity > row.quantity) {
        throw new AppError(
          `Return quantity (${item.quantity}) exceeds original quantity (${row.quantity}) for sale item ${item.saleItemId}`,
          400,
        )
      }

      saleItemRows.push(row)
    }

    // c. INSERT INTO returns
    const returnResult = await client.query<{ id: number; created_at: Date }>(
      `INSERT INTO returns (store_id, sale_id, staff_id, type)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [storeId, saleId, staffId, type],
    )
    const returnId = returnResult.rows[0].id
    const createdAt = returnResult.rows[0].created_at

    // d. Process each return item
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const row = saleItemRows[i]

      // INSERT return_items
      await client.query(
        `INSERT INTO return_items (return_id, sale_item_id, quantity, inventory_batch_id)
         VALUES ($1, $2, $3, $4)`,
        [returnId, item.saleItemId, item.quantity, row.inventory_batch_id],
      )

      // Restore stock if batch is tracked
      if (row.inventory_batch_id !== null) {
        await client.query(
          `UPDATE inventory_batches
           SET quantity_remaining = quantity_remaining + $1,
               updated_at = NOW()
           WHERE id = $2`,
          [item.quantity, row.inventory_batch_id],
        )
      }

      // Update daily_sales_summary total_returns and total_refunds
      // Only meaningful for band items (price_band_id not null)
      if (row.price_band_id !== null) {
        await client.query(
          `INSERT INTO daily_sales_summary
             (store_id, date, price_band_id, category_name, band_price,
              total_qty_sold, total_revenue, total_returns, total_refunds)
           SELECT $3, CURRENT_DATE, price_band_id, category_name, price,
                  0, 0, $1::int, ($1::numeric * price)
           FROM sale_items
           WHERE id = $2
           ON CONFLICT (store_id, date, price_band_id) DO UPDATE SET
             total_returns = daily_sales_summary.total_returns + EXCLUDED.total_returns,
             total_refunds = daily_sales_summary.total_refunds + EXCLUDED.total_refunds`,
          [item.quantity, item.saleItemId, storeId],
        )
      }
    }

    await client.query('COMMIT')

    return { id: returnId, createdAt: createdAt.toISOString() }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// ── listReturns ───────────────────────────────────────────────────────────────

export async function listReturns(storeId: number): Promise<ReturnRecord[]> {
  const result = await pool.query<{
    id: number
    store_id: number
    sale_id: number
    staff_id: number
    type: 'return' | 'exchange'
    created_at: Date
  }>(
    `SELECT r.id, r.store_id, r.sale_id, r.staff_id, r.type, r.created_at
     FROM returns r
     WHERE r.store_id = $1
     ORDER BY r.created_at DESC
     LIMIT 100`,
    [storeId],
  )

  return result.rows.map((row) => ({
    id: row.id,
    storeId: row.store_id,
    saleId: row.sale_id,
    staffId: row.staff_id,
    type: row.type,
    createdAt: row.created_at.toISOString(),
  }))
}
