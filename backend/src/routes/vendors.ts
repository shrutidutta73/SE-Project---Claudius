import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { AppError } from '../errors/AppError'
import { authenticate, authorize } from '../middleware/auth'
import {
  listVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  getSuggestOrder,
} from '../services/vendors'

const router = Router()

// ── Utility ──────────────────────────────────────────────────────────────────

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

// ── Schemas ──────────────────────────────────────────────────────────────────

const CreateVendorSchema = z.object({
  name: z.string().min(2, 'name must be at least 2 characters'),
  phone: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
})

const UpdateVendorSchema = z.object({
  name: z.string().min(2, 'name must be at least 2 characters').optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
})

// ── GET / ─────────────────────────────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const vendors = await listVendors(req.user.storeId)
    res.json(vendors)
  }),
)

// ── POST / ────────────────────────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  authorize('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = CreateVendorSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR')
    }
    const vendor = await createVendor(req.user.storeId, parsed.data)
    res.status(201).json(vendor)
  }),
)

// ── PATCH /:id ────────────────────────────────────────────────────────────────

router.patch(
  '/:id',
  authenticate,
  authorize('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const vendorId = parseInt(req.params.id, 10)
    if (isNaN(vendorId)) {
      throw new AppError('Invalid vendor id', 400, 'VALIDATION_ERROR')
    }

    const parsed = UpdateVendorSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR')
    }

    const vendor = await updateVendor(req.user.storeId, vendorId, parsed.data)
    res.json(vendor)
  }),
)

// ── DELETE /:id ───────────────────────────────────────────────────────────────

router.delete(
  '/:id',
  authenticate,
  authorize('owner'),
  asyncHandler(async (req: Request, res: Response) => {
    const vendorId = parseInt(req.params.id, 10)
    if (isNaN(vendorId)) {
      throw new AppError('Invalid vendor id', 400, 'VALIDATION_ERROR')
    }

    await deleteVendor(req.user.storeId, vendorId)
    res.json({ success: true })
  }),
)

// ── GET /:id/suggest-order ────────────────────────────────────────────────────

router.get(
  '/:id/suggest-order',
  authenticate,
  authorize('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const vendorId = parseInt(req.params.id, 10)
    if (isNaN(vendorId)) {
      throw new AppError('Invalid vendor id', 400, 'VALIDATION_ERROR')
    }

    const items = await getSuggestOrder(req.user.storeId, vendorId)
    res.json(items)
  }),
)

export default router
