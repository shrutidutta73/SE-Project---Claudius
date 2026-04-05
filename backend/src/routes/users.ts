import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authenticate, authorize } from '../middleware/auth'
import { AppError } from '../errors/AppError'
import {
  listUsers,
  addUser,
  updateUser,
  deleteUser,
  updatePassword,
  updatePin,
  updateAvatar,
} from '../services/users'

const router = Router()

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next)

// Zod schemas

const AddUserSchema = z
  .object({
    name: z.string().min(1),
    phone: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
    role: z.enum(['owner', 'manager', 'staff']),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    pin: z
      .string()
      .regex(/^\d{4}$/, 'PIN must be exactly 4 digits')
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'staff') {
      if (!data.pin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PIN is required for staff',
          path: ['pin'],
        })
      }
    }
    if (data.role === 'manager' || data.role === 'owner') {
      if (!data.password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Password is required for manager/owner',
          path: ['password'],
        })
      }
    }
  })

const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits').optional(),
  email: z.string().email().optional(),
})

const UpdatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
})

const UpdatePinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
})

const UpdateAvatarSchema = z.object({
  avatar: z.string().min(1),
})

// GET / — list active users in the store
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const users = await listUsers(req.user.storeId)
    res.json(users)
  }),
)

// POST / — add a new user
router.post(
  '/',
  authenticate,
  authorize('owner', 'manager'),
  asyncHandler(async (req, res) => {
    const body = AddUserSchema.parse(req.body)
    const user = await addUser(req.user.storeId, body)
    res.status(201).json(user)
  }),
)

// PATCH /:id — update user name/phone/email
router.patch(
  '/:id',
  authenticate,
  authorize('owner', 'manager'),
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id, 10)
    if (isNaN(userId)) throw new AppError('Invalid user ID', 400)
    const body = UpdateUserSchema.parse(req.body)
    const user = await updateUser(req.user.storeId, userId, body)
    res.json(user)
  }),
)

// DELETE /:id — soft-delete a user (owner only)
router.delete(
  '/:id',
  authenticate,
  authorize('owner'),
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id, 10)
    if (isNaN(userId)) throw new AppError('Invalid user ID', 400)
    await deleteUser(req.user.storeId, userId)
    res.json({ message: 'User deactivated successfully' })
  }),
)

// PATCH /:id/password — change password (owner/manager validated in service)
router.patch(
  '/:id/password',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id, 10)
    if (isNaN(userId)) throw new AppError('Invalid user ID', 400)

    // Only owner or manager may change passwords (or the user themselves if manager/owner role)
    const { role, userId: requestingUserId } = req.user
    if (role !== 'owner' && role !== 'manager' && requestingUserId !== userId) {
      throw new AppError('Insufficient permissions', 403)
    }

    const body = UpdatePasswordSchema.parse(req.body)
    await updatePassword(req.user.storeId, userId, body)
    res.json({ message: 'Password updated successfully' })
  }),
)

// PATCH /:id/pin — change staff PIN
router.patch(
  '/:id/pin',
  authenticate,
  authorize('owner', 'manager'),
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id, 10)
    if (isNaN(userId)) throw new AppError('Invalid user ID', 400)
    const body = UpdatePinSchema.parse(req.body)
    await updatePin(req.user.storeId, userId, body)
    res.json({ message: 'PIN updated successfully' })
  }),
)

// PATCH /:id/avatar — update avatar (user can update own; owner/manager can update any)
router.patch(
  '/:id/avatar',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id, 10)
    if (isNaN(userId)) throw new AppError('Invalid user ID', 400)

    // Allow updating own avatar, or owner/manager can update anyone's
    const { role, userId: requestingUserId } = req.user
    if (role !== 'owner' && role !== 'manager' && requestingUserId !== userId) {
      throw new AppError('Insufficient permissions', 403)
    }

    const { avatar } = UpdateAvatarSchema.parse(req.body)
    const user = await updateAvatar(req.user.storeId, userId, avatar)
    res.json(user)
  }),
)

export default router
