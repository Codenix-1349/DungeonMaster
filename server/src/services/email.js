import nodemailer from 'nodemailer'
import { config } from '../config.js'

let transporter = null

function getTransporter() {
  if (transporter) return transporter

  if (!config.smtp.host) {
    console.warn('SMTP not configured — emails will be logged to console.')
    return null
  }

  const opts = {
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
  }

  // Only add auth if credentials are provided (Mailpit etc. don't need auth)
  if (config.smtp.user) {
    opts.auth = { user: config.smtp.user, pass: config.smtp.pass }
  }

  transporter = nodemailer.createTransport(opts)
  return transporter
}

async function sendMail({ to, subject, html }) {
  const t = getTransporter()

  if (!t) {
    // Fallback: log to console in dev
    console.log('═══ EMAIL (no SMTP configured) ═══')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(html)
    console.log('═══════════════════════════════════')
    return
  }

  await t.sendMail({
    from: config.smtp.from,
    to,
    subject,
    html,
  })
}

export async function sendVerificationEmail(email, token) {
  const url = `${config.frontendUrl}?verify=${token}`

  await sendMail({
    to: email,
    subject: 'Dungeons & Daggers — E-Mail bestätigen',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #d4a017;">Dungeons &amp; Daggers</h2>
        <p>Bitte bestätige deine E-Mail-Adresse:</p>
        <p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#d4a017;color:#000;text-decoration:none;border-radius:6px;font-weight:bold;">E-Mail bestätigen</a></p>
        <p style="font-size:12px;color:#888;">Der Link ist 24 Stunden gültig. Falls du dich nicht registriert hast, ignoriere diese Mail.</p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(email, token) {
  const url = `${config.frontendUrl}?reset=${token}`

  await sendMail({
    to: email,
    subject: 'Dungeons & Daggers — Passwort zurücksetzen',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #d4a017;">Dungeons &amp; Daggers</h2>
        <p>Du hast eine Passwort-Zurücksetzung angefordert:</p>
        <p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#d4a017;color:#000;text-decoration:none;border-radius:6px;font-weight:bold;">Passwort zurücksetzen</a></p>
        <p style="font-size:12px;color:#888;">Der Link ist 30 Minuten gültig. Falls du dies nicht angefordert hast, ignoriere diese Mail.</p>
      </div>
    `,
  })
}
