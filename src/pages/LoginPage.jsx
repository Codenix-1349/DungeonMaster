import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { forgotPassword, resetPassword, resendVerification } from '../services/api'
import { PROJECT_NAME } from '../data/srd'

export default function LoginPage() {
  const { login, register, verifyEmail } = useAuth()

  // 'login' | 'register' | 'forgot' | 'reset' | 'verified' | 'check-email'
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  // Check URL params for ?verify= or ?reset=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const verifyToken = params.get('verify')
    const resetToken = params.get('reset')

    if (verifyToken) {
      setLoading(true)
      verifyEmail(verifyToken)
        .then(() => {
          setMode('verified')
          setSuccess('E-Mail erfolgreich bestätigt! Du kannst dich jetzt anmelden.')
        })
        .catch(err => {
          setError(err.message || 'Ungültiger oder abgelaufener Bestätigungslink.')
        })
        .finally(() => {
          setLoading(false)
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname)
        })
    }

    if (resetToken) {
      setMode('reset')
      // Store token temporarily for the reset form
      window.__resetToken = resetToken
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [verifyEmail])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'register') {
        await register(email.trim(), username.trim(), password)
        setMode('check-email')
        setSuccess('Konto erstellt! Bitte prüfe dein Postfach und bestätige deine E-Mail-Adresse.')
        setLoading(false)
        return
      } else if (mode === 'login' || mode === 'verified') {
        await login(email.trim(), password)
      } else if (mode === 'forgot') {
        await forgotPassword(email.trim())
        setSuccess('Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.')
      } else if (mode === 'reset') {
        if (password !== passwordConfirm) {
          setError('Passwörter stimmen nicht überein.')
          setLoading(false)
          return
        }
        await resetPassword(window.__resetToken, password)
        setSuccess('Passwort erfolgreich geändert! Du kannst dich jetzt anmelden.')
        setMode('login')
        delete window.__resetToken
      }
    } catch (err) {
      // Backend returns code: 'EMAIL_NOT_VERIFIED' when email not confirmed
      if (err.status === 403) {
        setMode('check-email')
        setSuccess('Bitte bestätige zuerst deine E-Mail-Adresse.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    setError('')
    setSuccess('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(180deg, #0d0d0d 0%, #1a1a1a 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl text-gold-500 mb-2"
            style={{ textShadow: '0 0 30px rgba(212,160,23,0.35)' }}>
            {PROJECT_NAME}
          </h1>
          <p className="font-heading text-sm tracking-[0.3em] text-stone-500 uppercase">
            AI Solo-Abenteuer
          </p>
        </div>

        <div className="panel-gold p-6">
          {/* Check email screen — shown after register or unverified login */}
          {mode === 'check-email' && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="text-4xl">📧</div>
              <h2 className="font-heading text-lg text-gold-400">Bestätigungsmail gesendet</h2>
              {success && (
                <div className="p-3 rounded border bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-body text-sm w-full">
                  {success}
                </div>
              )}
              {error && (
                <div className="p-3 rounded border bg-blood-500/10 border-blood-500/50 text-red-400 font-body text-sm w-full">
                  {error}
                </div>
              )}
              <p className="font-body text-sm text-stone-400">
                Prüfe dein Postfach und klicke auf den Bestätigungslink.
              </p>
              {!email.trim() && (
                <div>
                  <label className="font-heading text-xs text-stone-400 mb-1 block text-left">E-Mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-dark w-full font-body"
                    placeholder="held@example.com"
                  />
                </div>
              )}
              <button
                disabled={resending || !email.trim()}
                onClick={async () => {
                  setResending(true)
                  setError('')
                  try {
                    await resendVerification(email.trim())
                    setSuccess('Bestätigungsmail erneut gesendet.')
                  } catch (err) {
                    setError(err.message)
                  } finally {
                    setResending(false)
                  }
                }}
                className="btn-primary w-full py-2 text-sm"
              >
                {resending ? 'Wird gesendet...' : 'Erneut senden'}
              </button>
              <button
                onClick={() => switchMode('login')}
                className="font-body text-xs text-stone-500 hover:text-gold-400 transition-colors"
              >
                Zurück zur Anmeldung
              </button>
            </div>
          )}

          {/* Tab bar — hidden during forgot/reset/check-email flows */}
          {(mode === 'login' || mode === 'register' || mode === 'verified') && (
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => switchMode('login')}
                className={`flex-1 py-2 rounded font-heading text-sm tracking-wide transition-colors ${
                  mode !== 'register'
                    ? 'bg-gold-600/20 text-gold-400 border border-gold-600/40'
                    : 'text-stone-500 border border-transparent hover:text-stone-300'
                }`}
              >
                Anmelden
              </button>
              <button
                onClick={() => switchMode('register')}
                className={`flex-1 py-2 rounded font-heading text-sm tracking-wide transition-colors ${
                  mode === 'register'
                    ? 'bg-gold-600/20 text-gold-400 border border-gold-600/40'
                    : 'text-stone-500 border border-transparent hover:text-stone-300'
                }`}
              >
                Registrieren
              </button>
            </div>
          )}

          {/* Forgot password header */}
          {mode === 'forgot' && (
            <div className="mb-6">
              <h2 className="font-heading text-lg text-gold-400 mb-1">Passwort vergessen?</h2>
              <p className="font-body text-sm text-stone-400">
                Gib deine E-Mail ein und wir senden dir einen Link zum Zurücksetzen.
              </p>
            </div>
          )}

          {/* Reset password header */}
          {mode === 'reset' && (
            <div className="mb-6">
              <h2 className="font-heading text-lg text-gold-400 mb-1">Neues Passwort</h2>
              <p className="font-body text-sm text-stone-400">
                Wähle ein neues Passwort für dein Konto.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" style={{ display: mode === 'check-email' ? 'none' : undefined }}>
            {/* Email — shown for login, register, forgot */}
            {mode !== 'reset' && (
              <div>
                <label className="font-heading text-xs text-stone-400 mb-1 block">E-Mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="input-dark w-full font-body"
                  placeholder="held@example.com"
                />
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="font-heading text-xs text-stone-400 mb-1 block">Benutzername</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  className="input-dark w-full font-body"
                  placeholder="Dein Abenteurername"
                />
              </div>
            )}

            {/* Password — shown for login, register, reset */}
            {mode !== 'forgot' && (
              <div>
                <label className="font-heading text-xs text-stone-400 mb-1 block">
                  {mode === 'reset' ? 'Neues Passwort' : 'Passwort'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="input-dark w-full font-body"
                  placeholder="Mindestens 6 Zeichen"
                />
              </div>
            )}

            {/* Confirm password — only for reset */}
            {mode === 'reset' && (
              <div>
                <label className="font-heading text-xs text-stone-400 mb-1 block">Passwort bestätigen</label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  required
                  minLength={6}
                  className="input-dark w-full font-body"
                  placeholder="Passwort wiederholen"
                />
              </div>
            )}

            {error && (
              <div className="p-3 rounded border bg-blood-500/10 border-blood-500/50 text-red-400 font-body text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 rounded border bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-body text-sm">
                {success}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner w-4 h-4" /> Wird geladen...
                </span>
              ) : mode === 'login' || mode === 'verified' ? 'Anmelden'
                : mode === 'register' ? 'Konto erstellen'
                : mode === 'forgot' ? 'Link senden'
                : 'Passwort ändern'}
            </button>
          </form>

          {/* Forgot password link — hidden in check-email mode */}
          {(mode === 'login' || mode === 'verified') && mode !== 'check-email' && (
            <button
              onClick={() => switchMode('forgot')}
              className="mt-4 w-full text-center font-body text-xs text-stone-500 hover:text-gold-400 transition-colors"
            >
              Passwort vergessen?
            </button>
          )}

          {/* Back to login link */}
          {(mode === 'forgot' || mode === 'reset') && (
            <button
              onClick={() => switchMode('login')}
              className="mt-4 w-full text-center font-body text-xs text-stone-500 hover:text-gold-400 transition-colors"
            >
              Zurück zur Anmeldung
            </button>
          )}
        </div>

        <p className="text-center mt-6 font-body text-xs text-stone-600 italic">
          Deine Daten werden sicher auf dem Server gespeichert.
        </p>
      </div>
    </div>
  )
}
