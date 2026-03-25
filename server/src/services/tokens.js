import crypto from 'crypto'
import { pool } from '../db/pool.js'
import { config } from '../config.js'

/**
 * Creates a random token, stores its SHA-256 hash in DB, returns raw token.
 */
export async function createToken(userId, type) {
  const raw = crypto.randomBytes(32).toString('hex')
  const hash = crypto.createHash('sha256').update(raw).digest('hex')

  const minutes = type === 'email_verify'
    ? config.tokenExpiryMinutes.emailVerify
    : config.tokenExpiryMinutes.passwordReset

  await pool.query(
    `INSERT INTO tokens (user_id, type, token_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '${minutes} minutes')`,
    [userId, type, hash]
  )

  return raw
}

/**
 * Validates a raw token: finds matching hash, checks type + expiry, marks as used.
 * Returns the token row (with user_id) or null.
 */
export async function consumeToken(raw, type) {
  const hash = crypto.createHash('sha256').update(raw).digest('hex')

  const { rows } = await pool.query(
    `SELECT id, user_id FROM tokens
     WHERE token_hash = $1 AND type = $2 AND used_at IS NULL AND expires_at > NOW()`,
    [hash, type]
  )

  if (rows.length === 0) return null

  await pool.query('UPDATE tokens SET used_at = NOW() WHERE id = $1', [rows[0].id])

  return rows[0]
}

/**
 * Invalidates all unused tokens of a given type for a user.
 */
export async function invalidateTokens(userId, type) {
  await pool.query(
    `UPDATE tokens SET used_at = NOW() WHERE user_id = $1 AND type = $2 AND used_at IS NULL`,
    [userId, type]
  )
}
