import pg from 'pg'
import { config } from '../config.js'

const isSSL = config.databaseUrl.includes('render.com') || process.env.DB_SSL === 'true'

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ...(isSSL ? { ssl: { rejectUnauthorized: false } } : {}),
})

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err.message)
})
