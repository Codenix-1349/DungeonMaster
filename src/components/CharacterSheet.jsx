import React from 'react'
import { useGame } from '../context/GameContext'
import { ATTR_SHORT_LABELS, SKILLS, SPELL_LIST, PROJECT_NAME, calcSkillBonus } from '../data/srd'

export default function CharacterSheet({ compact = false }) {
  const { character, getModifier } = useGame()

  if (!character) {
    return (
      <div className="panel p-6 text-center">
        <p className="font-body text-stone-500 italic">Kein Charakter erstellt.</p>
        <p className="font-body text-xs text-stone-600 mt-1">Gehe zu „Charakter“, um einen SRD-Helden für {PROJECT_NAME} zu erstellen.</p>
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
          <p className="font-body text-xs text-stone-500">AC {character.armorClass}</p>
          <p className="font-body text-xs text-stone-500">Angriff {character.attackBonus >= 0 ? '+' : ''}{character.attackBonus}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="panel-gold p-6">
      <div className="text-center mb-6">
        <h2 className="font-display text-2xl text-gold-400 mb-1">{character.name}</h2>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="badge-gold">{character.race}</span>
          <span className="badge-gold">{character.class}</span>
          <span className="badge-gold">Stufe {character.level || 1}</span>
          <span className="badge-gold">Prof +{character.proficiencyBonus || 2}</span>
        </div>
      </div>

      <div className="divider-gold" />

      <div className="grid grid-cols-6 gap-2 mb-6">
        {Object.entries(ATTR_SHORT_LABELS).map(([key, label]) => {
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

      <div className="grid grid-cols-4 gap-3 mb-6">
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
          <p className="section-subtitle mb-1">AC</p>
          <p className="font-display text-3xl text-gold-400">{character.armorClass}</p>
          <p className="font-body text-xs text-stone-500">Rüstungsklasse</p>
        </div>
        <div className="panel p-3 text-center">
          <p className="section-subtitle mb-1">Angriff</p>
          <p className="font-display text-3xl text-gold-400">{character.attackBonus >= 0 ? '+' : ''}{character.attackBonus}</p>
          <p className="font-body text-xs text-stone-500">Attack Bonus</p>
        </div>
        <div className="panel p-3 text-center">
          <p className="section-subtitle mb-1">Initiative</p>
          <p className="font-display text-3xl text-gold-400">{character.initiativeBonus >= 0 ? '+' : ''}{character.initiativeBonus}</p>
          <p className="font-body text-xs text-stone-500">DEX-basiert</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="panel p-3 flex items-center justify-between">
          <span className="section-subtitle">Erfahrungspunkte</span>
          <span className="font-heading text-gold-400">{(character.xp || 0).toLocaleString()} XP</span>
        </div>
        <div className="panel p-3 flex items-center justify-between">
          <span className="section-subtitle">Zauber-SG</span>
          <span className="font-heading text-gold-400">{character.spellSaveDC ?? '—'}</span>
        </div>
      </div>

      {character.skillProficiencies?.length > 0 && (
        <div className="mb-4">
          <p className="section-subtitle mb-2">Fertigkeiten</p>
          <div className="panel p-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {SKILLS.map(skill => {
              const isProficient = character.skillProficiencies.includes(skill.key)
              const bonus = calcSkillBonus(character.attributes?.[skill.ability] || 10, character.level || 1, isProficient)
              return (
                <div key={skill.key} className={`flex items-center gap-1.5 text-xs font-body ${isProficient ? 'text-gold-300' : 'text-stone-600'}`}>
                  <span className={`w-2 h-2 rounded-full ${isProficient ? 'bg-gold-500' : 'bg-stone-700'}`} />
                  <span className="truncate">{skill.label}</span>
                  <span className="ml-auto font-heading">{bonus >= 0 ? '+' : ''}{bonus}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

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

      {(character.knownCantrips?.length > 0 || character.knownSpells?.length > 0 || character.spells) && (
        <div>
          <p className="section-subtitle mb-2">Zauber & Fähigkeiten</p>
          <div className="panel p-3 space-y-2">
            {character.knownCantrips?.length > 0 && (
              <div>
                <p className="font-heading text-xs text-stone-500 mb-1">Cantrips</p>
                <div className="flex flex-wrap gap-1">
                  {character.knownCantrips.map(key => {
                    const spell = SPELL_LIST.find(s => s.key === key)
                    return spell ? <span key={key} className="badge-gold text-xs">{spell.name}</span> : null
                  })}
                </div>
              </div>
            )}
            {character.knownSpells?.length > 0 && (
              <div>
                <p className="font-heading text-xs text-stone-500 mb-1">Zaubersprüche</p>
                <div className="flex flex-wrap gap-1">
                  {character.knownSpells.map(key => {
                    const spell = SPELL_LIST.find(s => s.key === key)
                    return spell ? (
                      <span key={key} className="badge-gold text-xs">
                        {spell.name} <span className="text-stone-500">(Lv{spell.level})</span>
                      </span>
                    ) : null
                  })}
                </div>
              </div>
            )}
            {character.spellSlots && Object.keys(character.spellSlots).some(k => character.spellSlots[k] > 0) && (
              <div>
                <p className="font-heading text-xs text-stone-500 mb-1">Zauberplaetze</p>
                <div className="flex gap-3 flex-wrap">
                  {Object.entries(character.spellSlots).filter(([, count]) => count > 0).map(([lvl, maxCount]) => {
                    const cur = character.currentSpellSlots?.[lvl] ?? maxCount
                    return (
                      <span key={lvl} className={`text-xs font-body ${cur > 0 ? 'text-stone-400' : 'text-stone-600'}`}>
                        Grad {lvl}: <span className={`font-heading ${cur > 0 ? 'text-gold-400' : 'text-red-500'}`}>{cur}</span>
                        <span className="text-stone-600">/{maxCount}</span>
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
            {!character.knownCantrips?.length && !character.knownSpells?.length && character.spells && (
              <p className="font-body text-sm text-stone-400">{character.spells}</p>
            )}
            {character.spellAttackBonus !== null && character.spellAttackBonus !== undefined && (
              <p className="font-body text-xs text-stone-500 mt-1">
                Zauberangriff: {character.spellAttackBonus >= 0 ? '+' : ''}{character.spellAttackBonus}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}