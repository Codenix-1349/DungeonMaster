import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config.js'
import { pool } from './db/pool.js'
import { runMigrations } from './db/migrate.js'

import authRoutes from './routes/auth.js'
import characterRoutes from './routes/characters.js'
import adventureRoutes from './routes/adventures.js'
import sessionRoutes from './routes/sessions.js'
import apiConfigRoutes from './routes/apiConfig.js'
import chatRoutes from './routes/chat.js'
import { errorHandler } from './middleware/errorHandler.js'
import { verifyEmailTransport } from './services/email.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '../../dist')

const app = express()

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}))
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '5mb' }))

// Strip /api prefix so both /api/auth and /auth reach the same routes
app.use((req, _res, next) => {
  if (req.path.startsWith('/api/')) {
    req.url = req.url.replace(/^\/api/, '')
  }
  next()
})

// Routes
app.use('/auth', authRoutes)
app.use('/characters', characterRoutes)
app.use('/adventures', adventureRoutes)
app.use('/sessions', sessionRoutes)
app.use('/api-config', apiConfigRoutes)
app.use('/chat', chatRoutes)

// Health check
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', db: 'connected' })
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' })
  }
})

// Serve built frontend in production
app.use(express.static(distDir))
app.get('*', (_req, res, next) => {
  if (_req.path.startsWith('/auth') || _req.path.startsWith('/characters') ||
      _req.path.startsWith('/adventures') || _req.path.startsWith('/sessions') ||
      _req.path.startsWith('/api-config') || _req.path.startsWith('/chat') ||
      _req.path.startsWith('/health')) {
    return next()
  }
  res.sendFile(path.join(distDir, 'index.html'))
})

// Error handler (must be last)
app.use(errorHandler)

async function start() {
  await runMigrations()

  app.listen(config.port, () => {
    console.log(`DungeonMaster API listening on port ${config.port}`)

    verifyEmailTransport()
      .then(verified => {
        if (verified) {
          console.log('SMTP connection verified successfully.')
        }
      })
      .catch(err => {
        console.error('SMTP verification failed:', err.message)
      })
  })
}

start().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
