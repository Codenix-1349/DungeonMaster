import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { PROJECT_NAME } from '../data/srd'

export default function LoginPage() {
  const { login, register } = useAuth()

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'register') {
        await register(email.trim(), username.trim(), password)
      } else {
        await login(email.trim(), password)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 py-2 rounded font-heading text-sm tracking-wide transition-colors ${
                mode === 'login'
                  ? 'bg-gold-600/20 text-gold-400 border border-gold-600/40'
                  : 'text-stone-500 border border-transparent hover:text-stone-300'
              }`}
            >
              Anmelden
            </button>
            <button
              onClick={() => { setMode('register'); setError('') }}
              className={`flex-1 py-2 rounded font-heading text-sm tracking-wide transition-colors ${
                mode === 'register'
                  ? 'bg-gold-600/20 text-gold-400 border border-gold-600/40'
                  : 'text-stone-500 border border-transparent hover:text-stone-300'
              }`}
            >
              Registrieren
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

            <div>
              <label className="font-heading text-xs text-stone-400 mb-1 block">Passwort</label>
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

            {error && (
              <div className="p-3 rounded border bg-blood-500/10 border-blood-500/50 text-red-400 font-body text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner w-4 h-4" /> Wird geladen...
                </span>
              ) : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 font-body text-xs text-stone-600 italic">
          Deine Daten werden sicher auf dem Server gespeichert.
        </p>
      </div>
    </div>
  )
}
