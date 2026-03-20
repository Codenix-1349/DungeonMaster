import React from 'react'
import { useGame } from '../context/GameContext'

const ATTR_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }

export default function CharacterSheet({ compact = false }) {
  const { character, getModifier } = useGame()

  if (!character) {
    return (
      <div className="panel p-6 text-center">
        <p className="font-body text-stone-500 italic">Kein Charakter erstellt.</p>
        <p className="font-body text-xs text-stone-600 mt-1">Gehe zu "Charakter" um einen Charakter zu erstellen.</p>
      </div>
    )
  }

  const hpPercent = ((character.currentHP ?? character.maxHP) / character.maxHP) * 100

  if (compact) {
    return (
      <div className="panel p-3 flex items-center gap-4">
        <div>
          <p className="font-heading text-sm text-gold-400">{character.name}</p>
          <p className="font-body text-xs text-stone-500">{character.race} {character.class}</p>
        </div>
        <div className="flex-1">
          <div className="hp-bar-bg">
            <div className="hp-bar-fill" style={{ width: `${hpPercent}%` }} />
          </div>
          <p className="font-body text-xs text-stone-400 mt-0.5">
            {character.currentHP ?? character.maxHP}/{character.maxHP} HP
          </p>
        </div>
        <div className="text-right">
          <p className="font-body text-xs text-stone-500">RK {character.armorClass}</p>
          <p className="font-body text-xs text-stone-500">THAC0 {character.thac0 || 20}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="panel-gold p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="font-display text-2xl text-gold-400 mb-1">{character.name}</h2>
        <div className="flex items-center justify-center gap-2">
          <span className="badge-gold">{character.race}</span>
          <span className="badge-gold">{character.class}</span>
          <span className="badge-gold">Stufe {character.level || 1}</span>
        </div>
      </div>

      <div className="divider-gold" />

      {/* Attributes */}
      <div className="grid grid-cols-6 gap-2 mb-6">
        {Object.entries(ATTR_LABELS).map(([key, label]) => {
          const val = character.attributes?.[key] || 10
          const mod = getModifier(val)
          return (
            <div key={key} className="stat-box">
              <span className="stat-label">{label}</span>
              <span className="stat-value">{val}</span>
              <span className="stat-mod">{mod >= 0 ? '+' : ''}{mod}</span>
            </div>
          )
        })}
      </div>

      {/* Combat Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="panel p-3 text-center">
          <p className="section-subtitle mb-1">Trefferpunkte</p>
          <div className="hp-bar-bg mb-1">
            <div className="hp-bar-fill" style={{ width: `${hpPercent}%` }} />
          </div>
          <p className="font-heading text-lg text-parchment">
            {character.currentHP ?? character.maxHP}
            <span className="text-stone-500 text-sm">/{character.maxHP}</span>
          </p>
        </div>
        <div className="panel p-3 text-center">
          <p className="section-subtitle mb-1">Rüstung</p>
          <p className="font-display text-3xl text-gold-400">{character.armorClass}</p>
          <p className="font-body text-xs text-stone-500">Rüstungsklasse</p>
        </div>
        <div className="panel p-3 text-center">
          <p className="section-subtitle mb-1">THAC0</p>
          <p className="font-display text-3xl text-gold-400">{character.thac0 || 20}</p>
          <p className="font-body text-xs text-stone-500">To Hit AC 0</p>
        </div>
      </div>

      {/* XP */}
      <div className="panel p-3 mb-4 flex items-center justify-between">
        <span className="section-subtitle">Erfahrungspunkte</span>
        <span className="font-heading text-gold-400">{(character.xp || 0).toLocaleString()} XP</span>
      </div>

      {/* Inventory */}
      {character.inventory && character.inventory.length > 0 && (
        <div className="mb-4">
          <p className="section-subtitle mb-2">Inventar</p>
          <div className="panel p-3 flex flex-wrap gap-1.5">
            {character.inventory.map((item, i) => (
              <span key={i} className="badge-gold">{item}</span>
            ))}
          </div>
        </div>
      )}

      {/* Spells */}
      {character.spells && (
        <div>
          <p className="section-subtitle mb-2">Zaubersprüche</p>
          <div className="panel p-3">
            <p className="font-body text-sm text-stone-400">{character.spells}</p>
          </div>
        </div>
      )}
    </div>
  )
}
