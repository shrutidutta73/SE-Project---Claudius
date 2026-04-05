import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { authenticate, authorize } from '../middleware/auth'
import { listPriceBands, listPriceBandsWithStock, createPriceBand } from '../services/priceBands'

const router = Router()

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

const createPriceBandSchema = z.object({
  categoryId: z.number().int().positive(),
  price: z.number().positive(),
})

// GET /with-stock — must be registered before any /:id-style routes
router.get(
  '/with-stock',
  authenticate,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const bands = await listPriceBandsWithStock(req.user.storeId)
    res.json(bands)
  }),
)

// GET / — list active price bands for the authenticated store
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const bands = await listPriceBands(req.user.storeId)
    res.json(bands)
  }),
)

// POST / — create a new price band (owner or manager only)
router.post(
  '/',
  authenticate,
  authorize('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = createPriceBandSchema.parse(req.body)
    const band = await createPriceBand(req.user.storeId, body)
    res.status(201).json(band)
  }),
)

export default router
