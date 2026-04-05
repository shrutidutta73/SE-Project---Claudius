import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { AppError } from '../errors/AppError'
import { authenticate } from '../middleware/auth'
import { createSale } from '../services/sales'

const router = Router()

// ── Utility ──────────────────────────────────────────────────────────────────

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

// ── Schemas ──────────────────────────────────────────────────────────────────

const CartItemSchema = z.object({
  priceBandId: z.number(),
  categoryName: z.string().min(1, 'categoryName is required'),
  price: z.number().positive('price must be positive'),
  quantity: z.number().int().min(1, 'quantity must be at least 1'),
  subtotal: z.number(),
})

const CreateSaleSchema = z.object({
  items: z.array(CartItemSchema).min(1, 'items must not be empty'),
  customerName: z.string().optional(),
  customerPhone: z
    .string()
    .regex(/^\d{10}$/, 'customerPhone must be exactly 10 digits')
    .optional(),
  paymentMethod: z.enum(['cash', 'upi', 'store_credit']),
  discountAmount: z.number().nonnegative('discountAmount must be non-negative').default(0),
})

// ── POST / ────────────────────────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = CreateSaleSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR')
    }

    const result = await createSale(req.user.storeId, req.user.userId, parsed.data)
    res.status(201).json(result)
  }),
)

export default router
