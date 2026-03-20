import React, { useState, useCallback } from 'react'
import { useGame } from '../context/GameContext'

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1
}

export default function CombatTracker({ onCombatAction }) {
  const { character, combat, setCombat, endCombat, updateCharacterHP, getModifier } = useGame()
  const [playerInitiative, setPlayerInitiative] = useState(null)
  const [actionLog, setActionLog] = useState([])

  const addLog = useCallback((text) => {
    setActionLog(prev => [...prev.slice(-20), { id: Date.now(), text }])
  }, [])

  const rollInitiative = useCallback(() => {
    const roll = rollDie(20)
    const dexMod = character ? getModifier(character.attributes?.dex || 10) : 0
    const total = roll + dexMod
    setPlayerInitiative(total)
    setCombat(prev => ({ ...prev, playerInitiative: total, phase: 'action' }))
    addLog(`Initiative gewürfelt: ${roll} ${dexMod >= 0 ? '+' : '-'} ${Math.abs(dexMod)} = ${total}`)
    if (onCombatAction) onCombatAction(`Initiative-Wurf: ${total} (d20 ${dexMod >= 0 ? '+' : '-'} ${Math.abs(dexMod)})`)
  }, [character, getModifier, setCombat, addLog, onCombatAction])

  const rollAttack = useCallback(() => {
    if (!character) return
    const roll = rollDie(20)
    const abilityMod = getModifier(character.attributes?.str || 10)
    const proficiencyBonus = character.proficiencyBonus || 2
    const attackBonus = Number(character.attackBonus ?? abilityMod + proficiencyBonus)
    const total = roll + attackBonus
    const isCrit = roll === 20
    const isFumble = roll === 1

    addLog(`Angriffswurf: ${roll}${isCrit ? ' ⚡KRITISCH!' : isFumble ? ' 💀PATZER!' : ` + ${attackBonus} = ${total}`}`)

    const message = isCrit
      ? `Kritischer Treffer! Natürliche 20 beim Angriff.`
      : isFumble
      ? 'Patzer! Natürliche 1 beim Angriff.'
      : `Angriffswurf: ${total} (d20: ${roll}, Angriffsbonus: ${attackBonus >= 0 ? '+' : ''}${attackBonus})`

    if (onCombatAction) onCombatAction(message)
  }, [character, getModifier, addLog, onCombatAction])

  const rollDamage = useCallback((diceType = 'd6') => {
    const sides = parseInt(diceType.replace('d', ''))
    const roll = rollDie(sides)
    const strMod = character ? getModifier(character.attributes?.str || 10) : 0
    const total = Math.max(1, roll + strMod)

    addLog(`Schaden: ${roll} + ${strMod} = ${total}`)
    if (onCombatAction) onCombatAction(`Schaden: ${total} (${diceType}: ${roll}, STR: ${strMod >= 0 ? '+' : ''}${strMod})`)
  }, [character, getModifier, addLog, onCombatAction])

  const rollSave = useCallback((saveType) => {
    const roll = rollDie(20)
    addLog(`Rettungswurf (${saveType}): ${roll}`)
    if (onCombatAction) onCombatAction(`Rettungswurf gegen ${saveType}: ${roll}`)
  }, [addLog, onCombatAction])

  const nextRound = useCallback(() => {
    setCombat(prev => ({ ...prev, round: (prev.round || 1) + 1, phase: 'action' }))
    setPlayerInitiative(null)
    addLog(`--- Runde ${(combat?.round || 1) + 1} beginnt ---`)
    if (onCombatAction) onCombatAction('Neue Kampfrunde beginnt.')
  }, [setCombat, combat, addLog, onCombatAction])

  const handleEndCombat = useCallback(() => {
    addLog('⚔️ Kampf beendet')
    endCombat()
    if (onCombatAction) onCombatAction('Der Kampf ist beendet.')
  }, [endCombat, addLog, onCombatAction])

  const takeDamage = useCallback((amount) => {
    if (!character) return
    const newHP = Math.max(0, (character.currentHP ?? character.maxHP) - amount)
    updateCharacterHP(newHP)
    addLog(`${character.name} erleidet ${amount} Schaden (HP: ${newHP}/${character.maxHP})`)
    if (onCombatAction) onCombatAction(`${character.name} erleidet ${amount} Schaden und hat noch ${newHP} HP.`)
  }, [character, updateCharacterHP, addLog, onCombatAction])

  if (!combat?.active) return null

  const hpPercent = character ? ((character.currentHP ?? character.maxHP) / character.maxHP) * 100 : 100
  const hpColor = hpPercent > 60 ? '#16a34a' : hpPercent > 30 ? '#d97706' : '#dc2626'

  return (
    <div className="panel-gold p-4 animate-slide-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-red-500 animate-pulse text-lg">⚔️</span>
          <h3 className="font-heading text-red-400 tracking-wider">KAMPF AKTIV</h3>
          <span className="badge-red">Runde {combat.round || 1}</span>
        </div>
        <button onClick={handleEndCombat} className="btn-ghost text-xs">Kampf beenden</button>
      </div>

      <div className="divider-gold" />

      {character && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-heading text-stone-400">{character.name}</span>
            <span className="font-heading" style={{ color: hpColor }}>
              {character.currentHP ?? character.maxHP} / {character.maxHP} HP
            </span>
          </div>
          <div className="hp-bar-bg">
            <div className="hp-bar-fill transition-all duration-500"
              style={{ width: `${hpPercent}%`, background: `linear-gradient(90deg, ${hpColor}88, ${hpColor})` }} />
          </div>
          <div className="flex gap-2 mt-2">
            {[1, 2, 3, 5, 8, 10].map(n => (
              <button key={n} onClick={() => takeDamage(n)}
                className="btn-danger px-2 py-1 text-xs">-{n}</button>
            ))}
            {[1, 2, 3, 5].map(n => (
              <button key={n} onClick={() => updateCharacterHP((character.currentHP ?? character.maxHP) + n)}
                className="btn-primary px-2 py-1 text-xs text-emerald-400 border-emerald-800">+{n}</button>
            ))}
          </div>
        </div>
      )}

      <div className="divider-gold" />

      <div className="grid grid-cols-2 gap-2 mb-3">
        {combat.phase === 'initiative' && (
          <button onClick={rollInitiative} className="btn-primary col-span-2">
            🎲 Initiative würfeln (d20)
          </button>
        )}
        <button onClick={rollAttack} className="btn-primary">⚔️ Angriff (d20)</button>
        <button onClick={() => rollDamage('d6')} className="btn-primary">💥 Schaden (d6)</button>
        <button onClick={() => rollDamage('d8')} className="btn-ghost">Schaden d8</button>
        <button onClick={nextRound} className="btn-ghost">Nächste Runde</button>
      </div>

      <div className="mb-3">
        <p className="section-subtitle mb-2">Rettungswürfe</p>
        <div className="flex flex-wrap gap-1.5">
          {['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(s => (
            <button key={s} onClick={() => rollSave(s)}
              className="btn-ghost text-xs px-2 py-1">{s}</button>
          ))}
        </div>
      </div>

      {playerInitiative !== null && (
        <div className="mb-3 font-body text-xs text-stone-500">
          Deine aktuelle Initiative: <span className="text-gold-400">{playerInitiative}</span>
        </div>
      )}

      {actionLog.length > 0 && (
        <div className="bg-dungeon-300/50 rounded border border-stone-800 p-2 max-h-28 overflow-y-auto">
          {actionLog.slice().reverse().map(entry => (
            <p key={entry.id} className="font-body text-xs text-stone-400 leading-5">{entry.text}</p>
          ))}
        </div>
      )}
    </div>
  )
}
