import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT) || 3001,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dungeon_master',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  encryptionKey: process.env.ENCRYPTION_KEY || '',
  bcryptRounds: 12,
  jwtExpiresIn: '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@dungeons-daggers.app',
  },
  devAutoLogin: process.env.DEV_AUTO_LOGIN || '',
  tokenExpiryMinutes: {
    emailVerify: 60 * 24,     // 24h
    passwordReset: 30,         // 30min
  },
}
