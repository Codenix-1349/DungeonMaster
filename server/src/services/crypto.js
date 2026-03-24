import crypto from 'crypto'
import { config } from '../config.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

function getKey() {
  const hex = config.encryptionKey
  if (!hex || hex.length < 64) {
    throw new Error('ENCRYPTION_KEY must be at least 32 bytes (64 hex chars)')
  }
  return Buffer.from(hex.slice(0, 64), 'hex')
}

export function encrypt(plaintext) {
  if (!plaintext) return null
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format: iv:tag:ciphertext (all base64)
  return [iv, tag, encrypted].map(b => b.toString('base64')).join(':')
}

export function decrypt(encoded) {
  if (!encoded) return null
  const key = getKey()
  const [ivB64, tagB64, dataB64] = encoded.split(':')
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(data, null, 'utf8') + decipher.final('utf8')
}
