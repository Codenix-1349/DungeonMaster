import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../db/pool.js'
import { config } from '../config.js'
import { authenticate } from '../middleware/auth.js'
import { createToken, consumeToken, invalidateTokens } from '../services/tokens.js'
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.js'

const router = Router()

async function issueVerificationEmailForUser(userId, email) {
  await invalidateTokens(userId, 'email_verify')
  const verifyToken = await createToken(userId, 'email_verify')
  await sendVerificationEmail(email, verifyToken)
}

// ── Dev auto-login (only when DEV_AUTO_LOGIN is set) ────────────────────────

if (config.devAutoLogin) {
  router.post('/dev-login', async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        'SELECT id, email, username, email_verified FROM users WHERE email = $1',
        [config.devAutoLogin.toLowerCase().trim()]
      )

      if (rows.length === 0) {
        return res.status(404).json({ error: `Dev-User ${config.devAutoLogin} nicht gefunden.` })
      }

      const user = rows[0]
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      )

      console.warn(`⚠️  DEV AUTO-LOGIN aktiv als ${user.email} — nicht in Produktion verwenden!`)

      res.json({
        token,
        user: { id: user.id, email: user.email, username: user.username, emailVerified: !!user.email_verified },
      })
    } catch (err) {
      next(err)
    }
  })
}

// ── Register ────────────────────────────────────────────────────────────────

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

    // Send verification email
    try {
      await issueVerificationEmailForUser(user.id, user.email)
    } catch (err) {
      console.error('Failed to send verification email:', err.message)
    }

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, username: user.username, emailVerified: false },
    })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email oder Benutzername bereits vergeben.' })
    }
    next(err)
  }
})

// ── Login ───────────────────────────────────────────────────────────────────

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email und Passwort sind erforderlich.' })
    }

    const { rows } = await pool.query(
      'SELECT id, email, username, password_hash, email_verified FROM users WHERE email = $1',
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

    if (!user.email_verified) {
      return res.status(403).json({ error: 'Bitte bestätige zuerst deine E-Mail-Adresse.', code: 'EMAIL_NOT_VERIFIED' })
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    )

    res.json({
      token,
      user: { id: user.id, email: user.email, username: user.username, emailVerified: true },
    })
  } catch (err) {
    next(err)
  }
})

// ── Get current user ────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, username, email_verified, created_at FROM users WHERE id = $1',
      [req.user.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' })
    }

    const u = rows[0]
    res.json({ user: { id: u.id, email: u.email, username: u.username, emailVerified: !!u.email_verified } })
  } catch (err) {
    next(err)
  }
})

// ── Verify email ────────────────────────────────────────────────────────────

router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body
    if (!token) return res.status(400).json({ error: 'Token fehlt.' })

    const row = await consumeToken(token, 'email_verify')
    if (!row) {
      return res.status(400).json({ error: 'Ungültiger oder abgelaufener Link.' })
    }

    await pool.query('UPDATE users SET email_verified = TRUE WHERE id = $1', [row.user_id])
    res.json({ success: true, message: 'E-Mail erfolgreich bestätigt.' })
  } catch (err) {
    next(err)
  }
})

// ── Resend verification email ───────────────────────────────────────────────

router.post('/resend-verification', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT email, email_verified FROM users WHERE id = $1',
      [req.user.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Benutzer nicht gefunden.' })
    if (rows[0].email_verified) return res.json({ message: 'E-Mail bereits bestätigt.' })

    await issueVerificationEmailForUser(req.user.id, rows[0].email)

    res.json({ success: true, message: 'Bestätigungsmail erneut gesendet.' })
  } catch (err) {
    next(err)
  }
})

// ── Forgot password (request reset) ────────────────────────────────────────

router.post('/resend-verification-request', async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email ist erforderlich.' })

    const { rows } = await pool.query(
      'SELECT id, email, email_verified FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    )

    if (rows.length > 0 && !rows[0].email_verified) {
      await issueVerificationEmailForUser(rows[0].id, rows[0].email)
    }

    res.json({ success: true, message: 'Falls ein unbestÃ¤tigtes Konto existiert, wurde eine BestÃ¤tigungsmail gesendet.' })
  } catch (err) {
    next(err)
  }
})

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email ist erforderlich.' })

    const { rows } = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    )

    // Always return success to prevent email enumeration
    if (rows.length === 0) {
      return res.json({ success: true, message: 'Falls ein Konto existiert, wurde eine E-Mail gesendet.' })
    }

    const user = rows[0]
    await invalidateTokens(user.id, 'password_reset')
    const resetToken = await createToken(user.id, 'password_reset')
    await sendPasswordResetEmail(user.email, resetToken)

    res.json({ success: true, message: 'Falls ein Konto existiert, wurde eine E-Mail gesendet.' })
  } catch (err) {
    next(err)
  }
})

// ── Reset password ──────────────────────────────────────────────────────────

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ error: 'Token und Passwort erforderlich.' })
    if (password.length < 6) return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein.' })

    const row = await consumeToken(token, 'password_reset')
    if (!row) {
      return res.status(400).json({ error: 'Ungültiger oder abgelaufener Link.' })
    }

    const hash = await bcrypt.hash(password, config.bcryptRounds)
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, row.user_id])

    // Invalidate remaining reset tokens
    await invalidateTokens(row.user_id, 'password_reset')

    res.json({ success: true, message: 'Passwort erfolgreich geändert.' })
  } catch (err) {
    next(err)
  }
})

export default router
