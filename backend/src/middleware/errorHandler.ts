import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../errors/AppError'
import logger from '../logger'

interface PgError extends Error {
  code?: string
  detail?: string
  constraint?: string
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, code: err.code })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', details: err.flatten() })
    return
  }

  const pgErr = err as PgError
  if (pgErr?.code === '23505') {
    res.status(409).json({ error: 'Duplicate entry', detail: pgErr.detail })
    return
  }
  if (pgErr?.code === '23503') {
    res.status(400).json({ error: 'Referenced record not found' })
    return
  }
  if (pgErr?.code === '23514') {
    res.status(400).json({ error: 'Value violates check constraint', detail: pgErr.detail })
    return
  }

  if (err instanceof Error) {
    if (err.name === 'JsonWebTokenError') {
      res.status(401).json({ error: 'Invalid token' })
      return
    }
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expired' })
      return
    }
  }

  logger.error(err)
  res.status(500).json({ error: 'Internal server error' })
}
