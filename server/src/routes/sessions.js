import { Router } from 'express'
import { pool } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

function mapSession(r) {
  return {
    id: r.id,
    characterId: r.character_id,
    adventureId: r.adventure_id,
    gameLog: r.game_log || [],
    combat: r.combat || null,
    sceneState: r.scene_state || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// GET /sessions
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, character_id, adventure_id, game_log, combat, scene_state,
              is_active, created_at, updated_at
       FROM sessions WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [req.user.id]
    )

    const sessions = rows.map(mapSession)
    const active = rows.find(r => r.is_active)

    res.json({ sessions, activeSessionId: active?.id || null })
  } catch (err) {
    next(err)
  }
})

// POST /sessions
router.post('/', async (req, res, next) => {
  try {
    const s = req.body.session
    if (!s || !s.id) return res.status(400).json({ error: 'Session mit id erforderlich.' })

    const { rows } = await pool.query(
      `INSERT INTO sessions (id, user_id, character_id, adventure_id, game_log, combat, scene_state)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [s.id, req.user.id, s.characterId || null, s.adventureId || null,
       JSON.stringify(s.gameLog || []), JSON.stringify(s.combat || null), JSON.stringify(s.sceneState || null)]
    )

    res.status(201).json({ session: mapSession(rows[0]) })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Session-ID existiert bereits.' })
    next(err)
  }
})

// PUT /sessions/:id — partial update
router.put('/:id', async (req, res, next) => {
  try {
    const patch = req.body.patch || req.body
    const setClauses = []
    const values = []
    let idx = 1

    if (patch.characterId !== undefined) { setClauses.push(`character_id = $${idx++}`); values.push(patch.characterId) }
    if (patch.adventureId !== undefined) { setClauses.push(`adventure_id = $${idx++}`); values.push(patch.adventureId) }
    if (patch.gameLog !== undefined) { setClauses.push(`game_log = $${idx++}`); values.push(JSON.stringify(patch.gameLog)) }
    if (patch.combat !== undefined) { setClauses.push(`combat = $${idx++}`); values.push(JSON.stringify(patch.combat)) }
    if (patch.sceneState !== undefined) { setClauses.push(`scene_state = $${idx++}`); values.push(JSON.stringify(patch.sceneState)) }

    if (setClauses.length === 0) return res.status(400).json({ error: 'Keine Änderungen angegeben.' })

    setClauses.push('updated_at = NOW()')
    values.push(req.params.id, req.user.id)

    const { rows } = await pool.query(
      `UPDATE sessions SET ${setClauses.join(', ')}
       WHERE id = $${idx++} AND user_id = $${idx}
       RETURNING *`,
      values
    )

    if (rows.length === 0) return res.status(404).json({ error: 'Session nicht gefunden.' })
    res.json({ session: mapSession(rows[0]) })
  } catch (err) {
    next(err)
  }
})

// DELETE /sessions/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )

    if (rowCount === 0) return res.status(404).json({ error: 'Session nicht gefunden.' })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// PUT /sessions/:id/activate
router.put('/:id/activate', async (req, res, next) => {
  try {
    await pool.query('UPDATE sessions SET is_active = FALSE WHERE user_id = $1', [req.user.id])
    const { rows } = await pool.query(
      'UPDATE sessions SET is_active = TRUE WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    )

    if (rows.length === 0) return res.status(404).json({ error: 'Session nicht gefunden.' })
    res.json({ activeSessionId: rows[0].id })
  } catch (err) {
    next(err)
  }
})

// POST /sessions/:id/unload
router.post('/:id/unload', async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE sessions SET is_active = FALSE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
