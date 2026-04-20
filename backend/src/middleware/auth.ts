import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../env'
import { AppError } from '../errors/AppError'

export interface JwtPayload {
  userId: number
  storeId: number
  role: 'owner' | 'manager' | 'staff'
}

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('No token provided', 401)
  }
  try {
    const token = header.slice(7)
    // Pin the algorithm — jsonwebtoken will otherwise accept whatever the
    // token's header claims, which is the classic alg-confusion vector.
    req.user = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload
    next()
  } catch {
    throw new AppError('Invalid or expired token', 401)
  }
}

export function authorize(...roles: Array<'owner' | 'manager' | 'staff'>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!roles.includes(req.user.role)) {
      throw new AppError('Insufficient permissions', 403)
    }
    next()
  }
}

export function signToken(payload: JwtPayload): string {
  return (jwt.sign as (p: object, s: string, o: object) => string)(
    payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN }
  )
}
