import app from './app'
import { env } from './env'
import logger from './logger'
import pool from './pool'

const server = app.listen(env.PORT, () => {
  logger.info(`SmallBiz backend running on port ${env.PORT} [${env.NODE_ENV}]`)
})

async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully`)
  server.close(async () => {
    await pool.end()
    logger.info('DB pool closed')
    process.exit(0)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT',  () => gracefulShutdown('SIGINT'))
