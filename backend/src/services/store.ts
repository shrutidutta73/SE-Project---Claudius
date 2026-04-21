import pool from '../pool'
import { AppError } from '../errors/AppError'

interface StoreRow {
  id: number
  name: string
  address: string | null
  logo: string | null
  owner_id: number
  billing_mode: string
  retention_days: number | null
  gps_latitude: number | null
  gps_longitude: number | null
  gps_radius_m: number | null
  gps_require_clock_in: boolean
  gps_require_clock_out: boolean
  created_at: Date
  updated_at: Date
}

function mapStore(row: StoreRow) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    logo: row.logo,
    ownerId: row.owner_id,
    billingMode: row.billing_mode,
    retentionDays: row.retention_days,
    gpsLatitude: row.gps_latitude,
    gpsLongitude: row.gps_longitude,
    gpsRadiusM: row.gps_radius_m,
    gpsRequireClockIn: row.gps_require_clock_in,
    gpsRequireClockOut: row.gps_require_clock_out,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const VALID_RETENTION_DAYS = [7, 14, 30, 90]

export async function getStore(storeId: number) {
  const result = await pool.query<StoreRow>(
    'SELECT * FROM stores WHERE id = $1',
    [storeId],
  )
  if (result.rows.length === 0) {
    throw new AppError('Store not found', 404)
  }
  return mapStore(result.rows[0])
}

export async function updateStore(
  storeId: number,
  data: { name?: string; address?: string; logo?: string },
) {
  // Build dynamic SET clause from provided fields only
  const fields: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (data.name !== undefined) {
    fields.push(`name = $${idx++}`)
    values.push(data.name)
  }
  if (data.address !== undefined) {
    fields.push(`address = $${idx++}`)
    values.push(data.address)
  }
  if (data.logo !== undefined) {
    fields.push(`logo = $${idx++}`)
    values.push(data.logo)
  }

  if (fields.length === 0) {
    // Nothing to update — just return existing store
    return getStore(storeId)
  }

  fields.push(`updated_at = NOW()`)
  values.push(storeId)

  const query = `UPDATE stores SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`
  const result = await pool.query<StoreRow>(query, values)

  if (result.rows.length === 0) {
    throw new AppError('Store not found', 404)
  }
  return mapStore(result.rows[0])
}

export async function updateBillingMode(
  storeId: number,
  billingMode: 'structured' | 'ephemeral',
  opts: { retentionDays?: number; backdate?: boolean } = {},
) {
  if (billingMode !== 'structured' && billingMode !== 'ephemeral') {
    throw new AppError('Invalid billing mode. Must be "structured" or "ephemeral"', 400)
  }
  if (opts.retentionDays !== undefined && !VALID_RETENTION_DAYS.includes(opts.retentionDays)) {
    throw new AppError(
      `Invalid retention days. Must be one of: ${VALID_RETENTION_DAYS.join(', ')}`,
      400,
    )
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Update the store's billing mode (and retention when going ephemeral).
    // Structured always clears retention_days; ephemeral sets it only if the
    // caller provided one, otherwise the existing value is kept.
    let storeResult
    if (billingMode === 'structured') {
      storeResult = await client.query<StoreRow>(
        `UPDATE stores SET billing_mode = $1, retention_days = NULL, updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [billingMode, storeId],
      )
    } else if (opts.retentionDays !== undefined) {
      storeResult = await client.query<StoreRow>(
        `UPDATE stores SET billing_mode = $1, retention_days = $2, updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [billingMode, opts.retentionDays, storeId],
      )
    } else {
      storeResult = await client.query<StoreRow>(
        `UPDATE stores SET billing_mode = $1, updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [billingMode, storeId],
      )
    }
    if (storeResult.rows.length === 0) {
      throw new AppError('Store not found', 404)
    }
    const store = storeResult.rows[0]

    // Optional retroactive flip of historical sales. Owner-only flow so this
    // is opt-in and irreversible in the current session — the audit log
    // trail preserves record counts before and after a data wipe regardless.
    if (opts.backdate) {
      if (billingMode === 'ephemeral') {
        const days = opts.retentionDays ?? store.retention_days
        if (!days) {
          throw new AppError(
            'Retention days must be known to backdate to ephemeral',
            400,
          )
        }
        await client.query(
          `UPDATE sales
           SET is_ephemeral = TRUE,
               expires_at   = created_at + ($1::int || ' days')::INTERVAL
           WHERE store_id = $2`,
          [days, storeId],
        )
      } else {
        await client.query(
          `UPDATE sales
           SET is_ephemeral = FALSE, expires_at = NULL
           WHERE store_id = $1`,
          [storeId],
        )
      }
    }

    await client.query('COMMIT')
    return mapStore(store)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function updateRetention(
  storeId: number,
  retentionDays: number | null,
) {
  if (retentionDays !== null && !VALID_RETENTION_DAYS.includes(retentionDays)) {
    throw new AppError(
      `Invalid retention days. Must be one of: ${VALID_RETENTION_DAYS.join(', ')} or null`,
      400,
    )
  }

  const result = await pool.query<StoreRow>(
    'UPDATE stores SET retention_days = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [retentionDays, storeId],
  )

  if (result.rows.length === 0) {
    throw new AppError('Store not found', 404)
  }
  return mapStore(result.rows[0])
}

export async function updateGpsSettings(
  storeId: number,
  data: {
    gpsLatitude: number
    gpsLongitude: number
    gpsRadiusM: number
    gpsRequireClockIn: boolean
    gpsRequireClockOut: boolean
  },
) {
  const { gpsLatitude, gpsLongitude, gpsRadiusM, gpsRequireClockIn, gpsRequireClockOut } = data

  if (
    typeof gpsLatitude !== 'number' ||
    !isFinite(gpsLatitude) ||
    gpsLatitude < -90 ||
    gpsLatitude > 90
  ) {
    throw new AppError('Invalid GPS latitude. Must be a number between -90 and 90', 400)
  }

  if (
    typeof gpsLongitude !== 'number' ||
    !isFinite(gpsLongitude) ||
    gpsLongitude < -180 ||
    gpsLongitude > 180
  ) {
    throw new AppError('Invalid GPS longitude. Must be a number between -180 and 180', 400)
  }

  if (typeof gpsRadiusM !== 'number' || !isFinite(gpsRadiusM) || gpsRadiusM <= 0) {
    throw new AppError('Invalid GPS radius. Must be a positive number', 400)
  }

  const result = await pool.query<StoreRow>(
    `UPDATE stores
     SET gps_latitude = $1, gps_longitude = $2, gps_radius_m = $3,
         gps_require_clock_in = $4, gps_require_clock_out = $5,
         updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [gpsLatitude, gpsLongitude, gpsRadiusM, gpsRequireClockIn, gpsRequireClockOut, storeId],
  )

  if (result.rows.length === 0) {
    throw new AppError('Store not found', 404)
  }
  return mapStore(result.rows[0])
}
