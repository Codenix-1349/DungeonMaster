import { Router } from 'express'
import { pool } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'
import { encrypt, decrypt } from '../services/crypto.js'

const router = Router()
router.use(authenticate)

// GET /api-config
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT openrouter_key_enc, model_id FROM api_configs WHERE user_id = $1',
      [req.user.id]
    )

    if (rows.length === 0) {
      return res.json({ hasKey: false, modelId: null })
    }

    const row = rows[0]
    const hasKey = !!row.openrouter_key_enc
    let keyHint = null

    if (hasKey) {
      try {
        const plain = decrypt(row.openrouter_key_enc)
        if (plain && plain.length > 8) {
          keyHint = plain.slice(0, 5) + '...' + plain.slice(-3)
        }
      } catch {
        // Decryption failed — treat as no key
      }
    }

    res.json({ hasKey, keyHint, modelId: row.model_id || null })
  } catch (err) {
    next(err)
  }
})

// PUT /api-config
router.put('/', async (req, res, next) => {
  try {
    const { apiKey, modelId } = req.body

    const setClauses = []
    const values = []
    let idx = 1

    if (apiKey !== undefined) {
      const enc = apiKey ? encrypt(apiKey) : null
      setClauses.push(`openrouter_key_enc = $${idx++}`)
      values.push(enc)
    }

    if (modelId !== undefined) {
      setClauses.push(`model_id = $${idx++}`)
      values.push(modelId || null)
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'Keine Änderungen angegeben.' })
    }

    values.push(req.user.id)

    await pool.query(
      `UPDATE api_configs SET ${setClauses.join(', ')} WHERE user_id = $${idx}`,
      values
    )

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
