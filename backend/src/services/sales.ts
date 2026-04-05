import pool from '../pool'
import { AppError } from '../errors/AppError'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  priceBandId: number // 0 = custom item (no band, no batch deduction)
  categoryName: string
  price: number
  quantity: number
  subtotal: number
}

export interface CreateSaleInput {
  items: CartItem[]
  customerName?: string
  customerPhone?: string
  paymentMethod: 'cash' | 'upi' | 'store_credit'
  discountAmount?: number
}

export interface CreateSaleResult {
  id: number
  createdAt: string
}

// ── createSale ────────────────────────────────────────────────────────────────

export async function createSale(
  storeId: number,
  staffId: number,
  input: CreateSaleInput,
): Promise<CreateSaleResult> {
  const { items, customerName, customerPhone, paymentMethod, discountAmount = 0 } = input

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // ── Step 1: Customer upsert ───────────────────────────────────────────────
    let customerId: number | null = null
    if (customerPhone) {
      const customerResult = await client.query<{ id: number }>(
        `INSERT INTO customers (store_id, name, phone)
         VALUES ($1, $2, $3)
         ON CONFLICT (store_id, phone) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [storeId, customerName ?? null, customerPhone],
      )
      customerId = customerResult.rows[0].id
    }

    // ── Step 2: FIFO batch deduction for non-custom items ─────────────────────
    // Map: priceBandId -> usedBatches (only for items that require deduction)
    // For items with the same priceBandId we process them together
    const itemBatchMap = new Map<
      number,
      Map<number, Array<{ batchId: number; qty: number }>>
    >()
    // itemBatchMap[itemIndex] -> usedBatches
    const perItemBatches: Array<Array<{ batchId: number; qty: number }>> = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.priceBandId === 0) {
        perItemBatches.push([]) // custom item — no batch deduction
        continue
      }

      const batchResult = await client.query<{ id: number; quantity_remaining: number }>(
        `SELECT id, quantity_remaining
         FROM inventory_batches
         WHERE store_id = $1 AND price_band_id = $2 AND quantity_remaining > 0
         ORDER BY created_at ASC
         FOR UPDATE`,
        [storeId, item.priceBandId],
      )
      const batches = batchResult.rows

      let remaining = item.quantity
      const usedBatches: { batchId: number; qty: number }[] = []

      for (const batch of batches) {
        if (remaining <= 0) break
        const take = Math.min(remaining, batch.quantity_remaining)
        usedBatches.push({ batchId: batch.id, qty: take })
        remaining -= take
      }

      if (remaining > 0) {
        throw new AppError(`Insufficient stock for ${item.categoryName}`, 400)
      }

      for (const { batchId, qty } of usedBatches) {
        await client.query(
          'UPDATE inventory_batches SET quantity_remaining = quantity_remaining - $1, updated_at = NOW() WHERE id = $2',
          [qty, batchId],
        )
      }

      perItemBatches.push(usedBatches)
    }

    // ── Step 3: Get store billing mode ────────────────────────────────────────
    const storeResult = await client.query<{ billing_mode: string; retention_days: number }>(
      'SELECT billing_mode, retention_days FROM stores WHERE id = $1',
      [storeId],
    )
    if (!storeResult.rows[0]) {
      throw new AppError('Store not found', 404)
    }
    const { billing_mode: billingMode, retention_days: retentionDays } = storeResult.rows[0]

    // ── Step 4: Insert sale ───────────────────────────────────────────────────
    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0) - discountAmount
    const isEphemeral = billingMode === 'ephemeral'
    const expiresAt = isEphemeral
      ? new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000)
      : null

    const saleResult = await client.query<{ id: number; created_at: Date }>(
      `INSERT INTO sales (store_id, customer_id, staff_id, total_amount, discount_amount, payment_method, is_ephemeral, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, created_at`,
      [storeId, customerId, staffId, totalAmount, discountAmount, paymentMethod, isEphemeral, expiresAt],
    )
    const saleId = saleResult.rows[0].id
    const createdAt = saleResult.rows[0].created_at

    // ── Step 5: Insert sale_items ─────────────────────────────────────────────
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const usedBatches = perItemBatches[i]
      const priceBandId = item.priceBandId === 0 ? null : item.priceBandId

      if (item.priceBandId === 0 || usedBatches.length === 0) {
        // Custom item or band item with no batch (shouldn't happen after FIFO check, but safe fallback)
        await client.query(
          `INSERT INTO sale_items (sale_id, price_band_id, inventory_batch_id, category_name, price, quantity, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [saleId, priceBandId, null, item.categoryName, item.price, item.quantity, item.subtotal],
        )
      } else {
        for (const { batchId, qty } of usedBatches) {
          const batchSubtotal = parseFloat(((qty / item.quantity) * item.subtotal).toFixed(2))
          await client.query(
            `INSERT INTO sale_items (sale_id, price_band_id, inventory_batch_id, category_name, price, quantity, subtotal)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [saleId, priceBandId, batchId, item.categoryName, item.price, qty, batchSubtotal],
          )
        }
      }
    }

    // ── Step 6: Upsert daily_sales_summary for non-custom items ───────────────
    for (const item of items) {
      if (item.priceBandId === 0) continue

      await client.query(
        `INSERT INTO daily_sales_summary (store_id, date, price_band_id, category_name, band_price, total_qty_sold, total_revenue)
         VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)
         ON CONFLICT (store_id, date, price_band_id)
         DO UPDATE SET
           total_qty_sold = daily_sales_summary.total_qty_sold + EXCLUDED.total_qty_sold,
           total_revenue = daily_sales_summary.total_revenue + EXCLUDED.total_revenue`,
        [storeId, item.priceBandId, item.categoryName, item.price, item.quantity, item.subtotal],
      )
    }

    // ── Step 7: COMMIT ────────────────────────────────────────────────────────
    await client.query('COMMIT')

    return { id: saleId, createdAt: createdAt.toISOString() }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
