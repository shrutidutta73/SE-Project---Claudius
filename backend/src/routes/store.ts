import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authenticate, authorize } from '../middleware/auth'
import {
  getStore,
  updateStore,
  updateBillingMode,
  updateRetention,
  updateGpsSettings,
} from '../services/store'

const router = Router()

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next)

// Zod schemas

const UpdateStoreSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  logo: z.string().optional(),
})

const UpdateBillingModeSchema = z.object({
  billingMode: z.enum(['structured', 'ephemeral']),
  // Optional: pass a retention window along with the mode change so the
  // backend can apply both atomically (esp. when backdate=true needs to
  // compute expires_at for ephemeral).
  retentionDays: z.union([z.literal(7), z.literal(14), z.literal(30), z.literal(90)]).optional(),
  // When true, existing sales are rewritten to match the new mode.
  // Ephemeral: is_ephemeral=TRUE + expires_at = created_at + retention.
  // Structured: is_ephemeral=FALSE + expires_at=NULL.
  backdate: z.boolean().optional().default(false),
})

const UpdateRetentionSchema = z.object({
  retentionDays: z.union([z.literal(7), z.literal(14), z.literal(30), z.literal(90), z.null()]),
})

const UpdateGpsSettingsSchema = z.object({
  gpsLatitude: z.number().min(-90).max(90),
  gpsLongitude: z.number().min(-180).max(180),
  gpsRadiusM: z.number().positive(),
  gpsRequireClockIn: z.boolean().default(false),
  gpsRequireClockOut: z.boolean().default(false),
})

// GET / — get own store
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const store = await getStore(req.user.storeId)
    res.json(store)
  }),
)

// PATCH / — update store name/address/logo
router.patch(
  '/',
  authenticate,
  authorize('owner'),
  asyncHandler(async (req, res) => {
    const body = UpdateStoreSchema.parse(req.body)
    const store = await updateStore(req.user.storeId, body)
    res.json(store)
  }),
)

// PATCH /billing-mode
router.patch(
  '/billing-mode',
  authenticate,
  authorize('owner'),
  asyncHandler(async (req, res) => {
    const body = UpdateBillingModeSchema.parse(req.body)
    const store = await updateBillingMode(req.user.storeId, body.billingMode, {
      retentionDays: body.retentionDays,
      backdate: body.backdate,
    })
    res.json(store)
  }),
)

// PATCH /retention
router.patch(
  '/retention',
  authenticate,
  authorize('owner'),
  asyncHandler(async (req, res) => {
    const { retentionDays } = UpdateRetentionSchema.parse(req.body)
    const store = await updateRetention(req.user.storeId, retentionDays)
    res.json(store)
  }),
)

// PATCH /gps-settings
// Managers can toggle GPS enforcement policy (and keep the existing coords)
// alongside owners, who remain the only role able to edit store settings at
// large. This mirrors the Staff page UX where managers control day-to-day
// attendance rules for their team.
router.patch(
  '/gps-settings',
  authenticate,
  authorize('owner', 'manager'),
  asyncHandler(async (req, res) => {
    const body = UpdateGpsSettingsSchema.parse(req.body)
    const store = await updateGpsSettings(req.user.storeId, body)
    res.json(store)
  }),
)

export default router
