import pool from '../pool'

interface LeaderboardRow {
  user_id: number
  name: string
  role: 'owner' | 'manager' | 'staff'
  is_active: boolean
  clocked_in: boolean
  check_in_at: Date | null
  check_out_at: Date | null
  revenue_today: number
  sales_count_today: number
}

export async function getLeaderboard(storeId: number) {
  // Users can have multiple shifts per day. `open_shift` gets the currently
  // running shift (check_out_at IS NULL) if any; `last_shift` gets the most
  // recent shift today regardless of state, used to show the last clock-out
  // time when they're off the clock.
  const result = await pool.query<LeaderboardRow>(
    `SELECT
      u.id AS user_id,
      u.name,
      u.role,
      u.is_active,
      (open_shift.check_in_at IS NOT NULL) AS clocked_in,
      COALESCE(open_shift.check_in_at, last_shift.check_in_at) AS check_in_at,
      last_shift.check_out_at AS check_out_at,
      COALESCE(sales.revenue_today, 0)::FLOAT AS revenue_today,
      COALESCE(sales.sales_count_today, 0)::INT AS sales_count_today
    FROM users u
    LEFT JOIN LATERAL (
      SELECT check_in_at
      FROM attendance
      WHERE user_id = u.id AND store_id = $1 AND date = CURRENT_DATE AND check_out_at IS NULL
      ORDER BY check_in_at DESC
      LIMIT 1
    ) open_shift ON TRUE
    LEFT JOIN LATERAL (
      SELECT check_in_at, check_out_at
      FROM attendance
      WHERE user_id = u.id AND store_id = $1 AND date = CURRENT_DATE
      ORDER BY check_in_at DESC
      LIMIT 1
    ) last_shift ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        SUM(s.total_amount)::FLOAT AS revenue_today,
        COUNT(s.id)::INT           AS sales_count_today
      FROM sales s
      WHERE s.staff_id = u.id AND s.store_id = $1 AND s.created_at >= CURRENT_DATE
    ) sales ON TRUE
    WHERE u.store_id = $1 AND u.is_active = TRUE
    ORDER BY revenue_today DESC, u.name`,
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
    revenueToday: row.revenue_today,
    salesCountToday: row.sales_count_today,
  }))
}
