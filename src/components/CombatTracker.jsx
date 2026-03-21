import React, { useState, useCallback, useEffect } from 'react'
import { useGame } from '../context/GameContext'

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1
}

function parseDamageDice(diceStr = '1d6+0') {
  const match = String(diceStr).match(/(\d+)d(\d+)([+-]\d+)?/)
  if (!match) return { count: 1, sides: 6, bonus: 0 }
  return {
    count: parseInt(match[1]) || 1,
    sides: parseInt(match[2]) || 6,
    bonus: parseInt(match[3] || '0') || 0,
  }
}

function rollDamageStr(diceStr = '1d6+0') {
  const { count, sides, bonus } = parseDamageDice(diceStr)
  let total = bonus
  for (let i = 0; i < count; i++) total += rollDie(sides)
  return Math.max(1, total)
}

function HpBar({ current, max, label, small = false }) {
  const pct = Math.max(0, Math.min((current / Math.max(1, max)) * 100, 100))
  const color = pct > 60 ? '#16a34a' : pct > 30 ? '#d97706' : '#dc2626'
  return (
    <div className={small ? 'mb-1' : 'mb-2'}>
      {label && (
        <div className="flex justify-between text-xs mb-0.5">
          <span className="font-heading text-stone-400">{label}</span>
          <span className="font-heading" style={{ color }}>{current}/{max} HP</span>
        </div>
      )}
      <div className="hp-bar-bg">
        <div className="hp-bar-fill transition-all duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
      </div>
    </div>
  )
}

