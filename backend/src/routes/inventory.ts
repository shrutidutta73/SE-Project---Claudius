import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { AppError } from '../errors/AppError'
import { authenticate, authorize } from '../middleware/auth'
import {
  listBatches,
  addBatch,
  updateBatch,
  getMatrix,
  type BatchFilter,
  type BatchAction,
} from '../services/inventory'

const router = Router()

// ── Utility ──────────────────────────────────────────────────────────────────

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

// ── Schemas ──────────────────────────────────────────────────────────────────

const FilterSchema = z
  .enum(['all', 'low_stock', 'aging', 'new_arrivals'])
  .default('all')

const AddBatchSchema = z.object({
  priceBandId: z.number({ required_error: 'priceBandId is required' }).int().positive(),
  vendorId: z.number().int().positive().optional(),
  quantityAdded: z
    .number({ required_error: 'quantityAdded is required' })
    .int()
    .min(1, 'quantityAdded must be at least 1'),
  costPrice: z.number().positive('costPrice must be positive').optional(),
  notes: z.string().optional(),
})

const UpdateBatchSchema = z.object({
  action: z.enum(['close', 'adjust', 'defective'], {
    required_error: 'action is required',
    invalid_type_error: "action must be 'close', 'adjust', or 'defective'",
  }),
  quantity: z.number().int().min(0, 'quantity must be >= 0').optional(),
})

// ── GET /batches ──────────────────────────────────────────────────────────────

router.get(
  '/batches',
  authenticate,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = FilterSchema.safeParse(req.query.filter)
    if (!parsed.success) {
      throw new AppError(
        parsed.error.errors[0].message,
        400,
        'VALIDATION_ERROR',
      )
    }
    const filter = parsed.data as BatchFilter
    const batches = await listBatches(req.user.storeId, filter)
    res.json(batches)
  }),
)

// ── POST /batches ─────────────────────────────────────────────────────────────

router.post(
  '/batches',
  authenticate,
  authorize('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = AddBatchSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(
        parsed.error.errors[0].message,
        400,
        'VALIDATION_ERROR',
      )
    }
    const batch = await addBatch(req.user.storeId, req.user.userId, parsed.data)
    res.status(201).json(batch)
  }),
)

// ── PATCH /batches/:id ────────────────────────────────────────────────────────

router.patch(
  '/batches/:id',
  authenticate,
  authorize('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const batchId = parseInt(req.params.id, 10)
    if (isNaN(batchId)) {
      throw new AppError('Invalid batch id', 400, 'VALIDATION_ERROR')
    }

    const parsed = UpdateBatchSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(
        parsed.error.errors[0].message,
        400,
        'VALIDATION_ERROR',
      )
    }

    const { action, quantity } = parsed.data
    const batch = await updateBatch(
      req.user.storeId,
      batchId,
      action as BatchAction,
      quantity !== undefined ? { quantity } : undefined,
    )
    res.json(batch)
  }),
)

// ── GET /matrix ───────────────────────────────────────────────────────────────

router.get(
  '/matrix',
  authenticate,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const matrix = await getMatrix(req.user.storeId)
    res.json(matrix)
  }),
)

export default router
