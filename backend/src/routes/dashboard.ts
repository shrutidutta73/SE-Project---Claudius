import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { AppError } from '../errors/AppError'
import { getSummary, getDailySummary } from '../services/dashboard'

const router = Router()

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next)

// GET /summary — weekly KPI summary (owner/manager only)
router.get(
  '/summary',
  authenticate,
  authorize('owner', 'manager'),
  asyncHandler(async (req, res) => {
    const summary = await getSummary(req.user.storeId)
    res.json(summary)
  }),
)

// GET /daily-summary — per-row daily sales data (owner/manager only)
// Query param: ?range=weekly|monthly  (default: weekly)
router.get(
  '/daily-summary',
  authenticate,
  authorize('owner', 'manager'),
  asyncHandler(async (req, res) => {
    const rawRange = req.query.range
    if (rawRange !== undefined && rawRange !== 'weekly' && rawRange !== 'monthly') {
      throw new AppError('Invalid range. Must be "weekly" or "monthly"', 400)
    }
    const range: 'weekly' | 'monthly' = (rawRange as 'weekly' | 'monthly') ?? 'weekly'
    const rows = await getDailySummary(req.user.storeId, range)
    res.json(rows)
  }),
)

export default router
