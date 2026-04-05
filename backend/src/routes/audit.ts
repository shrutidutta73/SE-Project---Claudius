import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { AppError } from '../errors/AppError'
import { authenticate, authorize } from '../middleware/auth'
import { getAuditLog, wipeEphemeralData } from '../services/audit'

const router = Router()

// ── Utility ──────────────────────────────────────────────────────────────────

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

// ── Schemas ──────────────────────────────────────────────────────────────────

const WipeSchema = z.object({
  password: z.string().min(1, 'password is required'),
})

// ── GET /log ──────────────────────────────────────────────────────────────────

router.get(
  '/log',
  authenticate,
  authorize('owner'),
  asyncHandler(async (req: Request, res: Response) => {
    const log = await getAuditLog(req.user.storeId)
    res.json(log)
  }),
)

// ── POST /wipe ────────────────────────────────────────────────────────────────

router.post(
  '/wipe',
  authenticate,
  authorize('owner'),
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = WipeSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR')
    }

    const entry = await wipeEphemeralData(req.user.storeId, parsed.data.password)
    res.json(entry)
  }),
)

export default router
