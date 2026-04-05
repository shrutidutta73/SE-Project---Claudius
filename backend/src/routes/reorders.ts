import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { AppError } from '../errors/AppError'
import { authenticate, authorize } from '../middleware/auth'
import { listReorders, createReorder, updateReorderStatus } from '../services/reorders'

const router = Router()

// ── Utility ──────────────────────────────────────────────────────────────────

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

// ── Schemas ──────────────────────────────────────────────────────────────────

const CreateReorderSchema = z.object({
  vendorId: z.number(),
  items: z.array(
    z.object({
      priceBandId: z.number(),
      categoryName: z.string(),
      bandPrice: z.number(),
      suggestedQty: z.number().int().min(0),
      finalQty: z.number().int().min(0),
    }),
  ),
})

const UpdateReorderStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'acknowledged', 'fulfilled']),
})

// ── GET / ─────────────────────────────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  authorize('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const reorders = await listReorders(req.user.storeId)
    res.json(reorders)
  }),
)

// ── POST / ────────────────────────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  authorize('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = CreateReorderSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR')
    }

    const reorder = await createReorder(req.user.storeId, req.user.userId, parsed.data)
    res.status(201).json(reorder)
  }),
)

// ── PATCH /:id/status ─────────────────────────────────────────────────────────

router.patch(
  '/:id/status',
  authenticate,
  authorize('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const reorderId = parseInt(req.params.id, 10)
    if (isNaN(reorderId)) {
      throw new AppError('Invalid reorder id', 400, 'VALIDATION_ERROR')
    }

    const parsed = UpdateReorderStatusSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR')
    }

    const reorder = await updateReorderStatus(req.user.storeId, reorderId, parsed.data.status)
    res.json(reorder)
  }),
)

export default router
