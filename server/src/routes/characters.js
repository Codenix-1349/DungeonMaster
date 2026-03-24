import { Router } from 'express'
import { pool } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

// GET /characters — list all + active ID
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, data, is_active, created_at, updated_at
       FROM characters WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [req.user.id]
    )

    const characters = rows.map(r => ({ ...r.data, id: r.id, createdAt: r.created_at, updatedAt: r.updated_at }))
    const active = rows.find(r => r.is_active)

    res.json({ characters, activeCharacterId: active?.id || null })
  } catch (err) {
    next(err)
  }
})

// POST /characters — create
router.post('/', async (req, res, next) => {
  try {
    const char = req.body.character
    if (!char || !char.id || !char.name) {
      return res.status(400).json({ error: 'Charakter mit id und name erforderlich.' })
    }

    const { rows } = await pool.query(
      `INSERT INTO characters (id, user_id, name, class, race, level, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, data, created_at, updated_at`,
      [char.id, req.user.id, char.name, char.class || '', char.race || '', char.level || 1, JSON.stringify(char)]
    )

    res.status(201).json({ character: { ...rows[0].data, id: rows[0].id } })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Charakter-ID existiert bereits.' })
    }
    next(err)
  }
})

// PUT /characters/:id — update
router.put('/:id', async (req, res, next) => {
  try {
    const char = req.body.character
    if (!char) return res.status(400).json({ error: 'Charakter-Daten erforderlich.' })

    const { rows } = await pool.query(
      `UPDATE characters
       SET name = $1, class = $2, race = $3, level = $4, data = $5, updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING id, data, created_at, updated_at`,
      [char.name || '', char.class || '', char.race || '', char.level || 1, JSON.stringify(char), req.params.id, req.user.id]
    )

    if (rows.length === 0) return res.status(404).json({ error: 'Charakter nicht gefunden.' })
    res.json({ character: { ...rows[0].data, id: rows[0].id } })
  } catch (err) {
    next(err)
  }
})

// DELETE /characters/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM characters WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )

    if (rowCount === 0) return res.status(404).json({ error: 'Charakter nicht gefunden.' })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// PUT /characters/:id/activate
router.put('/:id/activate', async (req, res, next) => {
  try {
    // Deactivate all, then activate the one
    await pool.query('UPDATE characters SET is_active = FALSE WHERE user_id = $1', [req.user.id])
    const { rows } = await pool.query(
      'UPDATE characters SET is_active = TRUE WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    )

    if (rows.length === 0) return res.status(404).json({ error: 'Charakter nicht gefunden.' })
    res.json({ activeCharacterId: rows[0].id })
  } catch (err) {
    next(err)
  }
})

export default router
