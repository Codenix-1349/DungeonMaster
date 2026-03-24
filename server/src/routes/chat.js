import { Router } from 'express'
import { pool } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'
import { decrypt } from '../services/crypto.js'
import { streamChat, testConnection } from '../services/openrouter.js'

const router = Router()
router.use(authenticate)

/**
 * Helper: load and decrypt the user's OpenRouter API key.
 */
async function getUserApiKey(userId) {
  const { rows } = await pool.query(
    'SELECT openrouter_key_enc, model_id FROM api_configs WHERE user_id = $1',
    [userId]
  )
  if (rows.length === 0 || !rows[0].openrouter_key_enc) {
    return null
  }
  try {
    const apiKey = decrypt(rows[0].openrouter_key_enc)
    return { apiKey, modelId: rows[0].model_id }
  } catch {
    return null
  }
}

// POST /chat/send — SSE streaming proxy
router.post('/send', async (req, res, next) => {
  try {
    const config = await getUserApiKey(req.user.id)
    if (!config || !config.apiKey) {
      return res.status(400).json({ error: 'Kein API-Key konfiguriert.' })
    }

    const { messages, model, temperature, maxTokens } = req.body
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages Array erforderlich.' })
    }

    const useModel = model || config.modelId || 'google/gemini-2.0-flash-001'

    // Client can close connection
    const controller = new AbortController()
    req.on('close', () => controller.abort())

    await streamChat({
      apiKey: config.apiKey,
      model: useModel,
      messages,
      temperature: temperature ?? 0.8,
      maxTokens: maxTokens ?? 4096,
      res,
      signal: controller.signal,
    })
  } catch (err) {
    if (!res.headersSent) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message })
      }
      next(err)
    }
  }
})

// POST /chat/test — quick connection test
router.post('/test', async (req, res, next) => {
  try {
    const config = await getUserApiKey(req.user.id)
    if (!config || !config.apiKey) {
      return res.status(400).json({ error: 'Kein API-Key konfiguriert.' })
    }

    const useModel = req.body.model || config.modelId || 'google/gemini-2.0-flash-001'
    const data = await testConnection(config.apiKey, useModel)

    res.json({ success: true, response: data })
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message })
    }
    next(err)
  }
})

export default router
