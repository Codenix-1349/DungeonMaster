import jwt from 'jsonwebtoken'
import { config } from '../config.js'

export function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Kein Token vorhanden.' })
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    req.user = { id: payload.userId, email: payload.email }
    next()
  } catch {
    return res.status(401).json({ error: 'Ungültiges oder abgelaufenes Token.' })
  }
}
