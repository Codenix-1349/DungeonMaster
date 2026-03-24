import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../db/pool.js'
import { config } from '../config.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.post('/register', async (req, res, next) => {
  try {
    const { email, username, password } = req.body

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, Benutzername und Passwort sind erforderlich.' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein.' })
    }

    const hash = await bcrypt.hash(password, config.bcryptRounds)

    const { rows } = await pool.query(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, created_at`,
      [email.toLowerCase().trim(), username.trim(), hash]
    )

    const user = rows[0]
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    )

    // Create default api_config row
    await pool.query(
      'INSERT INTO api_configs (user_id) VALUES ($1)',
      [user.id]
    )

    res.status(201).json({ token, user: { id: user.id, email: user.email, username: user.username } })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email oder Benutzername bereits vergeben.' })
    }
    next(err)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email und Passwort sind erforderlich.' })
    }

    const { rows } = await pool.query(
      'SELECT id, email, username, password_hash FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    )

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten.' })
    }

    const user = rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten.' })
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    )

    res.json({ token, user: { id: user.id, email: user.email, username: user.username } })
  } catch (err) {
    next(err)
  }
})

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, username, created_at FROM users WHERE id = $1',
      [req.user.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' })
    }

    res.json({ user: rows[0] })
  } catch (err) {
    next(err)
  }
})

export default router
