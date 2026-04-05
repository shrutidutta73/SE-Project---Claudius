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
    pool.query<WeeklyTotalsRow>(
      `SELECT
        COALESCE(SUM(total_revenue), 0)::FLOAT AS total_revenue,
        COALESCE(SUM(total_qty_sold), 0)::INT AS units_sold
      FROM daily_sales_summary
      WHERE store_id = $1 AND date >= CURRENT_DATE - INTERVAL '6 days'`,
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

  const interval = range === 'weekly' ? '6 days' : '29 days'

  const result = await pool.query<DailySummaryRow>(
    `SELECT id, store_id, date, price_band_id, category_name, band_price,
      total_qty_sold, total_revenue, total_returns, total_refunds
    FROM daily_sales_summary
    WHERE store_id = $1 AND date >= CURRENT_DATE - INTERVAL '${interval}'
    ORDER BY date ASC, category_name, band_price`,
    [storeId],
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
