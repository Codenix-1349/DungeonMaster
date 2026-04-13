import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config.js'
import { pool } from './db/pool.js'

import authRoutes from './routes/auth.js'
import characterRoutes from './routes/characters.js'
import adventureRoutes from './routes/adventures.js'
import sessionRoutes from './routes/sessions.js'
import apiConfigRoutes from './routes/apiConfig.js'
import chatRoutes from './routes/chat.js'
import { errorHandler } from './middleware/errorHandler.js'
import { verifyEmailTransport } from './services/email.js'

const app = express()

// Middleware
app.use(helmet())
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '5mb' }))

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

// Error handler (must be last)
app.use(errorHandler)

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
