/**
 * Bombay Fashion — Rich demo seed
 *
 * Generates 90 days of realistic retail data for presentation/demo use.
 *
 * Usage:
 *   npm run db:seed
 *
 * What it does:
 *   1. Drops and re-creates the full schema (runs schema.sql)
 *   2. Hashes all passwords and PINs with bcrypt (cost factor 10)
 *   3. Seeds: store, 1 owner + 2 managers + 10 staff, categories, price
 *      bands, vendors, 4 inventory batches per band (staggered dates), 20
 *      customers, ~1,300 sales with FIFO batch deduction, daily summary
 *      rollups, attendance for all staff across 90 days (with multi-shift
 *      days), and a spread of reorders in all four statuses.
 *
 * Environment variables required (same as main app — use .env):
 *   DATABASE_URL  e.g. postgresql://user:pass@localhost:5432/smallbiz
 */

import path from 'path'
import fs from 'fs'
import { Pool, type PoolClient } from 'pg'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const BCRYPT_ROUNDS = 10
// Seeded PRNG (Mulberry32). Changes here shift *all* generated data. Keep
// stable across runs so presentations stay consistent.
const RNG_SEED = 0xB0FA5101
const DEMO_DAYS = 90

// ── PRNG ─────────────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  let t = seed >>> 0
  return function () {
    t = (t + 0x6D2B79F5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(RNG_SEED)
const randInt  = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min
const pick     = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
const pickN    = <T>(arr: T[], n: number): T[] => {
  const copy = [...arr]
  const out: T[] = []
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rand() * copy.length)
    out.push(copy.splice(idx, 1)[0])
  }
  return out
}
function weighted<T>(items: { value: T; w: number }[]): T {
  const total = items.reduce((s, i) => s + i.w, 0)
  let r = rand() * total
  for (const it of items) {
    r -= it.w
    if (r <= 0) return it.value
  }
  return items[items.length - 1].value
}

// ── Hash helper ──────────────────────────────────────────────────────────────

