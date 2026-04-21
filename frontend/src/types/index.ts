import { z } from 'zod'

// ── Enums ────────────────────────────────────────────────────────────────────

export const RoleSchema = z.enum(['owner', 'manager', 'staff'])
export type Role = z.infer<typeof RoleSchema>

export const BillingModeSchema = z.enum(['structured', 'ephemeral'])
export type BillingMode = z.infer<typeof BillingModeSchema>

export const PaymentMethodSchema = z.enum(['cash', 'upi', 'store_credit'])
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>

export const ReorderStatusSchema = z.enum(['draft', 'sent', 'acknowledged', 'fulfilled'])
export type ReorderStatus = z.infer<typeof ReorderStatusSchema>

export const ReturnTypeSchema = z.enum(['return', 'exchange'])
export type ReturnType = z.infer<typeof ReturnTypeSchema>

export const BatchFilterSchema = z.enum(['all', 'low_stock', 'aging', 'new_arrivals'])
export type BatchFilter = z.infer<typeof BatchFilterSchema>

// ── Store ────────────────────────────────────────────────────────────────────

export const StoreSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string(),
  logo: z.string().nullable().optional(),
  gpsLatitude: z.number(),
  gpsLongitude: z.number(),
  gpsRadiusM: z.number(),
  gpsRequireClockIn: z.boolean().optional().default(false),
  gpsRequireClockOut: z.boolean().optional().default(false),
  billingMode: BillingModeSchema,
  retentionDays: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Store = z.infer<typeof StoreSchema>

// ── User ─────────────────────────────────────────────────────────────────────

