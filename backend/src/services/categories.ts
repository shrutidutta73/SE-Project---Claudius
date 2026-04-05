import pool from '../pool'
import { AppError } from '../errors/AppError'

export interface Category {
  id: number
  storeId: number
  name: string
  createdAt: string
}

function rowToCategory(row: Record<string, unknown>): Category {
  return {
    id: row.id as number,
    storeId: row.store_id as number,
    name: row.name as string,
    createdAt: (row.created_at as Date).toISOString(),
  }
}

export async function listCategories(storeId: number): Promise<Category[]> {
  const result = await pool.query<Record<string, unknown>>(
    'SELECT id, store_id, name, created_at FROM categories WHERE store_id=$1 ORDER BY name',
    [storeId],
  )
  return result.rows.map(rowToCategory)
}

export async function createCategory(storeId: number, name: string): Promise<Category> {
  try {
    const result = await pool.query<Record<string, unknown>>(
      'INSERT INTO categories (store_id, name) VALUES ($1, $2) RETURNING *',
      [storeId, name],
    )
    return rowToCategory(result.rows[0])
  } catch (err: unknown) {
    const pgErr = err as { code?: string }
    if (pgErr.code === '23505') {
      throw new AppError(`Category '${name}' already exists in this store`, 409)
    }
    throw err
  }
}