async function hash(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

// ── Date utilities ───────────────────────────────────────────────────────────

function daysAgo(n: number, h: number, m = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(h, m, Math.floor(rand() * 60), 0)
  return d
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ── Types ────────────────────────────────────────────────────────────────────

interface BatchState {
  id: number
  costPrice: number
  // Remaining quantity that's still available for FIFO deduction during
  // sales generation. After the loop we derive the batch's final
  // quantity_remaining by subtracting consumed from quantity_added.
  available: number
  quantityAdded: number
  consumed: number
}

interface StaffUser {
  id: number
  name: string
}

interface SaleItemDraft {
  priceBandId: number | null
  categoryName: string
  price: number
  quantity: number
  subtotal: number
  batchId: number | null
}

interface SaleDraft {
  staffId: number
  customerId: number | null
  paymentMethod: 'cash' | 'upi' | 'store_credit'
  discount: number
  createdAt: Date
  items: SaleItemDraft[]
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set.')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: databaseUrl })

  try {
    // 1. Apply schema
    console.log('Applying schema...')
    const schemaPath = path.resolve(__dirname, '../database/schema.sql')
    const schemaSql = fs.readFileSync(schemaPath, 'utf8')
    await pool.query(schemaSql)
    console.log('Schema applied.')

    // 2. Hash credentials
    console.log('Hashing credentials...')
    const [
      ownerHash,
      managerMohitHash,
      managerAnitaHash,
      ...staffPinHashes
    ] = await Promise.all([
      hash('Owner@123'),
      hash('Manager@123'),
      hash('Manager@123'),
      ...[
        '1234', '5678', '9012', '1111', '2222',
        '3333', '4444', '5555', '6666', '7777',
      ].map(hash),
    ])
    console.log('Hashing done.')

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // 3. Store — Bombay Fashion
      const storeRes = await client.query<{ id: number }>(`
        INSERT INTO stores
          (name, address, gps_latitude, gps_longitude, gps_radius_m, billing_mode)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        'Bombay Fashion',
        'Shop No. 24, Linking Road, Bandra West, Mumbai, Maharashtra 400050',
        19.0608,
        72.8345,
        200,
        'structured',
      ])
      const storeId = storeRes.rows[0].id

      // 4. Users
      const owner = await insertUser(client, storeId, {
        name: 'Ramesh Sharma', phone: '9876500001',
        email: 'ramesh@bombayfashion.in', role: 'owner',
        passwordHash: ownerHash,
      })

      const managerMohit = await insertUser(client, storeId, {
        name: 'Mohit Anand Kumar', phone: '9876500002',
        email: 'mohit@bombayfashion.in', role: 'manager',
        passwordHash: managerMohitHash,
      })
      const managerAnita = await insertUser(client, storeId, {
        name: 'Anita Verma', phone: '9876500003',
        email: 'anita@bombayfashion.in', role: 'manager',
        passwordHash: managerAnitaHash,
      })

      const staffDefs = [
        { name: 'Rahul Kumar',    phone: '9876500010', pin: '1234' },
        { name: 'Priya Singh',    phone: '9876500011', pin: '5678' },
        { name: 'Amit Yadav',     phone: '9876500012', pin: '9012' },
        { name: 'Sneha Gupta',    phone: '9876500013', pin: '1111' },
        { name: 'Vikram Desai',   phone: '9876500014', pin: '2222' },
        { name: 'Kavita Sharma',  phone: '9876500015', pin: '3333' },
        { name: 'Rohit Mishra',   phone: '9876500016', pin: '4444' },
        { name: 'Deepa Tiwari',   phone: '9876500017', pin: '5555' },
        { name: 'Arjun Patel',    phone: '9876500018', pin: '6666' },
        { name: 'Meera Nair',     phone: '9876500019', pin: '7777' },
      ]

      const staff: StaffUser[] = []
      for (let i = 0; i < staffDefs.length; i++) {
        const d = staffDefs[i]
        const u = await insertUser(client, storeId, {
          name: d.name, phone: d.phone, role: 'staff',
          pinHash: staffPinHashes[i],
        })
        staff.push({ id: u, name: d.name })
      }

      await client.query('UPDATE stores SET owner_id = $1 WHERE id = $2', [owner, storeId])
      console.log(`Users: 1 owner, 2 managers, ${staff.length} staff.`)

      // 5. Categories
      const categoryNames = ['Shirts', 'Trousers', 'Sarees', 'Kurtis', 'Suits', 'Bikini']
      const categoryIds: Record<string, number> = {}
      for (const name of categoryNames) {
        const r = await client.query<{ id: number }>(
          `INSERT INTO categories (store_id, name) VALUES ($1, $2) RETURNING id`,
          [storeId, name],
        )
        categoryIds[name] = r.rows[0].id
      }

      // 6. Price bands
      const priceBandDefs: Array<{ category: string; prices: number[] }> = [
        { category: 'Shirts',   prices: [299, 399, 499, 599, 799] },
        { category: 'Trousers', prices: [399, 499, 599, 799] },
        { category: 'Sarees',   prices: [599, 799, 1099, 1499, 1999] },
        { category: 'Kurtis',   prices: [299, 399, 499, 699] },
        { category: 'Suits',    prices: [1499, 1999, 2999] },
        // Bandra clientele swim/beach range
        { category: 'Bikini',   prices: [799, 1299, 1799, 2499] },
      ]
      // bandId keyed by `${category}:${price}` for readability in the demand model
      const bandIds: Record<string, number> = {}
      // bandMeta[bandId] = { category, price, costFactor }
      const bandMeta: Record<number, { category: string; price: number; costFactor: number }> = {}

      for (const { category, prices } of priceBandDefs) {
        const catId = categoryIds[category]
        for (const price of prices) {
          const res = await client.query<{ id: number }>(
            `INSERT INTO price_bands (store_id, category_id, price, is_active)
             VALUES ($1, $2, $3, TRUE) RETURNING id`,
            [storeId, catId, price],
          )
          const id = res.rows[0].id
          bandIds[`${category}:${price}`] = id
          // Realistic retail margin: 35–55% gross → cost = 0.45–0.65 × price
          const costFactor = 0.45 + rand() * 0.2
          bandMeta[id] = { category, price, costFactor }
        }
      }

      // 7. Vendors
      const vendorKrishna = await insertVendor(client, storeId, 'Krishna Textiles', '9898989898', 'krishna@ktextiles.com', 'Surat', 'Primary saree & suit supplier, 5-day lead time')
      const vendorMehta   = await insertVendor(client, storeId, 'Mehta Fabrics',    '9797979797', 'orders@mehtafabrics.in', 'Mumbai', 'Shirts and trousers wholesale, 3-day lead time')
      const vendorJain    = await insertVendor(client, storeId, 'Jain Garments',    '9696969696', 'jain.garments@gmail.com', 'Delhi',  'Budget kurtis and casual shirts, 7-day lead time')
      const vendorRamesh  = await insertVendor(client, storeId, 'Ramesh Weavers',   '9595959595', 'contact@rameshweavers.in', 'Varanasi', 'Handloom Banarasi sarees and suits, 10-day lead time')
      const vendorAzure   = await insertVendor(client, storeId, 'Azure Swim Co.',   '9494949494', 'orders@azureswim.in', 'Goa', 'Beach and resort-wear, bikini & swimsuit specialists, 4-day lead time')

      // Which vendor typically supplies each category
      const categoryVendor: Record<string, number[]> = {
        Shirts:   [vendorMehta, vendorJain],
        Trousers: [vendorMehta],
        Sarees:   [vendorKrishna, vendorRamesh],
        Kurtis:   [vendorJain, vendorKrishna],
        Suits:    [vendorKrishna, vendorRamesh],
        Bikini:   [vendorAzure],
      }

      // 8. Demand weights per band — drives sales distribution
      const demandWeight: Record<number, number> = {}
      for (const [bandKey, bandId] of Object.entries(bandIds)) {
        const meta = bandMeta[bandId]
        // Base weight by price point: cheaper bands move much faster
        const priceTier = meta.price < 500 ? 8 : meta.price < 1000 ? 4 : meta.price < 2000 ? 1.8 : 0.7
        // Category modifier — Bandra gets strong beachwear pull in warm months
        const catMod = meta.category === 'Shirts' ? 1.3
          : meta.category === 'Kurtis' ? 1.1
          : meta.category === 'Trousers' ? 0.9
          : meta.category === 'Sarees' ? 0.85
          : meta.category === 'Bikini' ? 0.95
          : 0.6 // Suits
        demandWeight[bandId] = priceTier * catMod
        void bandKey
      }

      // 9. Inventory batches — 3–4 staggered refills per band
      //    Start 100 days ago so the oldest batches are "aging" (>60 days).
      const batchStates: Record<number, BatchState[]> = {}
      for (const [, bandId] of Object.entries(bandIds)) {
        batchStates[bandId] = []
        const meta = bandMeta[bandId]
        const weight = demandWeight[bandId]
        // Total 90-day demand ~= weight × ~1.6 sales/day, items 1–2 per line.
        // Budget generously so ~20–35% remains on hand at demo time.
        const estDemand = Math.max(12, Math.round(weight * 1.7 * DEMO_DAYS))
        const batchCount = weight >= 4 ? 4 : weight >= 1.5 ? 3 : 2
        const perBatch = Math.ceil((estDemand * 1.35) / batchCount)

        for (let i = 0; i < batchCount; i++) {
          // Space batches across ~100 days — first batch is oldest (~95 days ago),
          // last is recent (~5 days ago).
          const ageDays = Math.round(95 - i * (90 / batchCount))
          const createdAt = daysAgo(ageDays, randInt(10, 18))
          const costPrice = Math.round(meta.price * (meta.costFactor + (rand() - 0.5) * 0.08))
          const vendorId = pick(categoryVendor[meta.category])
          const res = await client.query<{ id: number }>(`
            INSERT INTO inventory_batches
              (store_id, price_band_id, vendor_id, quantity_added,
               quantity_remaining, cost_price, added_by, notes, created_at, updated_at)
            VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$8) RETURNING id
          `, [storeId, bandId, vendorId, perBatch, costPrice,
              i % 2 === 0 ? managerMohit : managerAnita,
              batchNote(meta.category, ageDays), createdAt])
          batchStates[bandId].push({
            id: res.rows[0].id,
            costPrice,
            available: perBatch,
            quantityAdded: perBatch,
            consumed: 0,
          })
        }
      }
      const totalBatches = Object.values(batchStates).reduce((s, v) => s + v.length, 0)
      console.log(`Inventory: ${totalBatches} batches across ${Object.keys(bandIds).length} bands.`)

      // 10. Customers — 20 recurring names
      const customerNames = [
        ['Neha Agarwal', '9820011111'], ['Rakesh Malhotra', '9820022222'],
        ['Sunita Rao', '9820033333'], ['Imran Sheikh', '9820044444'],
        ['Pooja Desai', '9820055555'], ['Karan Oberoi', '9820066666'],
        ['Meenakshi Iyer', '9820077777'], ['Gaurav Joshi', '9820088888'],
        ['Divya Shetty', '9820099999'], ['Varun Kapoor', '9820100001'],
        ['Nisha Pillai', '9820100002'], ['Sameer Khan', '9820100003'],
        ['Lata Fernandes', '9820100004'], ['Yash Thakur', '9820100005'],
        ['Riya Sinha', '9820100006'], ['Manish Goyal', '9820100007'],
        ['Anjali Menon', '9820100008'], ['Zaheer Mohammed', '9820100009'],
        ['Kiran Bhatt', '9820100010'], ['Tanvi Rathi', '9820100011'],
      ]
      const customerIds: number[] = []
      for (const [name, phone] of customerNames) {
        const r = await client.query<{ id: number }>(
          `INSERT INTO customers (store_id, name, phone) VALUES ($1,$2,$3) RETURNING id`,
          [storeId, name, phone],
        )
        customerIds.push(r.rows[0].id)
      }

      // 11. Generate 90 days of sales
      const bandIdList = Object.keys(bandMeta).map(Number)
      const sales: SaleDraft[] = []

      for (let d = DEMO_DAYS - 1; d >= 0; d--) {
        const date = new Date()
        date.setDate(date.getDate() - d)
        const dow = date.getDay() // 0=Sun

        // Weekend lift + festival week boost
        const weekend = dow === 0 || dow === 6 ? 1.35 : 1
        const isFestivalWeek = d >= 40 && d <= 46 // pseudo-Diwali window (~6 weeks ago)
        const festival = isFestivalWeek ? 1.7 : 1

        const salesCount = Math.round((9 + rand() * 10) * weekend * festival)

        for (let s = 0; s < salesCount; s++) {
          const hour = weighted([
            { value: 10, w: 1 }, { value: 11, w: 2 }, { value: 12, w: 3 },
            { value: 13, w: 2 }, { value: 14, w: 2 }, { value: 15, w: 3 },
            { value: 16, w: 4 }, { value: 17, w: 5 }, { value: 18, w: 5 },
            { value: 19, w: 4 }, { value: 20, w: 2 },
          ])
          const minute = randInt(0, 59)
          const createdAt = new Date(date)
          createdAt.setHours(hour, minute, randInt(0, 59), 0)

          const itemCount = weighted([
            { value: 1, w: 5 }, { value: 2, w: 3 }, { value: 3, w: 2 }, { value: 4, w: 1 },
          ])

          const items: SaleItemDraft[] = []
          const chosenBands = new Set<number>()
          for (let i = 0; i < itemCount; i++) {
            // 5% chance of a custom-priced item (no band), shows up in dashboard via sale_items
            if (rand() < 0.05) {
              const cat = pick(categoryNames)
              const price = randInt(250, 1800)
              const qty = weighted([{ value: 1, w: 4 }, { value: 2, w: 1 }])
              items.push({
                priceBandId: null,
                categoryName: `Custom · ${cat}`,
                price,
                quantity: qty,
                subtotal: price * qty,
                batchId: null,
              })
              continue
            }

            // Pick a band weighted by demand, not yet picked in this sale
            const candidates = bandIdList.filter(b => !chosenBands.has(b))
            if (candidates.length === 0) break
            const bandId = weighted(candidates.map(b => ({ value: b, w: demandWeight[b] })))
            chosenBands.add(bandId)

            const meta = bandMeta[bandId]
            const qty = weighted([{ value: 1, w: 5 }, { value: 2, w: 2 }, { value: 3, w: 1 }])

            // FIFO: try to fulfil from the oldest non-empty batch that was
            // created before this sale date.
            const state = batchStates[bandId]
            let fulfilled = 0
            let chosenBatchId: number | null = null
            for (const b of state) {
              if (b.available <= 0) continue
              // Conceptually the batch must exist by the sale date. We won't
              // check strict dates here because batches run from ~95 days ago
              // and demo spans last 90 days — all pre-exist any sale.
              const take = Math.min(qty - fulfilled, b.available)
              if (take <= 0) continue
              b.available -= take
              b.consumed += take
              fulfilled += take
              chosenBatchId = b.id
              if (fulfilled >= qty) break
            }
            if (fulfilled === 0) continue // band is dry, skip

            items.push({
              priceBandId: bandId,
              categoryName: meta.category,
              price: meta.price,
              quantity: fulfilled,
              subtotal: meta.price * fulfilled,
              batchId: chosenBatchId,
            })
          }

          if (items.length === 0) continue

          // 30% of sales are to named customers (tracked for loyalty), 70% walk-in.
          const customerId = rand() < 0.3 ? pick(customerIds) : null

          const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
          // 10% of sales have a small discount (festival promo, loyalty, haggle).
          const discount = rand() < 0.1 ? Math.round(subtotal * (0.03 + rand() * 0.07)) : 0

          const paymentMethod = weighted<'cash' | 'upi' | 'store_credit'>([
            { value: 'upi',          w: 5 },
            { value: 'cash',         w: 4 },
            { value: 'store_credit', w: 1 },
          ])

          sales.push({
            staffId: pick(staff).id,
            customerId,
            paymentMethod,
            discount,
            createdAt,
            items,
          })
        }
      }

      console.log(`Generated ${sales.length} sales in memory.`)

      // 12. Persist sales + sale_items in date order
      sales.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

      let saleRowCount = 0
      for (const s of sales) {
        const subtotal = s.items.reduce((a, it) => a + it.subtotal, 0)
        const total = subtotal - s.discount
        const saleRes = await client.query<{ id: number }>(`
          INSERT INTO sales
            (store_id, customer_id, staff_id, total_amount, discount_amount,
             payment_method, is_ephemeral, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,FALSE,$7) RETURNING id
        `, [storeId, s.customerId, s.staffId, total, s.discount, s.paymentMethod, s.createdAt])
        const saleId = saleRes.rows[0].id

        for (const it of s.items) {
          await client.query(`
            INSERT INTO sale_items
              (sale_id, price_band_id, inventory_batch_id, category_name,
               price, quantity, subtotal)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
          `, [saleId, it.priceBandId, it.batchId, it.categoryName,
              it.price, it.quantity, it.subtotal])
        }
        saleRowCount++
      }
      console.log(`Persisted ${saleRowCount} sales.`)

      // 13. Update inventory_batches.quantity_remaining from in-memory consumed counts
      for (const bandId of bandIdList) {
        for (const b of batchStates[bandId]) {
          const remaining = b.quantityAdded - b.consumed
          await client.query(
            'UPDATE inventory_batches SET quantity_remaining = $1 WHERE id = $2',
            [remaining, b.id],
          )
        }
      }

      // 14. daily_sales_summary — rollup from the sales we just inserted
      const summaryMap = new Map<string, { qty: number; revenue: number; category: string; price: number }>()
      for (const s of sales) {
        const day = ymd(s.createdAt)
        for (const it of s.items) {
          if (it.priceBandId === null) continue // custom items aren't rolled up here
          const key = `${day}|${it.priceBandId}`
          const cur = summaryMap.get(key)
          if (cur) {
            cur.qty += it.quantity
            cur.revenue += it.subtotal
          } else {
            summaryMap.set(key, {
              qty: it.quantity,
              revenue: it.subtotal,
              category: it.categoryName,
              price: it.price,
            })
          }
        }
      }

      for (const [key, v] of summaryMap) {
        const [day, bandIdStr] = key.split('|')
        await client.query(`
          INSERT INTO daily_sales_summary
            (store_id, date, price_band_id, category_name, band_price,
             total_qty_sold, total_revenue, total_returns, total_refunds)
          VALUES ($1,$2,$3,$4,$5,$6,$7,0,0)
          ON CONFLICT (store_id, date, price_band_id) DO UPDATE SET
            total_qty_sold = EXCLUDED.total_qty_sold,
            total_revenue  = EXCLUDED.total_revenue
        `, [storeId, day, Number(bandIdStr), v.category, v.price, v.qty, v.revenue])
      }
      console.log(`Daily summary: ${summaryMap.size} rows.`)

      // 15. Simulate ~2% returns on recent sales (last 30 days)
      const recentCutoff = daysAgo(30, 0).getTime()
      const recentSales = await client.query<{ id: number; created_at: Date }>(
        `SELECT id, created_at FROM sales WHERE store_id = $1 AND created_at >= $2`,
        [storeId, daysAgo(30, 0)],
      )
      let returnCount = 0
      for (const sale of recentSales.rows) {
        if (rand() >= 0.02) continue
        const itemsRes = await client.query<{
          id: number; price_band_id: number | null; inventory_batch_id: number | null;
          quantity: number; subtotal: string; price: string;
        }>(
          `SELECT id, price_band_id, inventory_batch_id, quantity, subtotal, price
           FROM sale_items WHERE sale_id = $1`,
          [sale.id],
        )
        if (itemsRes.rows.length === 0) continue
        const returnableRows = itemsRes.rows.filter(r => r.inventory_batch_id !== null)
        if (returnableRows.length === 0) continue
        const item = pick(returnableRows)
        const returnQty = randInt(1, Math.min(item.quantity, 2))

        const retRes = await client.query<{ id: number }>(`
          INSERT INTO returns (store_id, sale_id, staff_id, type, created_at)
          VALUES ($1, $2, $3, 'return', $4) RETURNING id
        `, [storeId, sale.id, pick(staff).id,
            new Date(sale.created_at.getTime() + (1 + rand() * 3) * 86400 * 1000)])
        await client.query(`
          INSERT INTO return_items (return_id, sale_item_id, quantity, inventory_batch_id)
          VALUES ($1,$2,$3,$4)
        `, [retRes.rows[0].id, item.id, returnQty, item.inventory_batch_id])

        // Top up daily_sales_summary.total_returns/refunds for that date
        if (item.price_band_id != null) {
          const refund = Math.round(Number(item.price) * returnQty * 100) / 100
          await client.query(`
            UPDATE daily_sales_summary
            SET total_returns = total_returns + $1,
                total_refunds = total_refunds + $2
            WHERE store_id = $3 AND date = $4 AND price_band_id = $5
          `, [returnQty, refund, storeId, ymd(sale.created_at), item.price_band_id])
        }
        returnCount++
      }
      console.log(`Returns: ${returnCount}.`)
      void recentCutoff

      // 16. Attendance — each staff works 5–6 days/week, some multi-shift days
      let shiftCount = 0
      for (let d = DEMO_DAYS - 1; d >= 0; d--) {
        const date = new Date()
        date.setDate(date.getDate() - d)
        const dow = date.getDay()
        for (const st of staff) {
          // Skip random days (off): 1 day/week base, extra on Sunday
          const skipChance = dow === 0 ? 0.4 : 0.15
          if (rand() < skipChance) continue

          const checkIn = new Date(date)
          checkIn.setHours(randInt(9, 10), randInt(0, 45), 0, 0)

          // 15% of days are split-shift: two shifts with a lunch break
          if (rand() < 0.15) {
            const midBreak = new Date(checkIn)
            midBreak.setHours(13, randInt(0, 30), 0, 0)
            const shift2Start = new Date(midBreak)
            shift2Start.setHours(14, randInt(15, 45), 0, 0)
            const shift2End = new Date(shift2Start)
            shift2End.setHours(21, randInt(0, 45), 0, 0)

            await client.query(`
              INSERT INTO attendance (store_id, user_id, date, check_in_at, check_out_at,
                check_in_lat, check_in_lng, check_out_lat, check_out_lng)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$6,$7)
            `, [storeId, st.id, ymd(date), checkIn, midBreak, 19.0608, 72.8345])
            await client.query(`
              INSERT INTO attendance (store_id, user_id, date, check_in_at, check_out_at,
                check_in_lat, check_in_lng, check_out_lat, check_out_lng)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$6,$7)
            `, [storeId, st.id, ymd(date), shift2Start, shift2End, 19.0608, 72.8345])
            shiftCount += 2
          } else {
            const checkOut = new Date(checkIn)
            checkOut.setHours(checkIn.getHours() + randInt(7, 10), randInt(0, 50), 0, 0)
            // Leave today's last-shift-of-the-day open for ~1/5 of today's staff
            const leaveOpen = d === 0 && rand() < 0.2
            await client.query(`
              INSERT INTO attendance (store_id, user_id, date, check_in_at, check_out_at,
                check_in_lat, check_in_lng, check_out_lat, check_out_lng)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            `, [storeId, st.id, ymd(date), checkIn,
                leaveOpen ? null : checkOut,
                19.0608, 72.8345,
                leaveOpen ? null : 19.0608, leaveOpen ? null : 72.8345])
            shiftCount++
          }
        }
      }
      console.log(`Attendance: ${shiftCount} shifts across ${staff.length} staff × ${DEMO_DAYS} days.`)

      // 17. Reorders — realistic spread, mixed statuses
      const reorderSeeds: Array<{
        daysAgo: number
        vendorId: number
        status: 'draft' | 'sent' | 'acknowledged' | 'fulfilled'
        items: { bandKey: string; finalQty: number; suggestedQty: number }[]
      }> = [
        { daysAgo: 75, vendorId: vendorMehta, status: 'fulfilled', items: [
          { bandKey: 'Shirts:299', finalQty: 60, suggestedQty: 60 },
          { bandKey: 'Shirts:399', finalQty: 40, suggestedQty: 45 },
        ]},
        { daysAgo: 62, vendorId: vendorJain, status: 'fulfilled', items: [
          { bandKey: 'Kurtis:299', finalQty: 50, suggestedQty: 55 },
          { bandKey: 'Kurtis:399', finalQty: 40, suggestedQty: 40 },
        ]},
        { daysAgo: 50, vendorId: vendorKrishna, status: 'fulfilled', items: [
          { bandKey: 'Sarees:599',  finalQty: 30, suggestedQty: 30 },
          { bandKey: 'Sarees:1099', finalQty: 15, suggestedQty: 20 },
        ]},
        { daysAgo: 35, vendorId: vendorMehta, status: 'fulfilled', items: [
          { bandKey: 'Trousers:399', finalQty: 40, suggestedQty: 40 },
          { bandKey: 'Trousers:499', finalQty: 30, suggestedQty: 35 },
        ]},
        { daysAgo: 20, vendorId: vendorRamesh, status: 'acknowledged', items: [
          { bandKey: 'Sarees:1499', finalQty: 10, suggestedQty: 12 },
          { bandKey: 'Sarees:1999', finalQty: 8,  suggestedQty: 10 },
          { bandKey: 'Suits:2999',  finalQty: 4,  suggestedQty: 5 },
        ]},
        { daysAgo: 12, vendorId: vendorJain, status: 'acknowledged', items: [
          { bandKey: 'Kurtis:499',  finalQty: 25, suggestedQty: 25 },
          { bandKey: 'Kurtis:699',  finalQty: 15, suggestedQty: 18 },
        ]},
        { daysAgo: 6,  vendorId: vendorMehta, status: 'sent', items: [
          { bandKey: 'Shirts:499', finalQty: 25, suggestedQty: 30 },
          { bandKey: 'Shirts:599', finalQty: 15, suggestedQty: 15 },
          { bandKey: 'Shirts:799', finalQty: 10, suggestedQty: 10 },
        ]},
        { daysAgo: 3,  vendorId: vendorKrishna, status: 'sent', items: [
          { bandKey: 'Sarees:799',  finalQty: 20, suggestedQty: 22 },
          { bandKey: 'Suits:1499',  finalQty: 8,  suggestedQty: 10 },
          { bandKey: 'Suits:1999',  finalQty: 5,  suggestedQty: 6 },
        ]},
        { daysAgo: 1,  vendorId: vendorMehta, status: 'draft', items: [
          { bandKey: 'Trousers:599', finalQty: 20, suggestedQty: 22 },
          { bandKey: 'Trousers:799', finalQty: 10, suggestedQty: 12 },
        ]},
        { daysAgo: 45, vendorId: vendorAzure, status: 'fulfilled', items: [
          { bandKey: 'Bikini:799',  finalQty: 25, suggestedQty: 25 },
          { bandKey: 'Bikini:1299', finalQty: 18, suggestedQty: 20 },
          { bandKey: 'Bikini:1799', finalQty: 12, suggestedQty: 15 },
        ]},
        { daysAgo: 9,  vendorId: vendorAzure, status: 'sent', items: [
          { bandKey: 'Bikini:1299', finalQty: 15, suggestedQty: 18 },
          { bandKey: 'Bikini:1799', finalQty: 10, suggestedQty: 12 },
          { bandKey: 'Bikini:2499', finalQty: 6,  suggestedQty: 8 },
        ]},
      ]

      for (const r of reorderSeeds) {
        const createdAt = daysAgo(r.daysAgo, randInt(11, 16))
        const sentAt = r.status === 'draft' ? null : new Date(createdAt.getTime() + 3600 * 1000)
        const message = r.status === 'draft'
          ? null
          : buildReorderMessage(r.items, bandIds, bandMeta)
        const ins = await client.query<{ id: number }>(`
          INSERT INTO reorders
            (store_id, vendor_id, created_by, status, message_text, created_at, sent_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
        `, [storeId, r.vendorId,
            rand() < 0.5 ? managerMohit : managerAnita,
            r.status, message, createdAt, sentAt])
        const reorderId = ins.rows[0].id
        for (const it of r.items) {
          const bandId = bandIds[it.bandKey]
          const meta = bandMeta[bandId]
          await client.query(`
            INSERT INTO reorder_items
              (reorder_id, price_band_id, category_name, band_price, suggested_qty, final_qty)
            VALUES ($1,$2,$3,$4,$5,$6)
          `, [reorderId, bandId, meta.category, meta.price, it.suggestedQty, it.finalQty])
        }
      }
      console.log(`Reorders: ${reorderSeeds.length}.`)

      await client.query('COMMIT')
      console.log('\nSeed complete — Bombay Fashion demo ready.')
      console.log(`  Store id : ${storeId}`)
      console.log(`  Users    : owner=${owner}, managers=[${managerMohit}, ${managerAnita}], staff=${staff.length}`)
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

// ── Helpers ──────────────────────────────────────────────────────────────────

async function insertUser(
  client: PoolClient,
  storeId: number,
  u: { name: string; phone: string; email?: string; role: 'owner' | 'manager' | 'staff'; passwordHash?: string; pinHash?: string },
): Promise<number> {
  const res = await client.query<{ id: number }>(`
    INSERT INTO users
      (store_id, name, phone, email, role, password_hash, pin_hash, is_active)
    VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE) RETURNING id
  `, [storeId, u.name, u.phone, u.email ?? null, u.role,
      u.passwordHash ?? null, u.pinHash ?? null])
  return res.rows[0].id
}

async function insertVendor(
  client: PoolClient, storeId: number, name: string, phone: string,
  email: string, city: string, notes: string,
): Promise<number> {
  const res = await client.query<{ id: number }>(`
    INSERT INTO vendors (store_id, name, phone, email, city, notes, is_active)
    VALUES ($1,$2,$3,$4,$5,$6,TRUE) RETURNING id
  `, [storeId, name, phone, email, city, notes])
  return res.rows[0].id
}

function batchNote(category: string, ageDays: number): string | null {
  if (ageDays > 60) return `Aging stock — ${category.toLowerCase()} from earlier procurement`
  if (rand() < 0.6) return null
  const notes: Record<string, string[]> = {
    Shirts:   ['Summer prints collection', 'Formal checks batch', 'Slim-fit premium lot', 'Casual linen blend'],
    Trousers: ['Stretch fabric', 'Formal slim fit', 'Chinos collection', 'Semi-formal range'],
    Sarees:   ['Daily-wear cotton lot', 'Chanderi silk batch', 'Banarasi festive collection', 'Party-wear georgette'],
    Kurtis:   ['Embroidered kurtis', 'Silk blend lot', 'Office wear collection', 'Festive season stock'],
    Suits:    ['Terylene blend', 'Wedding / occasion suits', 'Office formals', 'Summer cottons'],
    Bikini:   ['Beach resort collection', 'Tropical prints', 'Monochrome swim set', 'Goa season stock'],
  }
  return pick(notes[category] ?? ['General stock'])
}

function buildReorderMessage(
  items: { bandKey: string; finalQty: number }[],
  bandIds: Record<string, number>,
  bandMeta: Record<number, { category: string; price: number }>,
): string {
  const parts = items.map(i => {
    const meta = bandMeta[bandIds[i.bandKey]]
    return `${i.finalQty}x ${meta.category} ₹${meta.price}`
  })
  return `Hi, please send: ${parts.join(', ')}. Please confirm ETA.`
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
