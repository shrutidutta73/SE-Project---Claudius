import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { authenticate, authorize } from '../middleware/auth'
import { listCategories, createCategory } from '../services/categories'

const router = Router()

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

const createCategorySchema = z.object({
  name: z.string().min(1),
})

// GET / — list all categories for the authenticated store
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const categories = await listCategories(req.user.storeId)
    res.json(categories)
  }),
)

// POST / — create a new category (owner or manager only)
router.post(
  '/',
  authenticate,
  authorize('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = createCategorySchema.parse(req.body)
    const category = await createCategory(req.user.storeId, body.name)
    res.status(201).json(category)
  }),
)

export default router
