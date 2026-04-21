import type {
  Store, User, Category, PriceBand, PriceBandWithStock,
  Vendor, VendorWithDues, InventoryBatchDetail,
  StaffLeaderboardEntry, Reorder, DailySalesSummary,
  AuditLogEntry, SuggestOrderItem, MatrixRow,
} from '../types'

// ── Store ─────────────────────────────────────────────────────────────────────

export const MOCK_STORE: Store = {
  id: 1,
  name: 'Sharma Garments',
  address: '12, Main Market, Civil Lines, Prayagraj, UP',
  gpsLatitude: 25.4358,
  gpsLongitude: 81.8463,
  gpsRadiusM: 100,
  gpsRequireClockIn: false,
  gpsRequireClockOut: false,
  billingMode: 'ephemeral',
  retentionDays: 14,
  createdAt: '2024-01-15T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
}

// ── Users ─────────────────────────────────────────────────────────────────────

export const MOCK_USERS: User[] = [
  { id: 1, storeId: 1, name: 'Ramesh Sharma', phone: '9876543210', email: 'ramesh@sharmagarments.com', role: 'owner',   isActive: true, createdAt: '2024-01-15T00:00:00Z', updatedAt: '2024-01-15T00:00:00Z' },
  { id: 2, storeId: 1, name: 'Vikram Sharma', phone: '9876543211', email: 'vikram@sharmagarments.com', role: 'manager', isActive: true, createdAt: '2024-01-20T00:00:00Z', updatedAt: '2024-01-20T00:00:00Z' },
  { id: 3, storeId: 1, name: 'Rahul Kumar',   phone: '9876543212', email: null,                        role: 'staff',   isActive: true, createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-02-01T00:00:00Z' },
  { id: 4, storeId: 1, name: 'Priya Singh',   phone: '9876543213', email: null,                        role: 'staff',   isActive: true, createdAt: '2024-02-15T00:00:00Z', updatedAt: '2024-02-15T00:00:00Z' },
  { id: 5, storeId: 1, name: 'Amit Yadav',    phone: '9876543214', email: null,                        role: 'staff',   isActive: true, createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-03-01T00:00:00Z' },
]

// Logged in user (staff view by default; can switch to owner for testing)
export const MOCK_CURRENT_USER: User = MOCK_USERS[2] // Rahul Kumar (staff)

// ── Categories ────────────────────────────────────────────────────────────────

export const MOCK_CATEGORIES: Category[] = [
  { id: 1, storeId: 1, name: 'Shirts', createdAt: '2024-01-15T00:00:00Z' },
  { id: 2, storeId: 1, name: 'Sarees', createdAt: '2024-01-15T00:00:00Z' },
  { id: 3, storeId: 1, name: 'Jeans', createdAt: '2024-01-15T00:00:00Z' },
  { id: 4, storeId: 1, name: 'Kurti', createdAt: '2024-01-15T00:00:00Z' },
  { id: 5, storeId: 1, name: 'Sarees', createdAt: '2024-01-15T00:00:00Z' },
]

// ── Price Bands ────────────────────────────────────────────────────────────────

export const MOCK_PRICE_BANDS: PriceBand[] = [
  { id: 1,  storeId: 1, categoryId: 1, price: 250,  isActive: true, createdAt: '2024-01-15T00:00:00Z' },
  { id: 2,  storeId: 1, categoryId: 1, price: 350,  isActive: true, createdAt: '2024-01-15T00:00:00Z' },
  { id: 3,  storeId: 1, categoryId: 1, price: 500,  isActive: true, createdAt: '2024-01-15T00:00:00Z' },
  { id: 4,  storeId: 1, categoryId: 1, price: 750,  isActive: true, createdAt: '2024-01-15T00:00:00Z' },
  { id: 5,  storeId: 1, categoryId: 1, price: 1000, isActive: true, createdAt: '2024-01-15T00:00:00Z' },
  { id: 6,  storeId: 1, categoryId: 2, price: 500,  isActive: true, createdAt: '2024-01-15T00:00:00Z' },
  { id: 7,  storeId: 1, categoryId: 2, price: 750,  isActive: true, createdAt: '2024-01-15T00:00:00Z' },
  { id: 8,  storeId: 1, categoryId: 2, price: 1000, isActive: true, createdAt: '2024-01-15T00:00:00Z' },
  { id: 9,  storeId: 1, categoryId: 2, price: 1500, isActive: true, createdAt: '2024-01-15T00:00:00Z' },
  { id: 10, storeId: 1, categoryId: 3, price: 350,  isActive: true, createdAt: '2024-01-15T00:00:00Z' },
  { id: 11, storeId: 1, categoryId: 3, price: 500,  isActive: true, createdAt: '2024-01-15T00:00:00Z' },
  { id: 12, storeId: 1, categoryId: 3, price: 750,  isActive: true, createdAt: '2024-01-15T00:00:00Z' },
  { id: 13, storeId: 1, categoryId: 4, price: 250,  isActive: true, createdAt: '2024-01-15T00:00:00Z' },
  { id: 14, storeId: 1, categoryId: 4, price: 350,  isActive: true, createdAt: '2024-01-15T00:00:00Z' },
  { id: 15, storeId: 1, categoryId: 4, price: 500,  isActive: true, createdAt: '2024-01-15T00:00:00Z' },
]

const STOCK_MAP: Record<number, number> = {
  1: 45, 2: 30, 3: 89, 4: 12, 5: 5,
  6: 20, 7: 34, 8: 8, 9: 3,
  10: 0, 11: 15, 12: 4,
  13: 60, 14: 42, 15: 28,
}

export const MOCK_PRICE_BANDS_WITH_STOCK: PriceBandWithStock[] = MOCK_PRICE_BANDS.map(b => ({
  ...b,
  categoryName: MOCK_CATEGORIES.find(c => c.id === b.categoryId)?.name ?? '',
  totalStock: STOCK_MAP[b.id] ?? 0,
}))

// ── Vendors ────────────────────────────────────────────────────────────────────

export const MOCK_VENDORS: VendorWithDues[] = [
  {
    id: 1, storeId: 1, name: 'Sharma & Co', phone: '9811234567', email: null,
    city: 'Delhi', notes: 'Reliable, 3-day lead time', isActive: true,
    createdAt: '2024-01-20T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z',
    dues: 2400,
    suppliedBands: [
      { bandId: 1, price: 250, categoryName: 'Shirts' },
      { bandId: 3, price: 500, categoryName: 'Shirts' },
      { bandId: 4, price: 750, categoryName: 'Shirts' },
    ],
  },
  {
    id: 2, storeId: 1, name: 'Gupta Fabrics', phone: '9822345678', email: null,
    city: 'Mumbai', notes: 'Saree specialist', isActive: true,
    createdAt: '2024-02-01T00:00:00Z', updatedAt: '2026-02-15T00:00:00Z',
    dues: 0,
    suppliedBands: [
      { bandId: 6, price: 500, categoryName: 'Sarees' },
      { bandId: 7, price: 750, categoryName: 'Sarees' },
    ],
  },
  {
    id: 3, storeId: 1, name: 'Mehta Traders', phone: '9833456789', email: null,
    city: 'Kolkata', notes: 'Kurti & jeans', isActive: true,
    createdAt: '2024-02-10T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
    dues: 8100,
    suppliedBands: [
      { bandId: 10, price: 350, categoryName: 'Jeans' },
      { bandId: 13, price: 250, categoryName: 'Kurti' },
      { bandId: 15, price: 500, categoryName: 'Kurti' },
    ],
  },
]

// ── Inventory Batches ──────────────────────────────────────────────────────────

export const MOCK_BATCHES: InventoryBatchDetail[] = [
  { id: 1, storeId: 1, priceBandId: 3, vendorId: 1, vendorName: 'Sharma & Co', categoryName: 'Shirts', bandPrice: 500, quantityAdded: 50, quantityRemaining: 45, costPrice: 380, addedBy: 2, notes: null, createdAt: '2026-03-08T10:00:00Z', updatedAt: '2026-03-18T10:00:00Z', ageInDays: 12, margin: 24 },
  { id: 2, storeId: 1, priceBandId: 1, vendorId: 1, vendorName: 'Sharma & Co', categoryName: 'Shirts', bandPrice: 250, quantityAdded: 30, quantityRemaining: 8, costPrice: 180, addedBy: 2, notes: null, createdAt: '2026-01-08T10:00:00Z', updatedAt: '2026-03-18T10:00:00Z', ageInDays: 71, margin: 28 },
  { id: 3, storeId: 1, priceBandId: 7, vendorId: 2, vendorName: 'Gupta Fabrics', categoryName: 'Sarees', bandPrice: 750, quantityAdded: 40, quantityRemaining: 34, costPrice: 580, addedBy: 2, notes: 'Banarasi', createdAt: '2026-02-15T10:00:00Z', updatedAt: '2026-03-18T10:00:00Z', ageInDays: 33, margin: 23 },
  { id: 4, storeId: 1, priceBandId: 10, vendorId: 3, vendorName: 'Mehta Traders', categoryName: 'Jeans', bandPrice: 350, quantityAdded: 20, quantityRemaining: 0, costPrice: 300, addedBy: 2, notes: null, createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-03-18T10:00:00Z', ageInDays: 78, margin: 14 },
  { id: 5, storeId: 1, priceBandId: 13, vendorId: 3, vendorName: 'Mehta Traders', categoryName: 'Kurti', bandPrice: 250, quantityAdded: 80, quantityRemaining: 60, costPrice: 170, addedBy: 2, notes: null, createdAt: '2026-03-15T10:00:00Z', updatedAt: '2026-03-18T10:00:00Z', ageInDays: 5, margin: 32 },
  { id: 6, storeId: 1, priceBandId: 15, vendorId: 3, vendorName: 'Mehta Traders', categoryName: 'Kurti', bandPrice: 500, quantityAdded: 35, quantityRemaining: 28, costPrice: 430, addedBy: 2, notes: null, createdAt: '2026-03-10T10:00:00Z', updatedAt: '2026-03-18T10:00:00Z', ageInDays: 10, margin: 14 },
]

// ── Matrix View ────────────────────────────────────────────────────────────────

export const MOCK_MATRIX_ROWS: MatrixRow[] = [
  { categoryId: 1, categoryName: 'Shirts',  bands: { '250': 45, '350': 30, '500': 89, '750': 12, '1000': 5 } },
  { categoryId: 2, categoryName: 'Sarees',  bands: { '500': 20, '750': 34, '1000': 8, '1500': 3 } },
  { categoryId: 3, categoryName: 'Jeans',   bands: { '350': 0,  '500': 15, '750': 4 } },
  { categoryId: 4, categoryName: 'Kurti',   bands: { '250': 60, '350': 42, '500': 28 } },
]

// ── Staff Leaderboard ──────────────────────────────────────────────────────────

export const MOCK_LEADERBOARD: StaffLeaderboardEntry[] = [
  { userId: 3, name: 'Rahul Kumar', role: 'staff', isActive: true, clockedIn: true, checkInAt: '2026-03-20T09:02:00Z', revenueToday: 12400, salesCountToday: 8 },
  { userId: 4, name: 'Priya Singh', role: 'staff', isActive: true, clockedIn: true, checkInAt: '2026-03-20T09:15:00Z', revenueToday: 9800, salesCountToday: 6 },
  { userId: 5, name: 'Amit Yadav',  role: 'staff', isActive: true, clockedIn: false, checkInAt: null, revenueToday: 0, salesCountToday: 0 },
  { userId: 2, name: 'Vikram Sharma', role: 'manager', isActive: true, clockedIn: true, checkInAt: '2026-03-20T08:45:00Z', revenueToday: 7200, salesCountToday: 5 },
]

// ── Reorders ───────────────────────────────────────────────────────────────────

export const MOCK_REORDERS: Reorder[] = [
  {
    id: 1, storeId: 1, vendorId: 1, vendorName: 'Sharma & Co', createdBy: 2,
    status: 'sent',
    messageText: 'Hi Sharma & Co, please send: 70x Shirts ₹250, 59x Shirts ₹500. Total est. ₹45,550. Please confirm.',
    createdAt: '2026-03-18T11:00:00Z', sentAt: '2026-03-18T11:05:00Z',
    items: [
      { id: 1, reorderId: 1, priceBandId: 1, categoryName: 'Shirts', bandPrice: 250, suggestedQty: 70, finalQty: 70 },
      { id: 2, reorderId: 1, priceBandId: 3, categoryName: 'Shirts', bandPrice: 500, suggestedQty: 59, finalQty: 59 },
    ],
  },
  {
    id: 2, storeId: 1, vendorId: 3, vendorName: 'Mehta Traders', createdBy: 2,
    status: 'draft',
    messageText: null,
    createdAt: '2026-03-20T10:00:00Z', sentAt: null,
    items: [
      { id: 3, reorderId: 2, priceBandId: 10, categoryName: 'Jeans', bandPrice: 350, suggestedQty: 30, finalQty: 30 },
    ],
  },
]

// ── Suggest Order ──────────────────────────────────────────────────────────────

export const MOCK_SUGGEST_ORDERS: Record<number, SuggestOrderItem[]> = {
  1: [
    { priceBandId: 1, categoryName: 'Shirts', bandPrice: 250, dailyAvg: 8.2, currentStock: 45, suggestedQty: 70 },
    { priceBandId: 3, categoryName: 'Shirts', bandPrice: 500, dailyAvg: 5.1, currentStock: 12, suggestedQty: 59 },
    { priceBandId: 4, categoryName: 'Shirts', bandPrice: 750, dailyAvg: 1.8, currentStock: 12, suggestedQty: 13 },
  ],
  2: [
    { priceBandId: 6, categoryName: 'Sarees', bandPrice: 500, dailyAvg: 2.1, currentStock: 20, suggestedQty: 9 },
    { priceBandId: 7, categoryName: 'Sarees', bandPrice: 750, dailyAvg: 3.2, currentStock: 34, suggestedQty: 11 },
  ],
  3: [
    { priceBandId: 10, categoryName: 'Jeans', bandPrice: 350, dailyAvg: 2.2, currentStock: 0, suggestedQty: 31 },
    { priceBandId: 13, categoryName: 'Kurti', bandPrice: 250, dailyAvg: 6.5, currentStock: 60, suggestedQty: 31 },
    { priceBandId: 15, categoryName: 'Kurti', bandPrice: 500, dailyAvg: 3.0, currentStock: 28, suggestedQty: 14 },
  ],
}

// ── Daily Sales Summary (last 7 days) ─────────────────────────────────────────

function makeDailySummary(): DailySalesSummary[] {
  const rows: DailySalesSummary[] = []
  const baseRevenues: Record<number, number> = { 3: 6000, 7: 5000, 15: 3500, 13: 2000 }
  let id = 1
  for (let d = 6; d >= 0; d--) {
    const date = new Date('2026-03-20')
    date.setDate(date.getDate() - d)
    const dateStr = date.toISOString().split('T')[0]
    const factor = 0.7 + Math.random() * 0.6
    Object.entries(baseRevenues).forEach(([bandIdStr, base]) => {
      const bandId = Number(bandIdStr)
      const band = MOCK_PRICE_BANDS.find(b => b.id === bandId)!
      const cat = MOCK_CATEGORIES.find(c => c.id === band.categoryId)!
      const revenue = Math.round(base * factor)
      const qty = Math.round(revenue / band.price)
      rows.push({
        id: id++, storeId: 1, date: dateStr,
        priceBandId: bandId, categoryName: cat.name, bandPrice: band.price,
        totalQtySold: qty, totalRevenue: revenue, totalReturns: 0, totalRefunds: 0,
      })
    })
  }
  return rows
}

export const MOCK_DAILY_SUMMARY = makeDailySummary()

// ── Audit Log ──────────────────────────────────────────────────────────────────

export const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  { id: 1, timestamp: '2026-03-20T03:00:00Z', type: 'auto', recordsPruned: 1247 },
  { id: 2, timestamp: '2026-03-06T03:00:00Z', type: 'auto', recordsPruned: 892 },
  { id: 3, timestamp: '2026-02-20T03:00:00Z', type: 'auto', recordsPruned: 1034 },
  { id: 4, timestamp: '2026-02-14T11:32:00Z', type: 'manual', recordsPruned: 3104 },
]
