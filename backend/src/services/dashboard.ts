import pool from '../pool'
import { AppError } from '../errors/AppError'

interface WeeklyTotalsRow {
  total_revenue: number
  units_sold: number
}

interface TopBandRow {
  price_band_id: number
  category_name: string
  band_price: number
  revenue: number
}

interface AgingBatchRow {
  aging_batch_count: number
}

interface ActiveVendorsRow {
  active_vendors: number
}

interface DailySummaryRow {
  id: number
  store_id: number
  date: Date
  price_band_id: number
  category_name: string
  band_price: number
  total_qty_sold: number
  total_revenue: number
  total_returns: number
  total_refunds: number
}

export async function getSummary(storeId: number) {
  const [totalsResult, topBandResult, agingResult, vendorsResult] = await Promise.all([
    // Totals come from sale_items so both price-band sales and custom-priced
    // sales are counted. daily_sales_summary only carries band rows.
    pool.query<WeeklyTotalsRow>(
      `SELECT
        COALESCE(SUM(si.subtotal), 0)::FLOAT AS total_revenue,
        COALESCE(SUM(si.quantity), 0)::INT   AS units_sold
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.store_id = $1 AND s.created_at >= CURRENT_DATE - INTERVAL '6 days'`,
      [storeId],
    ),
    pool.query<TopBandRow>(
      `SELECT price_band_id, category_name, band_price, SUM(total_revenue) AS revenue
      FROM daily_sales_summary
      WHERE store_id = $1 AND date >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY price_band_id, category_name, band_price
      ORDER BY revenue DESC
      LIMIT 1`,
      [storeId],
    ),
    pool.query<AgingBatchRow>(
      `SELECT COUNT(*)::INT AS aging_batch_count
      FROM inventory_batches
      WHERE store_id = $1 AND quantity_remaining > 0 AND created_at < NOW() - INTERVAL '60 days'`,
      [storeId],
    ),
    pool.query<ActiveVendorsRow>(
      `SELECT COUNT(*)::INT AS active_vendors FROM vendors WHERE store_id = $1 AND is_active = TRUE`,
      [storeId],
    ),
  ])

  const totals = totalsResult.rows[0]
  const topBandRow = topBandResult.rows[0] ?? null
  const aging = agingResult.rows[0]
  const vendors = vendorsResult.rows[0]

  return {
    totalRevenue: totals.total_revenue,
    unitsSold: totals.units_sold,
    topBand: topBandRow
      ? {
          priceBandId: topBandRow.price_band_id,
          categoryName: topBandRow.category_name,
          bandPrice: Number(topBandRow.band_price),
          revenue: Number(topBandRow.revenue),
        }
      : null,
    agingBatchCount: aging.aging_batch_count,
    activeVendors: vendors.active_vendors,
  }
}

export async function getDailySummary(storeId: number, range: 'weekly' | 'monthly') {
  if (range !== 'weekly' && range !== 'monthly') {
    throw new AppError('Invalid range. Must be "weekly" or "monthly"', 400)
  }

  const days = range === 'weekly' ? 6 : 29

  // Per-band rows come from daily_sales_summary; custom-priced sales are
  // aggregated separately from sale_items (one synthetic row per day with
  // priceBandId=0, bandPrice=0 so the frontend can distinguish them).
  const result = await pool.query<DailySummaryRow>(
    `SELECT id, store_id, date, price_band_id, category_name, band_price,
           total_qty_sold, total_revenue, total_returns, total_refunds
    FROM daily_sales_summary
    WHERE store_id = $1 AND date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
    UNION ALL
    SELECT
      0 AS id,
      s.store_id,
      DATE(s.created_at) AS date,
      0 AS price_band_id,
      'Custom' AS category_name,
      0 AS band_price,
      SUM(si.quantity)::INT AS total_qty_sold,
      SUM(si.subtotal) AS total_revenue,
      0 AS total_returns,
      0 AS total_refunds
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE s.store_id = $1
      AND s.created_at >= CURRENT_DATE - ($2 || ' days')::INTERVAL
      AND si.price_band_id IS NULL
    GROUP BY s.store_id, DATE(s.created_at)
    ORDER BY date ASC, category_name, band_price`,
    [storeId, days],
  )

  return result.rows.map((row) => ({
    id: row.id,
    storeId: row.store_id,
    date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date),
    priceBandId: row.price_band_id,
    categoryName: row.category_name,
    bandPrice: Number(row.band_price),
    totalQtySold: row.total_qty_sold,
    totalRevenue: Number(row.total_revenue),
    totalReturns: Number(row.total_returns),
    totalRefunds: Number(row.total_refunds),
  }))
}
