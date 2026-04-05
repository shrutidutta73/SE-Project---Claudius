import pool from '../pool'
import { AppError } from '../errors/AppError'

// ── Haversine ─────────────────────────────────────────────────────────────────

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface GpsData {
  lat: number
  lng: number
}

interface StoreGps {
  gps_latitude: number | null
  gps_longitude: number | null
  gps_radius_m: number | null
  gps_require_clock_in: boolean
  gps_require_clock_out: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getStoreGps(storeId: number): Promise<StoreGps> {
  const result = await pool.query<StoreGps>(
    `SELECT gps_latitude, gps_longitude, gps_radius_m,
            gps_require_clock_in, gps_require_clock_out
     FROM stores WHERE id = $1`,
    [storeId],
  )
  if (!result.rows[0]) throw new AppError('Store not found', 404)
  return result.rows[0]
}

function validateGpsRadius(store: StoreGps, lat: number, lng: number): void {
  if (
    store.gps_latitude === null ||
    store.gps_longitude === null ||
    store.gps_radius_m === null
  ) {
    // GPS coordinates not configured on store — skip validation
    return
  }
  const distance = haversineM(lat, lng, store.gps_latitude, store.gps_longitude)
  if (distance > store.gps_radius_m) {
    throw new AppError('Outside store GPS radius', 400)
  }
}

// ── clockIn ───────────────────────────────────────────────────────────────────

export interface ClockInResult {
  clockedIn: true
  checkInAt: string
}

export async function clockIn(
  storeId: number,
  userId: number,
  data: GpsData,
): Promise<ClockInResult> {
  const { lat, lng } = data

  const store = await getStoreGps(storeId)

  if (store.gps_require_clock_in) {
    validateGpsRadius(store, lat, lng)
  }

  // Check not already clocked in today
  const existing = await pool.query<{ id: number }>(
    `SELECT id FROM attendance
     WHERE store_id = $1 AND user_id = $2 AND date = CURRENT_DATE AND check_out_at IS NULL`,
    [storeId, userId],
  )
  if (existing.rowCount && existing.rowCount > 0) {
    throw new AppError('Already clocked in today', 400)
  }

  const result = await pool.query<{ check_in_at: Date }>(
    `INSERT INTO attendance (store_id, user_id, date, check_in_at, check_in_lat, check_in_lng)
     VALUES ($1, $2, CURRENT_DATE, NOW(), $3, $4)
     ON CONFLICT (store_id, user_id, date) DO NOTHING
     RETURNING check_in_at`,
    [storeId, userId, lat, lng],
  )

  if (!result.rows[0]) {
    // Conflict hit — already clocked in (race condition safety)
    throw new AppError('Already clocked in today', 400)
  }

  return { clockedIn: true, checkInAt: result.rows[0].check_in_at.toISOString() }
}

// ── clockOut ──────────────────────────────────────────────────────────────────

export interface ClockOutResult {
  clockedIn: false
  checkOutAt: string
}

export async function clockOut(
  storeId: number,
  userId: number,
  data: GpsData,
): Promise<ClockOutResult> {
  const { lat, lng } = data

  const store = await getStoreGps(storeId)

  if (store.gps_require_clock_out) {
    validateGpsRadius(store, lat, lng)
  }

  // Find today's open attendance
  const existing = await pool.query<{ id: number }>(
    `SELECT id FROM attendance
     WHERE store_id = $1 AND user_id = $2 AND date = CURRENT_DATE AND check_out_at IS NULL`,
    [storeId, userId],
  )
  if (!existing.rows[0]) {
    throw new AppError('Not clocked in', 400)
  }
  const attendanceId = existing.rows[0].id

  const result = await pool.query<{ check_out_at: Date }>(
    `UPDATE attendance
     SET check_out_at = NOW(), check_out_lat = $1, check_out_lng = $2
     WHERE id = $3
     RETURNING check_out_at`,
    [lat, lng, attendanceId],
  )

  return { clockedIn: false, checkOutAt: result.rows[0].check_out_at.toISOString() }
}

// ── forceClockOut ─────────────────────────────────────────────────────────────

export interface ForceClockOutResult {
  success: true
}

export async function forceClockOut(
  storeId: number,
  targetUserId: number,
): Promise<ForceClockOutResult> {
  await pool.query(
    `UPDATE attendance
     SET check_out_at = NOW()
     WHERE store_id = $1 AND user_id = $2 AND date = CURRENT_DATE AND check_out_at IS NULL`,
    [storeId, targetUserId],
  )
  return { success: true }
}

// ── getTodayRoster ────────────────────────────────────────────────────────────

export interface RosterEntry {
  userId: number
  name: string
  role: string
  isActive: boolean
  clockedIn: boolean
  checkInAt: string | null
  checkOutAt: string | null
}

export async function getTodayRoster(storeId: number): Promise<RosterEntry[]> {
  const result = await pool.query<{
    user_id: number
    name: string
    role: string
    is_active: boolean
    clocked_in: boolean
    check_in_at: Date | null
    check_out_at: Date | null
  }>(
    `SELECT
       u.id AS user_id,
       u.name,
       u.role,
       u.is_active,
       CASE WHEN a.check_out_at IS NULL AND a.check_in_at IS NOT NULL THEN TRUE ELSE FALSE END AS clocked_in,
       a.check_in_at,
       a.check_out_at
     FROM users u
     LEFT JOIN attendance a ON a.user_id = u.id AND a.store_id = $1 AND a.date = CURRENT_DATE
     WHERE u.store_id = $1 AND u.is_active = TRUE AND u.role = 'staff'
     ORDER BY u.name`,
    [storeId],
  )

  return result.rows.map((row) => ({
    userId: row.user_id,
    name: row.name,
    role: row.role,
    isActive: row.is_active,
    clockedIn: row.clocked_in,
    checkInAt: row.check_in_at ? row.check_in_at.toISOString() : null,
    checkOutAt: row.check_out_at ? row.check_out_at.toISOString() : null,
  }))
}
