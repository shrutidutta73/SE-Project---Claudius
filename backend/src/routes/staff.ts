import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { authenticate } from '../middleware/auth'
import { getLeaderboard } from '../services/staff'

const router = Router()

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next)

// GET /leaderboard — staff leaderboard for today
router.get(
  '/leaderboard',
  authenticate,
  asyncHandler(async (req, res) => {
    const leaderboard = await getLeaderboard(req.user.storeId)
    res.json(leaderboard)
  }),
)

export default router
