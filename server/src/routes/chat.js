import { Router } from 'express'
import { pool } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'
import { decrypt } from '../services/crypto.js'
import { buildProxyMessages } from '../services/chatProxyMessages.js'
import { streamChat, testConnection } from '../services/openrouter.js'
import { BUILTIN_ADVENTURES } from '../../../src/data/builtinAdventures.js'

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

function getBuiltinAdventure(adventureId) {
  return BUILTIN_ADVENTURES.find(adventure => adventure.id === adventureId) || null
}

function mapAuthoritativeAdventure(row) {
  if (!row?.adventure_id) {
    return null
  }

  if (row.adventure_title) {
    return {
      id: row.adventure_id,
      title: row.adventure_title,
      filename: row.adventure_filename || null,
      text: row.adventure_text || '',
      pages: row.adventure_pages || null,
      charCount: row.adventure_char_count || 0,
      structure: row.adventure_structure || null,
    }
  }

  const builtinAdventure = getBuiltinAdventure(row.adventure_id)
  return builtinAdventure ? { ...builtinAdventure } : null
}

async function loadAuthoritativePromptContext(userId, sessionId, {
  runtimeRequestMode = null,
  runtimeResolution = null,
} = {}) {
  const { rows } = await pool.query(
    `SELECT s.id, s.character_id, s.adventure_id, s.combat, s.scene_state,
            c.data AS character_data,
            a.title AS adventure_title,
            a.filename AS adventure_filename,
            a.text AS adventure_text,
            a.pages AS adventure_pages,
            a.char_count AS adventure_char_count,
            a.structure AS adventure_structure
     FROM sessions s
     LEFT JOIN characters c
       ON c.id = s.character_id AND c.user_id = s.user_id
     LEFT JOIN adventures a
       ON a.id = s.adventure_id AND a.user_id = s.user_id
     WHERE s.id = $1 AND s.user_id = $2
     LIMIT 1`,
    [sessionId, userId]
  )

  if (rows.length === 0) {
    return null
  }

  const row = rows[0]
  if (row.character_id && !row.character_data) {
    throw Object.assign(new Error('Charakterdaten fuer diese Session sind serverseitig nicht verfuegbar.'), { status: 409 })
  }

  const adventure = mapAuthoritativeAdventure(row)
  if (row.adventure_id && !adventure) {
    throw Object.assign(new Error('Abenteuermoduldaten fuer diese Session sind serverseitig nicht verfuegbar.'), { status: 409 })
  }

  return {
    character: row.character_data ? { ...row.character_data, id: row.character_id } : null,
    adventure,
    combat: row.combat || null,
    sceneState: row.scene_state || null,
    runtimeRequestMode,
    runtimeResolution,
  }
}

// POST /chat/send — SSE streaming proxy
router.post('/send', async (req, res, next) => {
  try {
    const config = await getUserApiKey(req.user.id)
    if (!config || !config.apiKey) {
      return res.status(400).json({ error: 'Kein API-Key konfiguriert.' })
    }

    const {
      messages,
      model,
      temperature,
      maxTokens,
      sessionId,
      runtimeRequestMode = null,
      runtimeResolution = null,
    } = req.body
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages Array erforderlich.' })
    }
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      return res.status(400).json({ error: 'sessionId ist fuer Proxy-Chat erforderlich.' })
    }

    const authoritativeContext = await loadAuthoritativePromptContext(req.user.id, sessionId.trim(), {
      runtimeRequestMode,
      runtimeResolution,
    })
    if (!authoritativeContext) {
      return res.status(404).json({ error: 'Session fuer Proxy-Chat nicht gefunden.' })
    }

    const preparedMessages = buildProxyMessages({ messages, authoritativeContext })
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
