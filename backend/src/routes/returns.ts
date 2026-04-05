import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { AppError } from '../errors/AppError'
import { authenticate, authorize } from '../middleware/auth'
import { createReturn, listReturns } from '../services/returns'

const router = Router()

// ── Utility ──────────────────────────────────────────────────────────────────

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

// ── Schemas ──────────────────────────────────────────────────────────────────

const CreateReturnSchema = z.object({
  saleId: z.number().int().positive('saleId must be a positive integer'),
  type: z.enum(['return', 'exchange']),
  items: z
    .array(
      z.object({
        saleItemId: z.number().int().positive('saleItemId must be a positive integer'),
        quantity: z.number().int().min(1, 'quantity must be at least 1'),
      }),
    )
    .min(1, 'items must not be empty'),
})

// ── GET / ─────────────────────────────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  authorize('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const returns = await listReturns(req.user.storeId)
    res.json(returns)
  }),
)

// ── POST / ────────────────────────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = CreateReturnSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR')
    }

    const result = await createReturn(req.user.storeId, req.user.userId, parsed.data)
    res.status(201).json(result)
  }),
)

export default router
