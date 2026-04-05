import { z } from 'zod'
import dotenv from 'dotenv'
dotenv.config()

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
})

export const env = EnvSchema.parse(process.env)
