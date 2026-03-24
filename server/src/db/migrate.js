import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from './pool.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(__dirname, 'migrations')

export async function runMigrations() {
  // Track which migrations have run
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name VARCHAR(255) PRIMARY KEY,
      ran_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const { rows } = await pool.query('SELECT 1 FROM _migrations WHERE name = $1', [file])
    if (rows.length > 0) continue

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    console.log(`Running migration: ${file}`)
    await pool.query(sql)
    await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file])
    console.log(`Migration complete: ${file}`)
  }
}
