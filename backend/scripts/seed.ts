/**
 * SmallBiz — Database seed script
 *
 * Usage:
 *   npm run db:seed
 *
 * What it does:
 *   1. Drops and re-creates the full schema (runs schema.sql)
 *   2. Hashes all passwords and PINs with bcrypt (cost factor 10)
 *   3. Inserts the Sharma Garments demo store with all reference data
 *
 * Environment variables required (same as main app — use .env):
 *   DATABASE_URL  e.g. postgresql://user:pass@localhost:5432/smallbiz
 */

import path from 'path'
import fs from 'fs'
import { Pool } from 'pg'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const BCRYPT_ROUNDS = 10

async function hash(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set.')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: databaseUrl })

  try {
    // ------------------------------------------------------------------
    // 1. Apply schema
    // ------------------------------------------------------------------
    console.log('Applying schema...')
    const schemaPath = path.resolve(__dirname, '../database/schema.sql')
    const schemaSql = fs.readFileSync(schemaPath, 'utf8')
    await pool.query(schemaSql)
    console.log('Schema applied.')

    // ------------------------------------------------------------------
    // 2. Pre-compute hashes
    // ------------------------------------------------------------------
    console.log('Hashing credentials (this may take a few seconds)...')
    const [
      ownerPasswordHash,
      managerPasswordHash,
      rahulPinHash,
      priyaPinHash,
      amitPinHash,
    ] = await Promise.all([
      hash('Owner@123'),          // Ramesh Sharma — owner
      hash('mak650650@gmail.com'),// Mohit Anand Kumar — password = email
      hash('1234'),               // Rahul Kumar — PIN
      hash('5678'),               // Priya Singh — PIN
      hash('9012'),               // Amit Yadav — PIN
    ])
    console.log('Hashing done.')

    // ------------------------------------------------------------------
    // 3. Seed inside a transaction so partial failures are rolled back
    // ------------------------------------------------------------------
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // ----------------------------------------------------------------
      // 3a. Store
      // ----------------------------------------------------------------
      const storeRes = await client.query<{ id: number }>(`
        INSERT INTO stores
          (name, address, gps_latitude, gps_longitude, gps_radius_m, billing_mode)
        VALUES
          ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        'Sharma Garments',
        'Shop No. 12, Nehru Market, Kanpur, UP 208001',
        26.4499,
        80.3319,
        200,
        'structured',
      ])
      const storeId: number = storeRes.rows[0].id
      console.log(`Inserted store id=${storeId}`)

      // ----------------------------------------------------------------
      // 3b. Users
      // ----------------------------------------------------------------
      type UserRow = { id: number }

      const ownerRes = await client.query<UserRow>(`
        INSERT INTO users
          (store_id, name, phone, email, role, password_hash, is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
      `, [storeId, 'Ramesh Sharma', '9876543210', 'ramesh@sharmagarments.com',
          'owner', ownerPasswordHash, true])
      const ownerId: number = ownerRes.rows[0].id

      const managerRes = await client.query<UserRow>(`
        INSERT INTO users
          (store_id, name, phone, email, role, password_hash, is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
      `, [storeId, 'Mohit Anand Kumar', '9876543211', 'mak650650@gmail.com',
          'manager', managerPasswordHash, true])
      const managerId: number = managerRes.rows[0].id

      const rahulRes = await client.query<UserRow>(`
        INSERT INTO users
          (store_id, name, phone, role, pin_hash, is_active)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING id
      `, [storeId, 'Rahul Kumar', '9450946772', 'staff', rahulPinHash, true])
      const rahulId: number = rahulRes.rows[0].id

      await client.query(`
        INSERT INTO users
          (store_id, name, phone, role, pin_hash, is_active)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [storeId, 'Priya Singh', '9876543213', 'staff', priyaPinHash, true])

      await client.query(`
        INSERT INTO users
          (store_id, name, phone, role, pin_hash, is_active)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [storeId, 'Amit Yadav', '9876543214', 'staff', amitPinHash, true])

      console.log(`Inserted 5 users (owner=${ownerId}, manager=${managerId}, staff ids include ${rahulId}...)`)

      // Point store.owner_id at the owner
      await client.query('UPDATE stores SET owner_id = $1 WHERE id = $2', [ownerId, storeId])

      // ----------------------------------------------------------------
      // 3c. Categories
      // ----------------------------------------------------------------
      type IdRow = { id: number }
      const categoryNames = ['Shirts', 'Trousers', 'Sarees', 'Kurtis', 'Suits']
      const categoryIds: Record<string, number> = {}

      for (const catName of categoryNames) {
        const res = await client.query<IdRow>(`
          INSERT INTO categories (store_id, name) VALUES ($1, $2) RETURNING id
        `, [storeId, catName])
        categoryIds[catName] = res.rows[0].id
      }
      console.log('Inserted categories:', categoryIds)

      // ----------------------------------------------------------------
      // 3d. Price bands
      // ----------------------------------------------------------------
      const priceBandDefs: Array<{ category: string; prices: number[] }> = [
        { category: 'Shirts',   prices: [299, 399, 499, 599, 799] },
        { category: 'Trousers', prices: [399, 499, 599, 799] },
        { category: 'Sarees',   prices: [599, 799, 1099, 1499, 1999] },
        { category: 'Kurtis',   prices: [299, 399, 499, 699] },
        { category: 'Suits',    prices: [1499, 1999, 2999] },
      ]

      // bandId key = `${category}:${price}`
      const bandIds: Record<string, number> = {}

      for (const { category, prices } of priceBandDefs) {
        const catId = categoryIds[category]
        for (const price of prices) {
          const res = await client.query<IdRow>(`
            INSERT INTO price_bands (store_id, category_id, price, is_active)
            VALUES ($1, $2, $3, TRUE) RETURNING id
          `, [storeId, catId, price])
          bandIds[`${category}:${price}`] = res.rows[0].id
        }
      }
      console.log('Inserted price bands.')

      // ----------------------------------------------------------------
      // 3e. Vendors
      // ----------------------------------------------------------------
      type VendorResult = { id: number }

      const vendorKrishna = await client.query<VendorResult>(`
        INSERT INTO vendors (store_id, name, phone, email, city, notes)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING id
      `, [storeId, 'Krishna Textiles', '9898989898', 'krishna@ktextiles.com',
          'Surat', 'Primary saree & suit supplier'])
      const vendorKrishnaId: number = vendorKrishna.rows[0].id

      const vendorMehta = await client.query<VendorResult>(`
        INSERT INTO vendors (store_id, name, phone, email, city, notes)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING id
      `, [storeId, 'Mehta Fabrics', '9797979797', 'orders@mehtafabrics.in',
          'Mumbai', 'Shirts and trousers wholesale'])
      const vendorMehtaId: number = vendorMehta.rows[0].id

      const vendorJain = await client.query<VendorResult>(`
        INSERT INTO vendors (store_id, name, phone, email, city, notes)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING id
      `, [storeId, 'Jain Garments', '9696969696', 'jain.garments@gmail.com',
          'Delhi', 'Budget kurtis and casual shirts'])
      const vendorJainId: number = vendorJain.rows[0].id

      console.log(`Inserted vendors: Krishna=${vendorKrishnaId}, Mehta=${vendorMehtaId}, Jain=${vendorJainId}`)

      // ----------------------------------------------------------------
      // 3f. Inventory batches
      // ----------------------------------------------------------------
      type BatchDef = {
        bandKey: string
        vendorId: number
        qtyAdded: number
        qtyRemaining: number
        costPrice: number
        notes: string | null
      }

      const batches: BatchDef[] = [
        // Shirts
        { bandKey: 'Shirts:299',    vendorId: vendorJainId,   qtyAdded: 50, qtyRemaining: 38, costPrice: 160, notes: 'Budget cotton shirts, summer lot' },
        { bandKey: 'Shirts:399',    vendorId: vendorMehtaId,  qtyAdded: 40, qtyRemaining: 29, costPrice: 230, notes: 'Formal checks batch' },
        { bandKey: 'Shirts:499',    vendorId: vendorMehtaId,  qtyAdded: 30, qtyRemaining: 22, costPrice: 290, notes: null },
        { bandKey: 'Shirts:599',    vendorId: vendorMehtaId,  qtyAdded: 20, qtyRemaining: 14, costPrice: 370, notes: 'Premium slim fit' },
        { bandKey: 'Shirts:799',    vendorId: vendorMehtaId,  qtyAdded: 15, qtyRemaining:  9, costPrice: 500, notes: 'Designer prints' },
        // Trousers
        { bandKey: 'Trousers:399',  vendorId: vendorMehtaId,  qtyAdded: 40, qtyRemaining: 31, costPrice: 220, notes: null },
        { bandKey: 'Trousers:499',  vendorId: vendorMehtaId,  qtyAdded: 35, qtyRemaining: 27, costPrice: 280, notes: 'Stretch fabric' },
        { bandKey: 'Trousers:599',  vendorId: vendorMehtaId,  qtyAdded: 25, qtyRemaining: 18, costPrice: 350, notes: null },
        { bandKey: 'Trousers:799',  vendorId: vendorMehtaId,  qtyAdded: 20, qtyRemaining: 12, costPrice: 470, notes: 'Formal slim fit' },
        // Sarees
        { bandKey: 'Sarees:599',    vendorId: vendorKrishnaId,qtyAdded: 30, qtyRemaining: 24, costPrice: 340, notes: 'Cotton daily-wear sarees' },
        { bandKey: 'Sarees:799',    vendorId: vendorKrishnaId,qtyAdded: 25, qtyRemaining: 19, costPrice: 460, notes: null },
        { bandKey: 'Sarees:1099',   vendorId: vendorKrishnaId,qtyAdded: 20, qtyRemaining: 15, costPrice: 660, notes: 'Chanderi silk' },
        { bandKey: 'Sarees:1499',   vendorId: vendorKrishnaId,qtyAdded: 15, qtyRemaining: 10, costPrice: 900, notes: null },
        { bandKey: 'Sarees:1999',   vendorId: vendorKrishnaId,qtyAdded: 10, qtyRemaining:  6, costPrice:1250, notes: 'Banarasi festive collection' },
        // Kurtis
        { bandKey: 'Kurtis:299',    vendorId: vendorJainId,   qtyAdded: 45, qtyRemaining: 35, costPrice: 165, notes: null },
        { bandKey: 'Kurtis:399',    vendorId: vendorJainId,   qtyAdded: 40, qtyRemaining: 30, costPrice: 230, notes: 'Embroidered kurtis' },
        { bandKey: 'Kurtis:499',    vendorId: vendorJainId,   qtyAdded: 30, qtyRemaining: 22, costPrice: 290, notes: null },
        { bandKey: 'Kurtis:699',    vendorId: vendorKrishnaId,qtyAdded: 20, qtyRemaining: 14, costPrice: 410, notes: 'Silk blend kurtis' },
        // Suits
        { bandKey: 'Suits:1499',    vendorId: vendorKrishnaId,qtyAdded: 15, qtyRemaining: 11, costPrice: 900, notes: 'Terylene blend' },
        { bandKey: 'Suits:1999',    vendorId: vendorKrishnaId,qtyAdded: 10, qtyRemaining:  7, costPrice:1200, notes: null },
        { bandKey: 'Suits:2999',    vendorId: vendorKrishnaId,qtyAdded:  8, qtyRemaining:  5, costPrice:1800, notes: 'Wedding/occasion suits' },
      ]

      for (const b of batches) {
        const bandId = bandIds[b.bandKey]
        if (!bandId) {
          throw new Error(`No band found for key "${b.bandKey}"`)
        }
        await client.query(`
          INSERT INTO inventory_batches
            (store_id, price_band_id, vendor_id, quantity_added,
             quantity_remaining, cost_price, added_by, notes)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `, [storeId, bandId, b.vendorId, b.qtyAdded,
            b.qtyRemaining, b.costPrice, managerId, b.notes])
      }
      console.log(`Inserted ${batches.length} inventory batches.`)

      // ----------------------------------------------------------------
      // 3g. daily_sales_summary — last 7 days
      // ----------------------------------------------------------------
      type SummaryDef = {
        daysAgo: number
        bandKey: string
        category: string
        totalQty: number
        totalRevenue: number
        totalReturns: number
        totalRefunds: number
      }

      const summaries: SummaryDef[] = [
        // Day -7
        { daysAgo:7, bandKey:'Shirts:299',   category:'Shirts',   totalQty:4, totalRevenue:1196,  totalReturns:0, totalRefunds:0 },
        { daysAgo:7, bandKey:'Shirts:399',   category:'Shirts',   totalQty:3, totalRevenue:1197,  totalReturns:0, totalRefunds:0 },
        { daysAgo:7, bandKey:'Trousers:399', category:'Trousers', totalQty:2, totalRevenue:798,   totalReturns:0, totalRefunds:0 },
        { daysAgo:7, bandKey:'Sarees:599',   category:'Sarees',   totalQty:1, totalRevenue:599,   totalReturns:0, totalRefunds:0 },
        { daysAgo:7, bandKey:'Kurtis:299',   category:'Kurtis',   totalQty:3, totalRevenue:897,   totalReturns:0, totalRefunds:0 },
        // Day -6
        { daysAgo:6, bandKey:'Shirts:399',   category:'Shirts',   totalQty:5, totalRevenue:1995,  totalReturns:1, totalRefunds:399 },
        { daysAgo:6, bandKey:'Trousers:499', category:'Trousers', totalQty:3, totalRevenue:1497,  totalReturns:0, totalRefunds:0 },
        { daysAgo:6, bandKey:'Sarees:799',   category:'Sarees',   totalQty:2, totalRevenue:1598,  totalReturns:0, totalRefunds:0 },
        { daysAgo:6, bandKey:'Kurtis:399',   category:'Kurtis',   totalQty:4, totalRevenue:1596,  totalReturns:0, totalRefunds:0 },
        // Day -5
        { daysAgo:5, bandKey:'Shirts:499',   category:'Shirts',   totalQty:4, totalRevenue:1996,  totalReturns:0, totalRefunds:0 },
        { daysAgo:5, bandKey:'Trousers:399', category:'Trousers', totalQty:3, totalRevenue:1197,  totalReturns:0, totalRefunds:0 },
        { daysAgo:5, bandKey:'Sarees:599',   category:'Sarees',   totalQty:2, totalRevenue:1198,  totalReturns:1, totalRefunds:599 },
        { daysAgo:5, bandKey:'Suits:1499',   category:'Suits',    totalQty:1, totalRevenue:1499,  totalReturns:0, totalRefunds:0 },
        // Day -4
        { daysAgo:4, bandKey:'Shirts:299',   category:'Shirts',   totalQty:6, totalRevenue:1794,  totalReturns:0, totalRefunds:0 },
        { daysAgo:4, bandKey:'Shirts:399',   category:'Shirts',   totalQty:4, totalRevenue:1596,  totalReturns:0, totalRefunds:0 },
        { daysAgo:4, bandKey:'Trousers:599', category:'Trousers', totalQty:2, totalRevenue:1198,  totalReturns:0, totalRefunds:0 },
        { daysAgo:4, bandKey:'Kurtis:299',   category:'Kurtis',   totalQty:5, totalRevenue:1495,  totalReturns:0, totalRefunds:0 },
        { daysAgo:4, bandKey:'Kurtis:499',   category:'Kurtis',   totalQty:2, totalRevenue:998,   totalReturns:0, totalRefunds:0 },
        // Day -3
        { daysAgo:3, bandKey:'Shirts:499',   category:'Shirts',   totalQty:3, totalRevenue:1497,  totalReturns:0, totalRefunds:0 },
        { daysAgo:3, bandKey:'Shirts:799',   category:'Shirts',   totalQty:2, totalRevenue:1598,  totalReturns:0, totalRefunds:0 },
        { daysAgo:3, bandKey:'Trousers:499', category:'Trousers', totalQty:4, totalRevenue:1996,  totalReturns:1, totalRefunds:499 },
        { daysAgo:3, bandKey:'Sarees:1099',  category:'Sarees',   totalQty:2, totalRevenue:2198,  totalReturns:0, totalRefunds:0 },
        { daysAgo:3, bandKey:'Suits:1999',   category:'Suits',    totalQty:1, totalRevenue:1999,  totalReturns:0, totalRefunds:0 },
        // Day -2
        { daysAgo:2, bandKey:'Shirts:299',   category:'Shirts',   totalQty:8, totalRevenue:2392,  totalReturns:0, totalRefunds:0 },
        { daysAgo:2, bandKey:'Shirts:399',   category:'Shirts',   totalQty:5, totalRevenue:1995,  totalReturns:0, totalRefunds:0 },
        { daysAgo:2, bandKey:'Trousers:399', category:'Trousers', totalQty:6, totalRevenue:2394,  totalReturns:0, totalRefunds:0 },
        { daysAgo:2, bandKey:'Kurtis:399',   category:'Kurtis',   totalQty:3, totalRevenue:1197,  totalReturns:0, totalRefunds:0 },
        { daysAgo:2, bandKey:'Sarees:799',   category:'Sarees',   totalQty:2, totalRevenue:1598,  totalReturns:0, totalRefunds:0 },
        // Day -1
        { daysAgo:1, bandKey:'Shirts:399',   category:'Shirts',   totalQty:6, totalRevenue:2394,  totalReturns:0, totalRefunds:0 },
        { daysAgo:1, bandKey:'Shirts:499',   category:'Shirts',   totalQty:4, totalRevenue:1996,  totalReturns:0, totalRefunds:0 },
        { daysAgo:1, bandKey:'Trousers:499', category:'Trousers', totalQty:5, totalRevenue:2495,  totalReturns:0, totalRefunds:0 },
        { daysAgo:1, bandKey:'Trousers:799', category:'Trousers', totalQty:2, totalRevenue:1598,  totalReturns:0, totalRefunds:0 },
        { daysAgo:1, bandKey:'Sarees:1499',  category:'Sarees',   totalQty:1, totalRevenue:1499,  totalReturns:0, totalRefunds:0 },
        { daysAgo:1, bandKey:'Kurtis:299',   category:'Kurtis',   totalQty:7, totalRevenue:2093,  totalReturns:0, totalRefunds:0 },
        { daysAgo:1, bandKey:'Suits:1499',   category:'Suits',    totalQty:2, totalRevenue:2998,  totalReturns:1, totalRefunds:1499 },
      ]

      for (const s of summaries) {
        const bandId = bandIds[s.bandKey]
        if (!bandId) {
          throw new Error(`No band found for summary key "${s.bandKey}"`)
        }
        const price = parseFloat(s.bandKey.split(':')[1])
        await client.query(`
          INSERT INTO daily_sales_summary
            (store_id, date, price_band_id, category_name, band_price,
             total_qty_sold, total_revenue, total_returns, total_refunds)
          VALUES ($1, CURRENT_DATE - $2::int, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (store_id, date, price_band_id) DO NOTHING
        `, [storeId, s.daysAgo, bandId, s.category, price,
            s.totalQty, s.totalRevenue, s.totalReturns, s.totalRefunds])
      }
      console.log(`Inserted ${summaries.length} daily summary rows.`)

      await client.query('COMMIT')
      console.log('\nSeed complete.')
      console.log(`Store id : ${storeId}`)
      console.log(`Owner id : ${ownerId}  (Ramesh Sharma)`)
      console.log(`Manager id: ${managerId} (Mohit Anand Kumar)`)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
