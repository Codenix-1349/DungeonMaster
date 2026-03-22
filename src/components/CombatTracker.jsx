import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useGame } from '../context/GameContext'
import { getClassWeaponDefaults } from '../data/srd'

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
  const [enemyTurnPending, setEnemyTurnPending] = useState(false)

  // State machine for player turn
  // null = not player's turn | 'selectTarget' | 'attack' | 'damage' | 'done'
  const [playerPhase, setPlayerPhase] = useState(null)
  const [selectedTargetId, setSelectedTargetId] = useState(null)
  const [pendingAttack, setPendingAttack] = useState(null)

  // Guards and accumulators
  const enemyTurnRunningRef = useRef(false)
  const turnActionsRef = useRef([])
  const initRolledRef = useRef(false)

  const addLog = useCallback((text) => {
    setActionLog(prev => [...prev.slice(-30), { id: Date.now() + Math.random(), text }])
  }, [])

  // Flush accumulated turn actions as a single summary to the AI
  const flushTurnSummary = useCallback(() => {
    if (turnActionsRef.current.length === 0) return
    const summary = turnActionsRef.current.join(' | ')
    turnActionsRef.current = []
    if (onCombatAction) onCombatAction(summary)
  }, [onCombatAction])

  // Auto-roll initiative when combat starts
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
    addLog(`Initiative: Du ${playerInit} | Gegner: ${enemies.map(e => `${e.name} ${e.initiative}`).join(', ')}`)
    addLog(playerFirst ? 'Du handelst zuerst!' : 'Gegner handeln zuerst!')
    if (!playerFirst) setTimeout(() => setEnemyTurnPending(true), 600)
  }, [character, combat, getModifier, setCombat, addLog])

  // Auto-roll initiative on combat start
  useEffect(() => {
    if (!combat?.active || combat?.phase !== 'initiative' || !character) return
    if (combat.playerInitiative > 0 || initRolledRef.current) return
    initRolledRef.current = true
    rollInitiative()
  }, [combat?.active, combat?.phase, character, combat?.playerInitiative, rollInitiative])

  // Reset init ref when combat ends
  useEffect(() => {
    if (!combat?.active) initRolledRef.current = false
  }, [combat?.active])

  // Auto-set player phase when turn changes
  useEffect(() => {
    if (!combat?.active || combat?.phase === 'initiative') {
      setPlayerPhase(null)
      return
    }
    if (combat.isPlayerTurn) {
      const living = (combat.enemies || []).filter(e => e.currentHP > 0)
      if (living.length === 0) return
      setPendingAttack(null)
      if (living.length === 1) {
        setSelectedTargetId(living[0].id)
        setPlayerPhase('attack')
      } else {
        setSelectedTargetId(null)
        setPlayerPhase('selectTarget')
      }
    } else {
      setPlayerPhase(null)
    }
  }, [combat?.isPlayerTurn, combat?.active, combat?.phase])

  // Auto-advance from 'done' phase to enemy turn
  useEffect(() => {
    if (playerPhase !== 'done') return
    const timer = setTimeout(() => {
      flushTurnSummary()
      setCombat(prev => ({ ...prev, isPlayerTurn: false }))
      setPlayerPhase(null)
      setTimeout(() => setEnemyTurnPending(true), 400)
    }, 500)
    return () => clearTimeout(timer)
  }, [playerPhase, flushTurnSummary, setCombat])

  // Enemy auto-attack with ref guard
  useEffect(() => {
    if (!enemyTurnPending || !combat?.active || combat?.isPlayerTurn) return
    if (!character) return
    if (enemyTurnRunningRef.current) return
    enemyTurnRunningRef.current = true
    setEnemyTurnPending(false)

    const livingEnemies = (combat?.enemies || []).filter(e => e.currentHP > 0)
    if (!livingEnemies.length) {
      enemyTurnRunningRef.current = false
      return
    }

    let newHP = character.currentHP ?? character.maxHP
    const logs = []
    for (const enemy of livingEnemies) {
      const attackRoll = rollDie(20)
      const atkTotal = attackRoll + (enemy.attackBonus || 3)
      const playerAC = character.armorClass || 12
      if (attackRoll === 1) {
        logs.push(`${enemy.name}: Patzer! Verfehlt.`)
      } else if (attackRoll === 20 || atkTotal >= playerAC) {
        const dmgDice = enemy.damageDice || '1d6'
        let dmg = rollDamageStr(dmgDice)
        if (attackRoll === 20) dmg += rollDamageStr(dmgDice)
        newHP = Math.max(0, newHP - dmg)
        logs.push(attackRoll === 20
          ? `${enemy.name} KRITISCH! ${dmg} Schaden`
          : `${enemy.name} trifft (${atkTotal} vs AC ${playerAC}) ${dmg} Schaden`)
      } else {
        logs.push(`${enemy.name} verfehlt (${atkTotal} vs AC ${playerAC})`)
      }
    }
    updateCharacterHP(newHP)
    logs.forEach(addLog)

    if (newHP <= 0) {
      // Player defeated — end combat, let AI narrate the defeat
      addLog('Du bist gefallen! (0 HP)')
      const summary = `[Gegner-Angriff] ${logs.join(' | ')} → Du: 0/${character.maxHP} HP — [SPIELER BESIEGT] Der Held ist gefallen.`
      if (onCombatAction) onCombatAction(summary)
      setTimeout(() => endCombat(), 800)
      enemyTurnRunningRef.current = false
      return
    }

    // Send enemy turn summary to AI
    const summary = `[Gegner-Angriff] ${logs.join(' | ')} → Du: ${newHP}/${character.maxHP} HP`
    if (onCombatAction) onCombatAction(summary)

    // Advance round and give turn back to player
    setCombat(prev => ({ ...prev, isPlayerTurn: true, round: (prev.round || 1) + 1 }))
    enemyTurnRunningRef.current = false
  }, [enemyTurnPending, combat, character, updateCharacterHP, addLog, onCombatAction, setCombat, endCombat])

  // Player attack: auto-resolve hit/miss against target AC
  const rollAttack = useCallback(() => {
    if (playerPhase !== 'attack' || !selectedTargetId) return
    const target = (combat?.enemies || []).find(e => e.id === selectedTargetId)
    if (!target || target.currentHP <= 0) return

    const roll = rollDie(20)
    const attackBonus = Number(character?.attackBonus ?? 0)
    const total = roll + attackBonus
    const isCrit = roll === 20
    const isFumble = roll === 1

    if (isFumble) {
      const msg = `Patzer! Nat. 1 gegen ${target.name} – daneben!`
      addLog(msg)
      turnActionsRef.current.push(msg)
      setPendingAttack(null)
      setPlayerPhase('done')
    } else if (isCrit || total >= target.ac) {
      const msg = isCrit
        ? `KRITISCH! Nat. 20 gegen ${target.name}!`
        : `Treffer! ${total} (d20: ${roll} + ${attackBonus}) vs AC ${target.ac} gegen ${target.name}`
      addLog(msg)
      turnActionsRef.current.push(msg)
      setPendingAttack({ roll, total, isCrit, targetId: selectedTargetId })
      setPlayerPhase('damage')
    } else {
      const msg = `Verfehlt! ${total} (d20: ${roll} + ${attackBonus}) vs AC ${target.ac} gegen ${target.name}`
      addLog(msg)
      turnActionsRef.current.push(msg)
      setPendingAttack(null)
      setPlayerPhase('done')
    }
  }, [playerPhase, selectedTargetId, combat, character, addLog])

  // Player damage: uses class weapon defaults
  const rollDamageAction = useCallback(() => {
    if (playerPhase !== 'damage' || !pendingAttack) return
    const enemies = combat?.enemies || []
    const target = enemies.find(e => e.id === pendingAttack.targetId)
    if (!target || target.currentHP <= 0) return

    const weaponInfo = getClassWeaponDefaults(character?.class)
    const abilityMod = getModifier(character?.attributes?.[weaponInfo.abilityMod] || 10)
    const diceStr = weaponInfo.damageDice
    const fullDice = `${diceStr}${abilityMod >= 0 ? `+${abilityMod}` : `${abilityMod}`}`
    let dmg = rollDamageStr(fullDice)
    if (pendingAttack.isCrit) dmg += rollDamageStr(diceStr)

    const newHP = Math.max(0, target.currentHP - dmg)
    const updatedEnemies = enemies.map(e => e.id === target.id ? { ...e, currentHP: newHP } : e)
    setCombat(prev => ({ ...prev, enemies: updatedEnemies }))

    const critLabel = pendingAttack.isCrit ? ' (KRIT!)' : ''
    const msg = newHP <= 0
      ? `${target.name} faellt! ${dmg} Schaden${critLabel} (${weaponInfo.label}, ${fullDice})`
      : `${target.name}: ${dmg} Schaden${critLabel} (${weaponInfo.label}, ${fullDice}) → ${newHP}/${target.maxHP} HP`
    addLog(msg)
    turnActionsRef.current.push(msg)

    const allDead = updatedEnemies.every(e => e.currentHP <= 0)
    if (allDead) {
      const totalXP = updatedEnemies.reduce((sum, e) => sum + (e.xp || 0), 0)
      const victoryMsg = `Alle Gegner besiegt! +${totalXP} XP`
      addLog(victoryMsg)
      turnActionsRef.current.push(victoryMsg)
      if (awardXP) awardXP(totalXP)
      flushTurnSummary()
      setTimeout(() => endCombat(), 800)
      return
    }

    setPendingAttack(null)
    setPlayerPhase('done')
  }, [playerPhase, pendingAttack, combat, character, getModifier, setCombat, addLog, awardXP, endCombat, flushTurnSummary])

  const rollSave = useCallback((label, attr) => {
    const roll = rollDie(20)
    const mod = character ? getModifier(character.attributes?.[attr] || 10) : 0
    const total = roll + mod
    addLog(`Rettungswurf ${label}: d20 ${roll} + ${mod} = ${total}`)
    if (onCombatAction) onCombatAction(`[Rettungswurf ${label}] Ergebnis: ${total}`)
  }, [character, getModifier, addLog, onCombatAction])

  const handleEndCombat = useCallback(() => {
    addLog('Kampf beendet.')
    endCombat()
    if (onCombatAction) onCombatAction('Der Kampf ist beendet.')
  }, [endCombat, addLog, onCombatAction])

  if (!combat?.active) return null

  const isInitPhase = !combat.playerInitiative || combat.playerInitiative === 0 || combat.phase === 'initiative'
  const isPlayerTurn = Boolean(combat.isPlayerTurn)
  const enemies = combat.enemies || []
  const playerHP = character?.currentHP ?? character?.maxHP ?? 0
  const playerMaxHP = character?.maxHP ?? 1
  const selectedTarget = enemies.find(e => e.id === selectedTargetId)
  const weaponInfo = getClassWeaponDefaults(character?.class)
  const abilityMod = character ? getModifier(character.attributes?.[weaponInfo.abilityMod] || 10) : 0

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

      {/* Initiative - auto-rolling indicator */}
      {isInitPhase && (
        <div className="text-center py-2">
          <p className="font-body text-xs text-stone-400 animate-pulse">Initiative wird gewuerfelt...</p>
        </div>
      )}

      {/* Enemy HP Bars (clickable for target selection) */}
      {enemies.length > 0 && (
        <div>
          <p className="section-subtitle mb-2">Gegner</p>
          {playerPhase === 'selectTarget' && (
            <div className="bg-gold-600/10 border border-gold-600/30 rounded p-2 text-xs font-body text-gold-400 text-center mb-2">
              Waehle ein Ziel fuer deinen Angriff
            </div>
          )}
          <div className="space-y-2">
            {enemies.map(enemy => {
              const isAlive = enemy.currentHP > 0
              const isSelected = selectedTargetId === enemy.id
              const canSelect = playerPhase === 'selectTarget' && isAlive
              return (
                <div
                  key={enemy.id}
                  className={`rounded transition-all duration-150 ${
                    !isAlive ? 'opacity-40' : ''
                  } ${canSelect ? 'cursor-pointer hover:bg-gold-600/10 border border-transparent hover:border-gold-600/30 p-1 -m-1' : ''
                  } ${isSelected && isAlive ? 'border border-gold-500/50 bg-gold-600/10 p-1 -m-1' : ''}`}
                  onClick={() => {
                    if (!canSelect) return
                    setSelectedTargetId(enemy.id)
                    setPlayerPhase('attack')
                  }}
                >
                  <HpBar current={enemy.currentHP} max={enemy.maxHP}
                    label={`${isSelected && isAlive ? '>> ' : ''}${!isAlive ? `${enemy.name} (tot)` : enemy.name}`} small />
                  <p className="font-body text-xs text-stone-600">AC {enemy.ac} · ATK +{enemy.attackBonus} · {enemy.damageDice} · {enemy.xp} XP</p>
                </div>
              )
            })}
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

      {/* Combat Actions - Phase-dependent */}
      {!isInitPhase && (
        <div className="space-y-2">
          {/* Enemy turn indicator */}
          {!isPlayerTurn && (
            <div className="bg-red-900/20 border border-red-700/30 rounded p-2 text-xs font-body text-red-400 text-center animate-pulse">
              Gegner sind am Zug – warte...
            </div>
          )}

          {/* Attack phase */}
          {playerPhase === 'attack' && selectedTarget && (
            <button onClick={rollAttack} className="btn-primary w-full text-sm">
              ⚔️ Angriff auf {selectedTarget.name} (d20 {character?.attackBonus >= 0 ? '+' : ''}{character?.attackBonus} vs AC {selectedTarget.ac})
            </button>
          )}

          {/* Damage phase */}
          {playerPhase === 'damage' && (
            <div className="space-y-2">
              <div className="bg-gold-600/10 border border-gold-600/30 rounded p-2 text-xs font-body text-gold-400 text-center">
                {pendingAttack?.isCrit ? 'KRITISCHER TREFFER! Doppelter Schaden!' : 'Treffer! Wuerfle Schaden:'}
              </div>
              <button onClick={rollDamageAction} className="btn-primary w-full text-sm">
                💥 Schaden ({weaponInfo.label}: {weaponInfo.damageDice}{abilityMod >= 0 ? `+${abilityMod}` : abilityMod}){pendingAttack?.isCrit ? ' KRIT!' : ''}
              </button>
            </div>
          )}

          {/* Done phase - auto-advancing */}
          {playerPhase === 'done' && (
            <div className="text-center text-xs font-body text-stone-400 animate-pulse py-1">
              Zug wird beendet...
            </div>
          )}

          {/* Saving throws - always available during player turn */}
          {isPlayerTurn && (
            <div>
              <p className="section-subtitle mb-1">Rettungswuerfe</p>
              <div className="flex flex-wrap gap-1">
                {[['STR','str'],['DEX','dex'],['CON','con'],['INT','int'],['WIS','wis'],['CHA','cha']].map(([lbl, attr]) => (
                  <button key={attr} onClick={() => rollSave(lbl, attr)} className="btn-ghost text-xs px-2 py-1">{lbl}</button>
                ))}
              </div>
            </div>
          )}
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