function TurnBadge({ isPlayerTurn }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-heading ${
      isPlayerTurn
        ? 'bg-gold-600/20 border border-gold-600/40 text-gold-400'
        : 'bg-red-900/30 border border-red-700/40 text-red-400'
    }`}>
      <span className={isPlayerTurn ? 'animate-pulse' : ''}>{isPlayerTurn ? '⚔️' : '💀'}</span>
      {isPlayerTurn ? 'DEIN ZUG' : 'GEGNER ZUG'}
    </div>
  )
}

export default function CombatTracker({ onCombatAction }) {
  const { character, combat, setCombat, endCombat, updateCharacterHP, getModifier, awardXP } = useGame()
  const [actionLog, setActionLog] = useState([])
  const [pendingAttackRoll, setPendingAttackRoll] = useState(null)
  const [enemyTurnPending, setEnemyTurnPending] = useState(false)

  const addLog = useCallback((text) => {
    setActionLog(prev => [...prev.slice(-30), { id: Date.now() + Math.random(), text }])
  }, [])

  // Initiative roll
  const rollInitiative = useCallback(() => {
    const roll = rollDie(20)
    const dexMod = character ? getModifier(character.attributes?.dex || 10) : 0
    const playerInit = roll + dexMod
    const enemies = (combat?.enemies || []).map(e => ({
      ...e,
      initiative: rollDie(20) + (e.initiativeBonus || 0),
    }))
    const enemyMaxInit = enemies.length ? Math.max(...enemies.map(e => e.initiative)) : 0
    const playerFirst = playerInit >= enemyMaxInit
    setCombat(prev => ({ ...prev, playerInitiative: playerInit, enemies, phase: 'action', isPlayerTurn: playerFirst, round: 1 }))
    addLog(`⚄ Initiative: Du ${playerInit} | Gegner: ${enemies.map(e => `${e.name} ${e.initiative}`).join(', ')}`)
    addLog(playerFirst ? '✅ Du handelst zuerst!' : '⚠️ Gegner handeln zuerst!')
    if (!playerFirst) setTimeout(() => setEnemyTurnPending(true), 600)
  }, [character, combat, getModifier, setCombat, addLog])

  // Enemy auto-attack
  useEffect(() => {
    if (!enemyTurnPending || !combat?.active || combat?.isPlayerTurn) return
    if (!character) return
    setEnemyTurnPending(false)
    const livingEnemies = (combat?.enemies || []).filter(e => e.currentHP > 0)
    if (!livingEnemies.length) return
    let newHP = character.currentHP ?? character.maxHP
    const logs = []
    for (const enemy of livingEnemies) {
      const attackRoll = rollDie(20)
      const atkTotal = attackRoll + (enemy.attackBonus || 3)
      const playerAC = character.armorClass || 12
      if (attackRoll === 1) {
        logs.push(`💨 ${enemy.name}: Patzer! Verfehlt.`)
      } else if (attackRoll === 20 || atkTotal >= playerAC) {
        const dmgDice = enemy.damageDice || '1d6'
        const bonusDmg = enemy.damageBonus || 0
        let dmg = rollDamageStr(dmgDice) + bonusDmg
        if (attackRoll === 20) dmg += rollDamageStr(dmgDice)
        newHP = Math.max(0, newHP - dmg)
        logs.push(attackRoll === 20
          ? `💥 ${enemy.name} KRITISCH! ${dmg} Schaden → Du: ${newHP}/${character.maxHP} HP`
          : `🗡 ${enemy.name} trifft (${atkTotal} vs AC ${playerAC}) → ${dmg} Schaden → Du: ${newHP}/${character.maxHP} HP`)
      } else {
        logs.push(`🛡 ${enemy.name} verfehlt (${atkTotal} vs AC ${playerAC})`)
      }
    }
    updateCharacterHP(newHP)
    logs.forEach(addLog)
    if (onCombatAction) onCombatAction(`[Gegner-Angriff] ${logs.join(' | ')}${newHP <= 0 ? ' — Du bist bewusstlos!' : ''}`)
    setCombat(prev => ({ ...prev, isPlayerTurn: true }))
    if (newHP <= 0) addLog('☠️ Du bist bewusstlos! (0 HP)')
  }, [enemyTurnPending, combat, character, updateCharacterHP, addLog, onCombatAction, setCombat])

  const rollAttack = useCallback(() => {
    if (!character || !combat?.isPlayerTurn || combat?.phase !== 'action') return
    const roll = rollDie(20)
    const abilityMod = getModifier(character.attributes?.str || 10)
    const profBonus = character.proficiencyBonus || 2
    const attackBonus = Number(character.attackBonus ?? (abilityMod + profBonus))
    const total = roll + attackBonus
    const isCrit = roll === 20
    const isFumble = roll === 1
    setPendingAttackRoll({ roll, total, isCrit, isFumble, attackBonus })
    const msg = isCrit ? `⚡ KRITISCH! Natürliche 20. Würfle jetzt Schaden!`
      : isFumble ? `💀 Patzer! Natürliche 1 – kein Schaden.`
      : `Angriffswurf: ${total} (d20: ${roll} + Bonus: ${attackBonus >= 0 ? '+' : ''}${attackBonus})`
    addLog(msg)
    if (onCombatAction) onCombatAction(`[Angriffswurf] ${msg}`)
  }, [character, combat, getModifier, addLog, onCombatAction])

  const rollDamageAction = useCallback((diceStr = '1d6') => {
    if (!character || !combat?.isPlayerTurn || combat?.phase !== 'action') return
    if (pendingAttackRoll?.isFumble) { setPendingAttackRoll(null); return }
    const enemies = combat?.enemies || []
    const livingEnemies = enemies.filter(e => e.currentHP > 0)
    if (!livingEnemies.length) return
    const strMod = getModifier(character.attributes?.str || 10)
    const fullDice = `${diceStr}${strMod >= 0 ? `+${strMod}` : `${strMod}`}`
    let dmg = rollDamageStr(fullDice)
    if (pendingAttackRoll?.isCrit) dmg += rollDamageStr(diceStr)
    const target = livingEnemies[0]
    const newEnemyHP = Math.max(0, target.currentHP - dmg)
    const updatedEnemies = enemies.map(e => e.id === target.id ? { ...e, currentHP: newEnemyHP } : e)
    setCombat(prev => ({ ...prev, enemies: updatedEnemies }))
    setPendingAttackRoll(null)
    const msg = newEnemyHP <= 0
      ? `💀 ${target.name} fällt! ${dmg} Schaden.`
      : `${target.name} erleidet ${dmg} Schaden (${newEnemyHP}/${target.maxHP} HP verbleibend)`
    addLog(msg)
    if (onCombatAction) onCombatAction(`[Schaden] ${msg}`)
    const allDead = updatedEnemies.every(e => e.currentHP <= 0)
    if (allDead) {
      const totalXP = updatedEnemies.reduce((sum, e) => sum + (e.xp || 0), 0)
      addLog(`🏆 Alle Gegner besiegt! +${totalXP} XP`)
      if (onCombatAction) onCombatAction(`[KAMPF VORBEI] Du hast gewonnen! +${totalXP} XP`)
      if (awardXP) awardXP(totalXP)
      setTimeout(() => endCombat(), 800)
      return
    }
    setCombat(prev => ({ ...prev, isPlayerTurn: false }))
    addLog('→ Gegner sind dran...')
    setTimeout(() => setEnemyTurnPending(true), 600)
  }, [character, combat, pendingAttackRoll, getModifier, setCombat, addLog, onCombatAction, endCombat, awardXP])

  const rollSave = useCallback((label, attr) => {
    const roll = rollDie(20)
    const mod = character ? getModifier(character.attributes?.[attr] || 10) : 0
    const total = roll + mod
    addLog(`Rettungswurf ${label}: d20 ${roll} + ${mod} = ${total}`)
    if (onCombatAction) onCombatAction(`[Rettungswurf ${label}] Ergebnis: ${total}`)
  }, [character, getModifier, addLog, onCombatAction])

  const nextRound = useCallback(() => {
    if (!combat?.isPlayerTurn) return
    const nextRoundNum = (combat?.round || 1) + 1
    setCombat(prev => ({ ...prev, round: nextRoundNum, phase: 'action', isPlayerTurn: false }))
    addLog(`--- Runde ${nextRoundNum} beginnt. Gegner handeln zuerst. ---`)
    if (onCombatAction) onCombatAction(`Neue Kampfrunde ${nextRoundNum}. Gegner handeln.`)
    setTimeout(() => setEnemyTurnPending(true), 400)
  }, [combat, setCombat, addLog, onCombatAction])

  const handleEndCombat = useCallback(() => {
    addLog('⚔️ Kampf beendet.')
    endCombat()
    if (onCombatAction) onCombatAction('Der Kampf ist beendet.')
  }, [endCombat, addLog, onCombatAction])

  if (!combat?.active) return null

  const isInitPhase = !combat.playerInitiative || combat.playerInitiative === 0 || combat.phase === 'initiative'
  const isPlayerTurn = Boolean(combat.isPlayerTurn)
  const enemies = combat.enemies || []
  const playerHP = character?.currentHP ?? character?.maxHP ?? 0
  const playerMaxHP = character?.maxHP ?? 1
  const actionDisabled = !isPlayerTurn || isInitPhase

  return (
    <div className="panel-gold p-4 animate-slide-in space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-red-500 animate-pulse">⚔️</span>
          <h3 className="font-heading text-red-400 tracking-wider">KAMPF</h3>
          <span className="badge-red text-xs">Runde {combat.round || 1}</span>
        </div>
        <div className="flex items-center gap-2">
          {!isInitPhase && <TurnBadge isPlayerTurn={isPlayerTurn} />}
          <button onClick={handleEndCombat} className="btn-ghost text-xs px-2 py-1">✕</button>
        </div>
      </div>

      <div className="divider-gold" />

      {/* Initiative */}
      {isInitPhase && (
        <div>
          <p className="font-body text-xs text-stone-400 mb-2">Wer handelt zuerst? Würfle Initiative!</p>
          <button onClick={rollInitiative} className="btn-primary w-full">🎲 Initiative würfeln (d20 + DEX)</button>
        </div>
      )}

      {/* Enemy HP Bars */}
      {enemies.length > 0 && (
        <div>
          <p className="section-subtitle mb-2">Gegner</p>
          <div className="space-y-2">
            {enemies.map(enemy => (
              <div key={enemy.id} className={`${enemy.currentHP <= 0 ? 'opacity-40' : ''}`}>
                <HpBar current={enemy.currentHP} max={enemy.maxHP}
                  label={enemy.currentHP <= 0 ? `${enemy.name} ☠️` : enemy.name} small />
                <p className="font-body text-xs text-stone-600">AC {enemy.ac} · ATK +{enemy.attackBonus} · {enemy.damageDice} · {enemy.xp} XP</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Player HP */}
      {character && (
        <div>
          <HpBar current={playerHP} max={playerMaxHP} label={character.name} />
          <div className="flex flex-wrap gap-1 mt-1">
            {[1,2,3,5,8].map(n => (
              <button key={n} onClick={() => updateCharacterHP(playerHP - n)}
                className="btn-danger px-1.5 py-0.5 text-xs">-{n}</button>
            ))}
            {[1,2,4].map(n => (
              <button key={n} onClick={() => updateCharacterHP(playerHP + n)}
                className="btn-ghost px-1.5 py-0.5 text-xs" style={{color:'#34d399'}}>+{n}</button>
            ))}
          </div>
        </div>
      )}

      <div className="divider-gold" />

      {/* Combat Actions */}
      {!isInitPhase && (
        <div className="space-y-2">
          {!isPlayerTurn && (
            <div className="bg-red-900/20 border border-red-700/30 rounded p-2 text-xs font-body text-red-400 text-center animate-pulse">
              Gegner sind am Zug – warte...
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button onClick={rollAttack} disabled={actionDisabled}
              className={`btn-primary text-sm ${actionDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
              ⚔️ Angriff (d20)
            </button>
            <button onClick={() => rollDamageAction('1d6')} disabled={actionDisabled}
              className={`btn-primary text-sm ${actionDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
              💥 Schaden (d6)
            </button>
            <button onClick={() => rollDamageAction('1d8')} disabled={actionDisabled}
              className={`btn-ghost text-xs ${actionDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
              Schaden d8
            </button>
            <button onClick={nextRound} disabled={!isPlayerTurn}
              className={`btn-ghost text-xs ${!isPlayerTurn ? 'opacity-40 cursor-not-allowed' : ''}`}>
              ⏭ Runde beenden
            </button>
          </div>

          {pendingAttackRoll && (
            <div className="bg-gold-600/10 border border-gold-600/30 rounded p-2 text-xs font-body text-gold-400">
              {pendingAttackRoll.isCrit ? '⚡ KRITISCH! Würfle jetzt Schaden.'
                : pendingAttackRoll.isFumble ? '💀 Patzer – kein Schaden möglich.'
                : `Trefferwurf: ${pendingAttackRoll.total}. Vergleiche mit Gegner-AC – dann Schaden würfeln!`}
            </div>
          )}

          <div>
            <p className="section-subtitle mb-1">Rettungswürfe</p>
            <div className="flex flex-wrap gap-1">
              {[['STR','str'],['DEX','dex'],['CON','con'],['INT','int'],['WIS','wis'],['CHA','cha']].map(([lbl, attr]) => (
                <button key={attr} onClick={() => rollSave(lbl, attr)} className="btn-ghost text-xs px-2 py-1">{lbl}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Log */}
      {actionLog.length > 0 && (
        <div className="bg-dungeon-300/50 rounded border border-stone-800 p-2 max-h-32 overflow-y-auto">
          {actionLog.slice().reverse().map(entry => (
            <p key={entry.id} className="font-body text-xs text-stone-400 leading-5">{entry.text}</p>
          ))}
        </div>
      )}
    </div>
  )
}