export const UserSchema = z.object({
  id: z.number(),
  storeId: z.number(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  role: RoleSchema,
  isActive: z.boolean(),
  avatar: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type User = z.infer<typeof UserSchema>

// ── Category ─────────────────────────────────────────────────────────────────

export const CategorySchema = z.object({
  id: z.number(),
  storeId: z.number(),
  name: z.string(),
  createdAt: z.string(),
})
export type Category = z.infer<typeof CategorySchema>

// ── PriceBand ────────────────────────────────────────────────────────────────

export const PriceBandSchema = z.object({
  id: z.number(),
  storeId: z.number(),
  categoryId: z.number(),
  price: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
})
export type PriceBand = z.infer<typeof PriceBandSchema>

export const PriceBandWithStockSchema = PriceBandSchema.extend({
  categoryName: z.string(),
  totalStock: z.number(),
})
export type PriceBandWithStock = z.infer<typeof PriceBandWithStockSchema>

// ── Vendor ───────────────────────────────────────────────────────────────────

export const VendorSchema = z.object({
  id: z.number(),
  storeId: z.number(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  city: z.string().nullable(),
  notes: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Vendor = z.infer<typeof VendorSchema>

export const VendorWithDuesSchema = VendorSchema.extend({
  dues: z.number(),
  suppliedBands: z.array(z.object({ bandId: z.number(), price: z.number(), categoryName: z.string() })),
})
export type VendorWithDues = z.infer<typeof VendorWithDuesSchema>

// ── InventoryBatch ────────────────────────────────────────────────────────────

export const InventoryBatchSchema = z.object({
  id: z.number(),
  storeId: z.number(),
  priceBandId: z.number(),
  vendorId: z.number().nullable(),
  quantityAdded: z.number(),
  quantityRemaining: z.number(),
  costPrice: z.number().nullable(),
  addedBy: z.number().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type InventoryBatch = z.infer<typeof InventoryBatchSchema>

export const InventoryBatchDetailSchema = InventoryBatchSchema.extend({
  vendorName: z.string().nullable(),
  categoryName: z.string(),
  bandPrice: z.number(),
  ageInDays: z.number(),
  margin: z.number().nullable(),
})
export type InventoryBatchDetail = z.infer<typeof InventoryBatchDetailSchema>

// ── Customer ─────────────────────────────────────────────────────────────────

export const CustomerSchema = z.object({
  id: z.number(),
  storeId: z.number(),
  name: z.string().nullable(),
  phone: z.string(),
  createdAt: z.string(),
})
export type Customer = z.infer<typeof CustomerSchema>

// ── Cart (frontend only) ─────────────────────────────────────────────────────

export const CartItemSchema = z.object({
  priceBandId: z.number(),
  categoryName: z.string(),
  price: z.number(),
  quantity: z.number(),
  subtotal: z.number(),
})
export type CartItem = z.infer<typeof CartItemSchema>

// ── Sale ─────────────────────────────────────────────────────────────────────

export const SaleSchema = z.object({
  id: z.number(),
  storeId: z.number(),
  customerId: z.number().nullable(),
  staffId: z.number(),
  totalAmount: z.number(),
  discountAmount: z.number(),
  paymentMethod: PaymentMethodSchema,
  isEphemeral: z.boolean(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
})
export type Sale = z.infer<typeof SaleSchema>

// ── Attendance ────────────────────────────────────────────────────────────────

export const AttendanceSchema = z.object({
  id: z.number(),
  storeId: z.number(),
  userId: z.number(),
  date: z.string(),
  checkInAt: z.string(),
  checkOutAt: z.string().nullable(),
  checkInLat: z.number(),
  checkInLng: z.number(),
  checkOutLat: z.number().nullable(),
  checkOutLng: z.number().nullable(),
})
export type Attendance = z.infer<typeof AttendanceSchema>

// ── Staff Leaderboard ─────────────────────────────────────────────────────────

export const StaffLeaderboardEntrySchema = z.object({
  userId: z.number(),
  name: z.string(),
  role: RoleSchema,
  isActive: z.boolean(),
  clockedIn: z.boolean(),
  checkInAt: z.string().nullable(),
  checkOutAt: z.string().nullable().optional(),
  revenueToday: z.number(),
  salesCountToday: z.number(),
})
export type StaffLeaderboardEntry = z.infer<typeof StaffLeaderboardEntrySchema>

// ── Reorder ───────────────────────────────────────────────────────────────────

export const ReorderItemSchema = z.object({
  id: z.number(),
  reorderId: z.number(),
  priceBandId: z.number(),
  categoryName: z.string(),
  bandPrice: z.number(),
  suggestedQty: z.number(),
  finalQty: z.number(),
})
export type ReorderItem = z.infer<typeof ReorderItemSchema>

export const ReorderSchema = z.object({
  id: z.number(),
  storeId: z.number(),
  vendorId: z.number(),
  vendorName: z.string(),
  createdBy: z.number(),
  status: ReorderStatusSchema,
  messageText: z.string().nullable(),
  createdAt: z.string(),
  sentAt: z.string().nullable(),
  items: z.array(ReorderItemSchema),
})
export type Reorder = z.infer<typeof ReorderSchema>

// ── Daily Sales Summary ────────────────────────────────────────────────────────

export const DailySalesSummarySchema = z.object({
  id: z.number(),
  storeId: z.number(),
  date: z.string(),
  priceBandId: z.number(),
  categoryName: z.string(),
  bandPrice: z.number(),
  totalQtySold: z.number(),
  totalRevenue: z.number(),
  totalReturns: z.number(),
  totalRefunds: z.number(),
})
export type DailySalesSummary = z.infer<typeof DailySalesSummarySchema>

// ── Audit Log ─────────────────────────────────────────────────────────────────

export const AuditLogEntrySchema = z.object({
  id: z.number(),
  timestamp: z.string(),
  type: z.enum(['auto', 'manual']),
  recordsPruned: z.number(),
})
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>

// ── Suggest Order ─────────────────────────────────────────────────────────────

export const SuggestOrderItemSchema = z.object({
  priceBandId: z.number(),
  categoryName: z.string(),
  bandPrice: z.number(),
  dailyAvg: z.number(),
  currentStock: z.number(),
  suggestedQty: z.number(),
})
export type SuggestOrderItem = z.infer<typeof SuggestOrderItemSchema>

// ── Matrix View ────────────────────────────────────────────────────────────────

export const MatrixRowSchema = z.object({
  categoryId: z.number(),
  categoryName: z.string(),
  bands: z.record(z.string(), z.number()), // price -> totalStock
})
export type MatrixRow = z.infer<typeof MatrixRowSchema>

// ── Forms ─────────────────────────────────────────────────────────────────────

export const AddBatchFormSchema = z.object({
  vendorId: z.number({ required_error: 'Select a vendor' }),
  categoryId: z.number({ required_error: 'Select a category' }),
  priceBandId: z.number({ required_error: 'Select a price band' }),
  costPrice: z.number().min(1, 'Cost price required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  notes: z.string().optional(),
})
export type AddBatchForm = z.infer<typeof AddBatchFormSchema>

export const AddStaffFormSchema = z.object({
  name: z.string().min(2, 'Name required'),
  phone: z.string().min(10, 'Valid phone required'),
  role: RoleSchema,
})
export type AddStaffForm = z.infer<typeof AddStaffFormSchema>

export const AddVendorFormSchema = z.object({
  name: z.string().min(2, 'Name required'),
  phone: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
})
export type AddVendorForm = z.infer<typeof AddVendorFormSchema>
