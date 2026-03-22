import React from 'react'
import { NavLink } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { PROJECT_NAME, SRD_VERSION_LABEL } from '../data/srd'

const SwordIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <path d="M14.5 2.5L21 9l-9.5 9.5-2-2L17 9l-4-3.5L14.5 2.5z" />
    <path d="M9.5 14.5L3 21" />
    <path d="M12 12L6 18l-2-2 6-6" strokeOpacity="0.5"/>
  </svg>
)

const BookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <line x1="10" y1="7" x2="16" y2="7" />
    <line x1="10" y1="11" x2="16" y2="11" />
  </svg>
)

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <path d="M12 2L3 7v6c0 5.25 3.75 10.15 9 11.25C17.25 23.15 21 18.25 21 13V7L12 2z" />
    <path d="M9 12l2 2 4-4" strokeOpacity="0.7"/>
  </svg>
)

const ScrollIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
    <line x1="10" y1="7" x2="18" y2="7" />
    <line x1="10" y1="11" x2="18" y2="11" />
  </svg>
)

const GearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const navItems = [
  { to: '/', label: 'Übersicht', icon: ScrollIcon, end: true },
  { to: '/adventure', label: 'Abenteuer', icon: BookIcon },
  { to: '/character', label: 'Helden', icon: ShieldIcon },
  { to: '/game', label: 'Spielsitzung', icon: SwordIcon },
  { to: '/settings', label: 'Einstellungen', icon: GearIcon },
]

export default function Sidebar({ onClose }) {
  const { character, characters, adventure, adventures, combat, sessions, activeSession } = useGame()

  return (
    <aside className="w-64 min-h-screen flex flex-col border-r border-gold-700/20"
      style={{ background: 'linear-gradient(180deg, #0d0d0d 0%, #0a0a0a 100%)' }}>

      <div className="px-6 py-8 border-b border-gold-700/20 flex items-start justify-between">
        <div>
          <h1 className="font-display text-xl text-gold-500 leading-tight"
            style={{ textShadow: '0 0 20px rgba(212,160,23,0.5)' }}>
            Dungeons<br />& Daggers
          </h1>
          <p className="font-body text-xs text-stone-600 mt-1 italic">{SRD_VERSION_LABEL} Solo-Abenteuer</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-stone-500 hover:text-gold-500"
            aria-label="Menü schließen"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon />
            <span>{label}</span>
            {to === '/game' && combat?.active && (
              <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 pb-6 flex flex-col gap-3">
        <div className="divider-gold" />

        {character ? (
          <div className="panel px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="section-subtitle">Gebundener Held</p>
              <span className="font-body text-[11px] text-stone-600">{characters.length}</span>
            </div>
            <p className="font-heading text-sm text-parchment">{character.name}</p>
            <p className="font-body text-xs text-stone-500">{character.race} {character.class} · Stufe {character.level || 1}</p>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-stone-500 mb-1">
                <span>HP</span>
                <span>{character.currentHP ?? character.maxHP}/{character.maxHP}</span>
              </div>
              <div className="hp-bar-bg">
                <div
                  className="hp-bar-fill"
                  style={{ width: `${((character.currentHP ?? character.maxHP) / character.maxHP) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="panel px-3 py-2.5 text-center">
            <p className="font-body text-xs text-stone-600 italic">Kein Held aktiv</p>
            <p className="font-body text-[11px] text-stone-700 mt-1">Bibliothek: {characters.length}</p>
          </div>
        )}

        <div className="panel px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="section-subtitle mb-0.5">Abenteuer</p>
            <span className="font-body text-[11px] text-stone-600">{adventures.length}</span>
          </div>
          <p className="font-body text-xs text-stone-400 truncate">{adventure ? adventure.title : 'Kein Modul aktiv'}</p>
        </div>

        <div className="panel px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="section-subtitle mb-0.5">Sessions</p>
            <span className="font-body text-[11px] text-stone-600">{sessions.length}</span>
          </div>
          <p className="font-body text-xs text-stone-400 truncate">
            {activeSession ? 'Aktive Session geladen' : 'Keine Session aktiv'}
          </p>
        </div>

        <div className="panel px-3 py-2">
          <p className="section-subtitle mb-0.5">System</p>
          <p className="font-body text-xs text-stone-400">{PROJECT_NAME}</p>
          <p className="font-body text-[11px] text-stone-500">{SRD_VERSION_LABEL}</p>
        </div>
      </div>
    </aside>
  )
}
