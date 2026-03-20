import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { PROJECT_NAME, SRD_VERSION_LABEL } from '../data/srd'

const RUNE_DECORATION = '✦ ✧ ✦'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { character, adventure, gameLog } = useGame()

  const lastEntry = gameLog[gameLog.length - 1]
  const sessionDate = lastEntry ? new Date(lastEntry.timestamp).toLocaleString('de-DE') : null

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-10 pt-4">
        <div className="ornament mb-4 text-gold-700/40 font-heading text-sm tracking-widest">
          {RUNE_DECORATION}
        </div>

        <h1 className="font-display text-5xl md:text-6xl text-gold-500 mb-3 leading-tight" style={{ textShadow: '0 0 30px rgba(212,160,23,0.35)' }}>
          Dungeons & Daggers
        </h1>

        <p className="font-heading text-base md:text-lg tracking-[0.3em] text-stone-500 uppercase relative">
          AI · SRD · Solo-Abenteuer
        </p>

        <div className="ornament mt-6 mb-2 text-gold-700/40 font-heading text-sm tracking-widest">
          {RUNE_DECORATION}
        </div>

        <p className="font-body text-lg text-stone-400 italic max-w-2xl mx-auto">
          Begib dich auf ein Solo-Abenteuer, geführt von KI und ausgerichtet auf das frei verfügbare {SRD_VERSION_LABEL}.
          Lade ein Abenteuer, erschaffe deinen Charakter und starte direkt in die erste Szene.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
                  <div className="hp-bar-fill" style={{ width: `${((character.currentHP ?? character.maxHP) / character.maxHP) * 100}%` }} />
                </div>
                <p className="font-body text-xs text-stone-500 mt-1">
                  {character.currentHP ?? character.maxHP}/{character.maxHP} HP · Stufe {character.level || 1}
                </p>
              </div>
            </>
          ) : (
            <p className="font-body text-sm text-stone-600 italic mt-2">Noch kein Held erschaffen</p>
          )}
          <button onClick={() => navigate('/character')} className="btn-ghost w-full mt-4 text-center">
            {character ? 'Bearbeiten' : 'Erstellen →'}
          </button>
        </div>

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
            <p className="font-body text-sm text-stone-600 italic mt-2">Kein Modul geladen</p>
          )}
          <button onClick={() => navigate('/adventure')} className="btn-ghost w-full mt-4 text-center">
            {adventure ? 'Module verwalten' : 'Hochladen →'}
          </button>
        </div>

        <div className={`panel p-5 transition-all duration-300 ${gameLog.length > 0 ? 'border-gold-600/40' : 'border-stone-800'}`}>
          <div className="flex items-start justify-between mb-3">
            <p className="section-subtitle">Session</p>
            <span className={`badge ${gameLog.length > 0 ? 'badge-gold' : 'badge-red'}`}>
              {gameLog.length > 0 ? `${gameLog.length} Nachrichten` : '○ Neu'}
            </span>
          </div>
          {lastEntry ? (
            <>
              <p className="font-body text-sm text-stone-400 italic line-clamp-2">„{lastEntry.content.substring(0, 80)}…"</p>
              <p className="font-body text-xs text-stone-600 mt-2">{sessionDate}</p>
            </>
          ) : (
            <p className="font-body text-sm text-stone-600 italic mt-2">Noch keine Session gestartet</p>
          )}
          <button onClick={() => navigate('/game')} className="btn-ghost w-full mt-4 text-center">
            {gameLog.length > 0 ? 'Fortsetzen →' : 'Starten →'}
          </button>
        </div>
      </div>

      <div className="panel-gold p-6 text-center">
        <div className="ornament mb-4 text-gold-700/40 font-heading text-sm tracking-widest">Schnellstart</div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {gameLog.length > 0 ? (
            <button onClick={() => navigate('/game')} className="btn-primary text-base px-8 py-3">
              ⚔️ Session fortsetzen
            </button>
          ) : (
            <button onClick={() => navigate('/game')} disabled={!character} className="btn-primary text-base px-8 py-3">
              ⚔️ Abenteuer beginnen
            </button>
          )}
          <button onClick={() => navigate('/adventure')} className="btn-ghost text-base px-8 py-3">
            📜 Modul laden
          </button>
        </div>
        {!character && (
          <p className="font-body text-xs text-stone-600 italic mt-3">
            Erstelle zuerst einen Charakter, um das Abenteuer zu beginnen.
          </p>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        {[
          { step: '1', title: 'Einstellungen', desc: 'OpenRouter API Key eingeben und Modell wählen', route: '/settings' },
          { step: '2', title: 'Abenteuer', desc: 'PDF oder TXT Abenteuer hochladen (optional)', route: '/adventure' },
          { step: '3', title: 'Charakter', desc: 'SRD-Helden erschaffen und Attribute würfeln', route: '/character' },
        ].map(({ step, title, desc, route }) => (
          <div key={step} className="panel p-4 cursor-pointer hover:border-gold-600/30 transition-colors" onClick={() => navigate(route)}>
            <div className="font-display text-4xl text-gold-700/40 mb-2">{step}</div>
            <p className="font-heading text-sm text-gold-500 mb-1">{title}</p>
            <p className="font-body text-sm text-stone-500 italic">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}