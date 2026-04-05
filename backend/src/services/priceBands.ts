import pool from '../pool'
import { AppError } from '../errors/AppError'

export interface PriceBand {
  id: number
  storeId: number
  categoryId: number
  price: number
  isActive: boolean
  createdAt: string
}

export interface PriceBandWithStock extends PriceBand {
  categoryName: string
  totalStock: number
}

function rowToPriceBand(row: Record<string, unknown>): PriceBand {
  return {
    id: row.id as number,
    storeId: row.store_id as number,
    categoryId: row.category_id as number,
    price: parseFloat(row.price as string),
    isActive: row.is_active as boolean,
    createdAt: (row.created_at as Date).toISOString(),
  }
}

function rowToPriceBandWithStock(row: Record<string, unknown>): PriceBandWithStock {
  return {
    ...rowToPriceBand(row),
    categoryName: row.category_name as string,
    totalStock: row.total_stock as number,
  }
}

export async function listPriceBands(storeId: number): Promise<PriceBand[]> {
  const result = await pool.query<Record<string, unknown>>(
    'SELECT * FROM price_bands WHERE store_id=$1 AND is_active=TRUE ORDER BY category_id, price',
    [storeId],
  )
  return result.rows.map(rowToPriceBand)
}

export async function listPriceBandsWithStock(storeId: number): Promise<PriceBandWithStock[]> {
  const sql = `
    SELECT
      pb.id,
      pb.store_id,
      pb.category_id,
      pb.price,
      pb.is_active,
      pb.created_at,
      c.name AS category_name,
      COALESCE(SUM(ib.quantity_remaining), 0)::INT AS total_stock
    FROM price_bands pb
    JOIN categories c ON c.id = pb.category_id
    LEFT JOIN inventory_batches ib ON ib.price_band_id = pb.id AND ib.store_id = pb.store_id
    WHERE pb.store_id = $1 AND pb.is_active = TRUE
    GROUP BY pb.id, pb.store_id, pb.category_id, pb.price, pb.is_active, pb.created_at, c.name
    ORDER BY c.name, pb.price
  `
  const result = await pool.query<Record<string, unknown>>(sql, [storeId])
  return result.rows.map(rowToPriceBandWithStock)
}

export async function createPriceBand(
  storeId: number,
  data: { categoryId: number; price: number },
): Promise<PriceBand> {
  // Verify the category belongs to this store
  const catCheck = await pool.query(
    'SELECT id FROM categories WHERE id=$1 AND store_id=$2',
    [data.categoryId, storeId],
  )
  if (catCheck.rowCount === 0) {
    throw new AppError('Category not found in this store', 404)
  }

  const result = await pool.query<Record<string, unknown>>(
    'INSERT INTO price_bands (store_id, category_id, price) VALUES ($1, $2, $3) RETURNING *',
    [storeId, data.categoryId, data.price],
  )
  return rowToPriceBand(result.rows[0])
}
