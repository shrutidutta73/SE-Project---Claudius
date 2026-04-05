import pool from '../pool'

interface LeaderboardRow {
  user_id: number
  name: string
  role: 'owner' | 'manager' | 'staff'
  is_active: boolean
  clocked_in: boolean
  check_in_at: Date | null
  revenue_today: number
  sales_count_today: number
}

export async function getLeaderboard(storeId: number) {
  const result = await pool.query<LeaderboardRow>(
    `SELECT
      u.id AS user_id,
      u.name,
      u.role,
      u.is_active,
      CASE
        WHEN a.check_out_at IS NULL AND a.check_in_at IS NOT NULL THEN TRUE
        ELSE FALSE
      END AS clocked_in,
      a.check_in_at,
      COALESCE(SUM(s.total_amount), 0)::FLOAT AS revenue_today,
      COUNT(s.id)::INT AS sales_count_today
    FROM users u
    LEFT JOIN attendance a ON a.user_id = u.id
      AND a.store_id = $1
      AND a.date = CURRENT_DATE
    LEFT JOIN sales s ON s.staff_id = u.id
      AND s.store_id = $1
      AND s.created_at >= CURRENT_DATE
    WHERE u.store_id = $1 AND u.is_active = TRUE
    GROUP BY u.id, u.name, u.role, u.is_active, a.check_in_at, a.check_out_at
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
    revenueToday: row.revenue_today,
    salesCountToday: row.sales_count_today,
  }))
}
