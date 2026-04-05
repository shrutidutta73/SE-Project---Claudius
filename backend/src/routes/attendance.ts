import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { AppError } from '../errors/AppError'
import { authenticate, authorize } from '../middleware/auth'
import { clockIn, clockOut, forceClockOut, getTodayRoster } from '../services/attendance'

const router = Router()

// ── Utility ──────────────────────────────────────────────────────────────────

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

// ── Schemas ──────────────────────────────────────────────────────────────────

const GpsBodySchema = z.object({
  lat: z.number(),
  lng: z.number(),
})

// ── GET /today ────────────────────────────────────────────────────────────────

router.get(
  '/today',
  authenticate,
  authorize('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const roster = await getTodayRoster(req.user.storeId)
    res.status(200).json(roster)
  }),
)

// ── POST /clock-in ────────────────────────────────────────────────────────────

router.post(
  '/clock-in',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = GpsBodySchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR')
    }

    const result = await clockIn(req.user.storeId, req.user.userId, parsed.data)
    res.status(200).json(result)
  }),
)

// ── POST /clock-out ───────────────────────────────────────────────────────────

router.post(
  '/clock-out',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = GpsBodySchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR')
    }

    const result = await clockOut(req.user.storeId, req.user.userId, parsed.data)
    res.status(200).json(result)
  }),
)

// ── PATCH /force-clockout/:userId ─────────────────────────────────────────────

router.patch(
  '/force-clockout/:userId',
  authenticate,
  authorize('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const targetUserId = parseInt(req.params.userId, 10)
    if (isNaN(targetUserId)) {
      throw new AppError('Invalid userId', 400, 'VALIDATION_ERROR')
    }

    const result = await forceClockOut(req.user.storeId, targetUserId)
    res.status(200).json(result)
  }),
)

export default router
