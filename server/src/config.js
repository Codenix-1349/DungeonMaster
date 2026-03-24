import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT) || 3001,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dungeon_master',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  encryptionKey: process.env.ENCRYPTION_KEY || '',
  bcryptRounds: 12,
  jwtExpiresIn: '7d',
}
