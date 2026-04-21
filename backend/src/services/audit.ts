import bcrypt from 'bcrypt'
import pool from '../pool'
import { AppError } from '../errors/AppError'

// ── Types ────────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: number
  timestamp: string
  type: 'auto' | 'manual'
  recordsPruned: number
}

// ── getAuditLog ───────────────────────────────────────────────────────────────

export async function getAuditLog(storeId: number): Promise<AuditLogEntry[]> {
  const result = await pool.query<{
    id: number
    timestamp: Date
    type: 'auto' | 'manual'
    records_pruned: number
  }>(
    `SELECT id, timestamp, type, records_pruned
     FROM audit_log
     WHERE store_id = $1
     ORDER BY timestamp DESC
     LIMIT 100`,
    [storeId],
  )

  return result.rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp.toISOString(),
    type: row.type,
    recordsPruned: row.records_pruned,
  }))
}

// ── wipeEphemeralData ─────────────────────────────────────────────────────────

export async function wipeEphemeralData(
  storeId: number,
  password: string,
): Promise<AuditLogEntry> {
  // Verify owner password before touching data
  const ownerResult = await pool.query<{ id: number; password_hash: string }>(
    `SELECT id, password_hash
     FROM users
     WHERE store_id = $1 AND role = 'owner' AND is_active = TRUE
     LIMIT 1`,
    [storeId],
  )

  const owner = ownerResult.rows[0]
  if (!owner) {
    throw new AppError('Owner account not found', 404)
  }

  const passwordValid = await bcrypt.compare(password, owner.password_hash)
  if (!passwordValid) {
    throw new AppError('Incorrect password', 401)
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Snapshot the sale IDs we're about to wipe — we also need to remove
    // their dependent returns / return_items, which have ON DELETE RESTRICT
    // to sales. Without this pre-delete the sales DELETE fails with 23503
    // ("foreign key violation") the moment any one sale has a return row.
    const victims = await client.query<{ id: number }>(
      `SELECT id FROM sales
       WHERE store_id = $1 AND (is_ephemeral = TRUE OR expires_at < NOW())`,
      [storeId],
    )
    const recordsPruned = victims.rowCount ?? 0
    const saleIds = victims.rows.map(r => r.id)

    if (saleIds.length > 0) {
      // return_items cascades from returns via ON DELETE CASCADE, but we do
      // it explicitly because return_items.sale_item_id → sale_items is
      // RESTRICT and the sale_items rows vanish with their parent sale.
      await client.query(
        `DELETE FROM return_items
         WHERE return_id IN (SELECT id FROM returns WHERE sale_id = ANY($1::int[]))`,
        [saleIds],
      )
      await client.query(
        `DELETE FROM returns WHERE sale_id = ANY($1::int[])`,
        [saleIds],
      )
    }

    // Delete ephemeral / expired sales (cascades to sale_items via FK)
    await client.query(
      `DELETE FROM sales
       WHERE store_id = $1 AND (is_ephemeral = TRUE OR expires_at < NOW())`,
      [storeId],
    )

    // Insert audit log entry
    const logResult = await client.query<{
      id: number
      timestamp: Date
      type: 'auto' | 'manual'
      records_pruned: number
    }>(
      `INSERT INTO audit_log (store_id, timestamp, type, records_pruned)
       VALUES ($1, NOW(), 'manual', $2)
       RETURNING id, timestamp, type, records_pruned`,
      [storeId, recordsPruned],
    )

    await client.query('COMMIT')

    const row = logResult.rows[0]
    return {
      id: row.id,
      timestamp: row.timestamp.toISOString(),
      type: row.type,
      recordsPruned: row.records_pruned,
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
