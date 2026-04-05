import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { AppError } from '../errors/AppError'
import { registerStore, login } from '../services/auth'

const router = Router()

// ── Utility ──────────────────────────────────────────────────────────────────

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  shopName: z.string().min(1, 'shopName is required'),
  address: z.string().min(1, 'address is required'),
  logo: z.string().optional(),
  ownerName: z.string().min(1, 'ownerName is required'),
  email: z.string().email('Invalid email format'),
  phone: z
    .string()
    .regex(/^\d{10}$/, 'phone must be exactly 10 digits'),
  password: z.string().min(6, 'password must be at least 6 characters'),
})

const LoginSchema = z.object({
  identifier: z.string().min(1, 'identifier is required'),
  credential: z.string().min(1, 'credential is required'),
})

// ── POST /register ────────────────────────────────────────────────────────────

router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = RegisterSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR')
    }

    const result = await registerStore(parsed.data)
    res.status(201).json(result)
  }),
)

// ── POST /login ───────────────────────────────────────────────────────────────

router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = LoginSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR')
    }

    const result = await login(parsed.data)
    res.status(200).json(result)
  }),
)

export default router
