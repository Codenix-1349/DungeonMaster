import { Router } from 'express'
import { pool } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'
import { decrypt } from '../services/crypto.js'
import { buildProxyMessages } from '../services/chatProxyMessages.js'
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

    const { messages, model, temperature, maxTokens, promptContext = null } = req.body
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages Array erforderlich.' })
    }

    const preparedMessages = buildProxyMessages({ messages, promptContext })
    const hasChatTurns = preparedMessages.some(message => message.role === 'user' || message.role === 'assistant')
    if (!hasChatTurns) {
      return res.status(400).json({ error: 'Mindestens eine user- oder assistant-Nachricht ist erforderlich.' })
    }

    const useModel = model || config.modelId || 'openrouter/free'

    // Client can close connection
    const controller = new AbortController()
    req.on('close', () => controller.abort())

    await streamChat({
      apiKey: config.apiKey,
      model: useModel,
      messages: preparedMessages,
      temperature: temperature ?? 0.8,
      maxTokens: maxTokens ?? 4096,
      res,
      signal: controller.signal,
    })
  } catch (err) {
    console.error('[chat/send]', err.message)
    if (!res.headersSent) {
      const status = err.status || 500
      return res.status(status).json({ error: err.message || 'Chat-Proxy Fehler' })
    }
    // If headers already sent (SSE started), try to send error via SSE
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      res.end()
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

    const useModel = req.body.model || config.modelId || 'openrouter/free'
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
