import { Router } from 'express'
import { pool } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'
import {
  applyServerMemoryToSceneState,
  buildServerMemorySummary,
  stripSceneStateMemorySummary,
} from '../services/sessionMemory.js'

const router = Router()
router.use(authenticate)

function mapSession(r) {
  const memorySummary = r.memory_summary || ''
  return {
    id: r.id,
    characterId: r.character_id,
    adventureId: r.adventure_id,
    gameLog: r.game_log || [],
    combat: r.combat || null,
    sceneState: applyServerMemoryToSceneState(r.scene_state || null, memorySummary),
    memorySummary,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function buildAuthoritativeSessionMemory({ gameLog = [], sceneState = null } = {}) {
  const strippedSceneState = stripSceneStateMemorySummary(sceneState)
  return {
    sceneState: strippedSceneState,
    memorySummary: buildServerMemorySummary({
      gameLog,
      sceneState: strippedSceneState,
    }),
  }
}

// GET /sessions
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, character_id, adventure_id, game_log, combat, scene_state, memory_summary,
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
    const authoritativeMemory = buildAuthoritativeSessionMemory({
      gameLog: s.gameLog || [],
      sceneState: s.sceneState || null,
    })

    const { rows } = await pool.query(
      `INSERT INTO sessions (id, user_id, character_id, adventure_id, game_log, combat, scene_state, memory_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [s.id, req.user.id, s.characterId || null, s.adventureId || null,
       JSON.stringify(s.gameLog || []), JSON.stringify(s.combat || null), JSON.stringify(authoritativeMemory.sceneState || null), authoritativeMemory.memorySummary]
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
    const currentResult = await pool.query(
      `SELECT id, character_id, adventure_id, game_log, combat, scene_state, memory_summary
       FROM sessions
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [req.params.id, req.user.id]
    )
    if (currentResult.rows.length === 0) return res.status(404).json({ error: 'Session nicht gefunden.' })

    const current = currentResult.rows[0]
    const setClauses = []
    const values = []
    let idx = 1
    const nextGameLog = patch.gameLog !== undefined ? patch.gameLog : (current.game_log || [])
    const nextSceneState = patch.sceneState !== undefined ? patch.sceneState : (current.scene_state || null)
    const authoritativeMemory = buildAuthoritativeSessionMemory({
      gameLog: nextGameLog,
      sceneState: nextSceneState,
    })

    if (patch.characterId !== undefined) { setClauses.push(`character_id = $${idx++}`); values.push(patch.characterId) }
    if (patch.adventureId !== undefined) { setClauses.push(`adventure_id = $${idx++}`); values.push(patch.adventureId) }
    if (patch.gameLog !== undefined) { setClauses.push(`game_log = $${idx++}`); values.push(JSON.stringify(patch.gameLog)) }
    if (patch.combat !== undefined) { setClauses.push(`combat = $${idx++}`); values.push(JSON.stringify(patch.combat)) }
    if (patch.sceneState !== undefined) { setClauses.push(`scene_state = $${idx++}`); values.push(JSON.stringify(authoritativeMemory.sceneState)) }
    if (patch.gameLog !== undefined || patch.sceneState !== undefined) {
      setClauses.push(`memory_summary = $${idx++}`)
      values.push(authoritativeMemory.memorySummary)
    }

    if (setClauses.length === 0) return res.status(400).json({ error: 'Keine Änderungen angegeben.' })

    setClauses.push('updated_at = NOW()')
    values.push(req.params.id, req.user.id)

    const { rows } = await pool.query(
      `UPDATE sessions SET ${setClauses.join(', ')}
       WHERE id = $${idx++} AND user_id = $${idx}
       RETURNING *`,
      values
    )
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
