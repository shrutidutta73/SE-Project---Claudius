import express from 'express'
import cors from 'cors'
import pinoHttp from 'pino-http'
import logger from './logger'
import { errorHandler } from './middleware/errorHandler'

import authRouter from './routes/auth'
import storeRouter from './routes/store'
import usersRouter from './routes/users'
import categoriesRouter from './routes/categories'
import priceBandsRouter from './routes/priceBands'
import inventoryRouter from './routes/inventory'
import salesRouter from './routes/sales'
import attendanceRouter from './routes/attendance'
import staffRouter from './routes/staff'
import dashboardRouter from './routes/dashboard'
import vendorsRouter from './routes/vendors'
import reordersRouter from './routes/reorders'
import auditRouter from './routes/audit'
import returnsRouter from './routes/returns'

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' })) // 10mb for base64 logos/avatars
app.use(pinoHttp({ logger }))

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.use('/api/auth',       authRouter)
app.use('/api/store',      storeRouter)
app.use('/api/users',      usersRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/price-bands', priceBandsRouter)
app.use('/api/inventory',  inventoryRouter)
app.use('/api/sales',      salesRouter)
app.use('/api/attendance', attendanceRouter)
app.use('/api/staff',      staffRouter)
app.use('/api/dashboard',  dashboardRouter)
app.use('/api/vendors',    vendorsRouter)
app.use('/api/reorders',   reordersRouter)
app.use('/api/audit',      auditRouter)
app.use('/api/returns',    returnsRouter)

app.use(errorHandler)

export default app
