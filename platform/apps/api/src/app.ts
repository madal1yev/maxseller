import express, { type ErrorRequestHandler } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { config } from './config.js'
import { registerEventsClient } from './events.js'
import { publicRouter } from './routes/public.js'
import { authRouter } from './routes/auth.js'
import { ordersRouter } from './routes/orders.js'
import { adminAuthRouter, adminRouter } from './routes/admin.js'
import { adminExtraRouter } from './routes/admin-extra.js'

export function createApp() {
  const app = express()

  app.set('trust proxy', 1)
  app.use(helmet({ crossOriginResourcePolicy: false }))
  app.use(cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  }))
  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: true }))

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  })
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: 'Juda ko\'p urinish. Keyinroq qayta urining.' },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  })
  app.use('/api', apiLimiter)
  app.use('/api/auth', authLimiter)
  app.use('/api/admin/auth', authLimiter)

  app.get('/api/events', registerEventsClient)

  app.use('/api', publicRouter)
  app.use('/api/auth', authRouter)
  app.use('/api', ordersRouter)
  app.use('/api/admin/auth', adminAuthRouter)
  app.use('/api/admin', adminRouter)
  app.use('/api/admin', adminExtraRouter)

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint topilmadi' }))

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err?.name === 'MulterError' || err?.message?.includes('Fayl formati')) {
      return res.status(400).json({ error: err.message })
    }
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Fayl juda katta' })
    }
    console.error('[API ERROR]', err)
    res.status(500).json({ error: 'Server xatosi' })
  }
  app.use(errorHandler)

  return app
}
