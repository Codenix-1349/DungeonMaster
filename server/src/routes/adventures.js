import { Router } from 'express'
import { pool } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

// GET /adventures
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, filename, text, pages, char_count, structure, added_at
       FROM adventures WHERE user_id = $1
       ORDER BY added_at DESC`,
      [req.user.id]
    )

    const adventures = rows.map(r => ({
      id: r.id,
      title: r.title,
      filename: r.filename,
      text: r.text,
      pages: r.pages,
      charCount: r.char_count,
      structure: r.structure,
      addedAt: r.added_at,
    }))

    res.json({ adventures })
  } catch (err) {
    next(err)
  }
})

// POST /adventures
router.post('/', async (req, res, next) => {
  try {
    const adv = req.body.adventure
    if (!adv || !adv.id || !adv.title) {
      return res.status(400).json({ error: 'Abenteuer mit id und title erforderlich.' })
    }

    const { rows } = await pool.query(
      `INSERT INTO adventures (id, user_id, title, filename, text, pages, char_count, structure)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [adv.id, req.user.id, adv.title, adv.filename || null, adv.text || '', adv.pages || null, adv.charCount || 0, JSON.stringify(adv.structure || null)]
    )

    res.status(201).json({ adventure: rows[0] })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Abenteuer-ID existiert bereits.' })
    }
    next(err)
  }
})

// DELETE /adventures/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM adventures WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )

    if (rowCount === 0) return res.status(404).json({ error: 'Abenteuer nicht gefunden.' })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
