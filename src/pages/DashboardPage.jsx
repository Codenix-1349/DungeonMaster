import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'

const RUNE_DECORATION = '᛫ ✦ ᛫'

export default function DashboardPage() {
  const { character, adventure, gameLog } = useGame()
  const navigate = useNavigate()

  const lastEntry = gameLog.length > 0 ? gameLog[gameLog.length - 1] : null
  const sessionDate = lastEntry
    ? new Date(lastEntry.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="relative inline-block">
          <div className="absolute inset-0 blur-3xl opacity-20"
            style={{ background: 'radial-gradient(ellipse, rgba(212,160,23,0.6) 0%, transparent 70%)' }} />
          <h1 className="font-display text-5xl lg:text-6xl text-gold-400 relative leading-tight mb-2"
            style={{ textShadow: '0 0 30px rgba(212,160,23,0.5), 0 2px 4px rgba(0,0,0,0.8)' }}>
            Dungeon & Daggers
          </h1>
          <p className="font-heading text-lg text-gold-700 tracking-widest uppercase relative">
            AI · 
          </p>
        </div>

        <div className="ornament mt-6 mb-2 text-gold-700/40 font-heading text-sm tracking-widest">
          {RUNE_DECORATION}
        </div>

        <p className="font-body text-lg text-stone-400 italic max-w-xl mx-auto">
          Begieb dich auf ein Solo-Abenteuer, geführt von künstlicher Intelligenz.
          Lade ein Abenteuermodul, erschaffe deinen Charakter und betritt das Dungeon.
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Character Status */}
        <div className={`panel p-5 transition-all duration-300 ${character ? 'border-gold-600/40' : 'border-stone-800'}`}>
          <div className="flex items-start justify-between mb-3">
            <p className="section-subtitle">Charakter</p>
            <span className={`badge ${character ? 'badge-green' : 'badge-red'}`}>
              {character ? '● Aktiv' : '○ Keiner'}
            </span>
          </div>
          {character ? (
            <>
              <p className="font-heading text-xl text-parchment mb-1">{character.name}</p>
              <p className="font-body text-sm text-stone-500">{character.race} {character.class}</p>
              <div className="mt-3">
                <div className="hp-bar-bg">
                  <div className="hp-bar-fill"
                    style={{ width: `${((character.currentHP ?? character.maxHP) / character.maxHP) * 100}%` }} />
                </div>
                <p className="font-body text-xs text-stone-500 mt-1">
                  {character.currentHP ?? character.maxHP}/{character.maxHP} HP · Stufe {character.level || 1}
                </p>
              </div>
            </>
          ) : (
            <p className="font-body text-sm text-stone-600 italic mt-2">
              Noch kein Held erschaffen
            </p>
          )}
          <button onClick={() => navigate('/character')}
            className="btn-ghost w-full mt-4 text-center">
            {character ? 'Bearbeiten' : 'Erstellen →'}
          </button>
        </div>

        {/* Adventure Status */}
        <div className={`panel p-5 transition-all duration-300 ${adventure ? 'border-gold-600/40' : 'border-stone-800'}`}>
          <div className="flex items-start justify-between mb-3">
            <p className="section-subtitle">Abenteuer</p>
            <span className={`badge ${adventure ? 'badge-gold' : 'badge-red'}`}>
              {adventure ? '● Geladen' : '○ Keines'}
            </span>
          </div>
          {adventure ? (
            <>
              <p className="font-heading text-lg text-parchment leading-tight mb-1">{adventure.title}</p>
              <p className="font-body text-xs text-stone-500 italic">
                {adventure.text ? `${adventure.text.length.toLocaleString()} Zeichen` : 'Kein Text'}
              </p>
            </>
          ) : (
            <p className="font-body text-sm text-stone-600 italic mt-2">
              Kein Modul geladen
            </p>
          )}
          <button onClick={() => navigate('/adventure')}
            className="btn-ghost w-full mt-4 text-center">
            {adventure ? 'Module verwalten' : 'Hochladen →'}
          </button>
        </div>

        {/* Session Status */}
        <div className={`panel p-5 transition-all duration-300 ${gameLog.length > 0 ? 'border-gold-600/40' : 'border-stone-800'}`}>
          <div className="flex items-start justify-between mb-3">
            <p className="section-subtitle">Session</p>
            <span className={`badge ${gameLog.length > 0 ? 'badge-gold' : 'badge-red'}`}>
              {gameLog.length > 0 ? `${gameLog.length} Nachrichten` : '○ Neu'}
            </span>
          </div>
          {lastEntry ? (
            <>
              <p className="font-body text-sm text-stone-400 italic line-clamp-2">
                „{lastEntry.content.substring(0, 80)}…"
              </p>
              <p className="font-body text-xs text-stone-600 mt-2">{sessionDate}</p>
            </>
          ) : (
            <p className="font-body text-sm text-stone-600 italic mt-2">
              Noch keine Session gestartet
            </p>
          )}
          <button onClick={() => navigate('/game')}
            className="btn-ghost w-full mt-4 text-center">
            {gameLog.length > 0 ? 'Fortsetzen →' : 'Starten →'}
          </button>
        </div>
      </div>

      {/* Quick Start */}
      <div className="panel-gold p-6 text-center">
        <div className="ornament mb-4 text-gold-700/40 font-heading text-sm tracking-widest">Schnellstart</div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {gameLog.length > 0 ? (
            <button onClick={() => navigate('/game')}
              className="btn-primary text-base px-8 py-3">
              ⚔️ Session fortsetzen
            </button>
          ) : (
            <button
              onClick={() => navigate('/game')}
              disabled={!character}
              className="btn-primary text-base px-8 py-3">
              ⚔️ Abenteuer beginnen
            </button>
          )}
          <button onClick={() => navigate('/adventure')}
            className="btn-ghost text-base px-8 py-3">
            📜 Modul laden
          </button>
        </div>
        {!character && (
          <p className="font-body text-xs text-stone-600 italic mt-3">
            Erstelle zuerst einen Charakter, um das Abenteuer zu beginnen.
          </p>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        {[
          { step: '1', title: 'Einstellungen', desc: 'OpenRouter API Key eingeben und Modell wählen', route: '/settings' },
          { step: '2', title: 'Abenteuer', desc: 'PDF oder TXT Abenteuermodul hochladen (optional)', route: '/adventure' },
          { step: '3', title: 'Charakter', desc: 'AD&D Charakter erschaffen und Attribute würfeln', route: '/character' },
        ].map(({ step, title, desc, route }) => (
          <div key={step} className="panel p-4 cursor-pointer hover:border-gold-600/30 transition-colors"
            onClick={() => navigate(route)}>
            <div className="font-display text-4xl text-gold-700/40 mb-2">{step}</div>
            <p className="font-heading text-sm text-gold-500 mb-1">{title}</p>
            <p className="font-body text-sm text-stone-500 italic">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
