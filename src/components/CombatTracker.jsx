import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useGame } from '../context/GameContext'
import { getClassWeaponDefaults, SPELL_LIST } from '../data/srd'
import { resolveSpellInCombat, resolveHealingPotion, rollDice } from '../data/spellEffects'
import {
  applySpellcastToTurnState,
  canCastSpellInCombatTurn,
  consumeCombatTurnState,
  createCombatTurnState,
  getRoundForNextTurn,
  getSpellActionType,
  startPlayerCombatTurn,
} from '../data/combatState.js'
import { generateGoldReward, generateItemLoot, ITEM_CATALOG } from '../data/items'
import D20Animation, { preloadAllD20SpriteSheets } from './D20Animation'
const DAMAGE_RESULT_BANNER_MS = 4200

// ─── Dice Helpers ─────────────────────────────────────────────────────────────

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

function formatSignedBonus(value = 0) {
  return `${value >= 0 ? '+' : ''}${value}`
}

// Estimate enemy save modifier from XP (rough CR approximation)
function estimateSaveMod(enemy) {
  const xp = enemy.xp || 0
  if (xp <= 25) return 0
  if (xp <= 100) return 1
  if (xp <= 200) return 2
  if (xp <= 450) return 3
  if (xp <= 1100) return 4
  return 5
}

// ─── Log entry type styles ───────────────────────────────────────────────────

const LOG_STYLES = {
  hit:     { icon: '⚔️', color: 'text-gold-400',    bg: 'bg-gold-600/10 border-gold-600/30' },
  crit:    { icon: '💥', color: 'text-amber-300',    bg: 'bg-amber-600/15 border-amber-500/40' },
  miss:    { icon: '💨', color: 'text-stone-500',    bg: 'bg-stone-800/30 border-stone-700/30' },
  spell:   { icon: '✨', color: 'text-blue-400',     bg: 'bg-blue-900/20 border-blue-700/30' },
  heal:    { icon: '💚', color: 'text-emerald-400',  bg: 'bg-emerald-900/20 border-emerald-700/30' },
  enemy:   { icon: '💀', color: 'text-red-400',      bg: 'bg-red-900/20 border-red-700/30' },
  dodge:   { icon: '🛡️', color: 'text-blue-300',     bg: 'bg-blue-900/15 border-blue-700/25' },
  item:    { icon: '🧪', color: 'text-emerald-400',  bg: 'bg-emerald-900/15 border-emerald-700/25' },
  kill:    { icon: '☠️', color: 'text-gold-300',     bg: 'bg-gold-600/15 border-gold-500/40' },
  victory: { icon: '🏆', color: 'text-gold-400',     bg: 'bg-gold-600/20 border-gold-500/50' },
  defeat:  { icon: '⚰️', color: 'text-red-500',      bg: 'bg-red-900/25 border-red-600/40' },
  info:    { icon: '📜', color: 'text-stone-400',    bg: '' },
  free:    { icon: '💬', color: 'text-purple-400',   bg: 'bg-purple-900/15 border-purple-700/25' },
}

function LogEntry({ entry }) {
  const style = LOG_STYLES[entry.type] || LOG_STYLES.info
  const hasBg = Boolean(style.bg)
  return (
    <div className={`flex items-start gap-1.5 text-xs leading-5 ${
      hasBg ? `rounded px-2 py-1 border ${style.bg}` : 'px-1'
    }`}>
      <span className="flex-shrink-0 w-4 text-center">{style.icon}</span>
      <span className={`font-body ${style.color}`}>{entry.text}</span>
    </div>
  )
}

// ─── Result Banner (shown briefly after an action) ───────────────────────────

function ResultBanner({ result }) {
  if (!result) return null
  const style = LOG_STYLES[result.type] || LOG_STYLES.info
  return (
    <div className={`rounded-lg border-2 p-3 text-center animate-slide-in ${style.bg}`}>
      {result.d20Roll ? (
        <div className="flex justify-center mb-1">
          <D20Animation
            key={`combat-roll-${result.animationRunId || 0}`}
            result={result.d20Roll}
            runId={result.animationRunId || 0}
            size={220}
            holdTime={result.holdTime ?? 2000}
            onComplete={result.onComplete}
          />
        </div>
      ) : (
        <div className="text-2xl mb-1">{style.icon}</div>
      )}
      <p className={`font-heading text-sm ${style.color}`}>{result.title}</p>
      {result.detail && (
        <p className="font-body text-xs text-stone-400 mt-0.5">{result.detail}</p>
      )}
    </div>
  )
}

// ─── UI Sub-Components ────────────────────────────────────────────────────────

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

function SpellSlotDisplay({ spellSlots, currentSpellSlots }) {
  const levels = Object.keys(spellSlots || {}).filter(k => spellSlots[k] > 0).sort((a, b) => a - b)
  if (!levels.length) return null
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {levels.map(lvl => {
        const max = spellSlots[lvl]
        const cur = currentSpellSlots?.[lvl] ?? max
        return (
          <span key={lvl} className={`font-heading ${cur > 0 ? 'text-blue-400' : 'text-stone-600'}`}>
            Grad {lvl}: {cur}/{max}
          </span>
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CombatTracker({ onCombatAction }) {
  const {
    character, combat, setCombat, endCombat, updateCharacterHP,
    getModifier, awardXP, consumeSpellSlot, restoreSpellSlots, useItem,
    addItem, updateCurrency,
  } = useGame()

  const [actionLog, setActionLog] = useState([])
  const [resultBanner, setResultBanner] = useState(null)
  const bannerTimerRef = useRef(null)
  const bannerAnimationRunIdRef = useRef(0)
  const combatPlayerBuffs = combat?.playerBuffs || null
  const playerAttackBonusBuff = Number(combatPlayerBuffs?.attackBonus || 0)
  const playerArmorClassBuff = Number(combatPlayerBuffs?.armorClassBonus || 0)
  const playerInitiativeBuff = Number(combatPlayerBuffs?.initiativeBonus || 0)
  const playerDamageBuff = Number(combatPlayerBuffs?.damageBonus || 0)
  const playerSpellAttackBuff = Number(combatPlayerBuffs?.spellAttackBonus || 0)
  const playerSpellSaveDcBuff = Number(combatPlayerBuffs?.spellSaveDcBonus || 0)

  // State machine for player turn
  // null | 'selectAction' | 'selectTarget' | 'attack' | 'damage' |
  // 'selectSpell' | 'selectSpellSlot' | 'selectSpellTarget' |
  // 'selectItem' | 'freeAction' | 'done'
  const [playerPhase, setPlayerPhase] = useState(null)
  const [selectedTargetId, setSelectedTargetId] = useState(null)
  const [pendingAttack, setPendingAttack] = useState(null)
  const [selectedSpell, setSelectedSpell] = useState(null)
  const [selectedCastLevel, setSelectedCastLevel] = useState(null)
  const [freeActionText, setFreeActionText] = useState('')
  const [initiativeRolling, setInitiativeRolling] = useState(false)

  // Guards and accumulators
  const enemyTurnRunningRef = useRef(false)
  const turnActionsRef = useRef([])

  const addLog = useCallback((text, type = 'info') => {
    setActionLog(prev => [...prev.slice(-40), { id: Date.now() + Math.random(), text, type }])
  }, [])

  const showBanner = useCallback((title, detail, type = 'hit', opts = {}) => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
    setResultBanner({
      title,
      detail,
      type,
      ...opts,
      animationRunId: ++bannerAnimationRunIdRef.current,
    })
    bannerTimerRef.current = setTimeout(
      () => setResultBanner(null),
      opts.autoHideMs ?? (opts.d20Roll ? 4500 : 2500)
    )
  }, [])

  const flushTurnSummary = useCallback(() => {
    if (turnActionsRef.current.length === 0) return
    const summary = turnActionsRef.current.join(' | ')
    turnActionsRef.current = []
    if (onCombatAction) onCombatAction(summary)
  }, [onCombatAction])

  // ── Available spells for this character ──────────────────────────────────

  const availableSpells = useMemo(() => {
    if (!character) return []
    const knownCantrips = character.knownCantrips || []
    const knownSpells = character.knownSpells || []
    const allKnown = [...knownCantrips, ...knownSpells]
    if (!allKnown.length) return []

    const currentSlots = character.currentSpellSlots || character.spellSlots || {}

    return SPELL_LIST
      .filter(s => allKnown.includes(s.key))
      .filter(s => {
        // Cantrips always available
        if (s.level === 0) return true
        // Check if any slot of this level or higher is available
        for (let lvl = s.level; lvl <= 9; lvl++) {
          if ((currentSlots[lvl] || 0) > 0) return true
        }
        return false
      })
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
  }, [character])

  const combatSpellOptions = useMemo(() => {
    return availableSpells
      .map(spell => ({ ...spell, actionType: getSpellActionType(spell) }))
      .filter(spell => spell.actionType !== 'reaction')
  }, [availableSpells])

  const currentTurnState = useMemo(() => {
    return createCombatTurnState(combat?.turnState)
  }, [combat?.turnState])

  const castableSpellOptions = useMemo(() => {
    return combatSpellOptions.filter(spell => (
      canCastSpellInCombatTurn({
        turnState: currentTurnState,
        spellLevel: spell.level,
        actionType: spell.actionType,
      })
    ))
  }, [combatSpellOptions, currentTurnState])

  // ── Available items for combat use ──────────────────────────────────────

  const usableItems = useMemo(() => {
    if (!character?.inventory) return []
    return character.inventory.filter(item => {
      if (typeof item === 'object') {
        return item.type === 'consumable' || /heiltrank|trank|potion/i.test(item.name || '')
      }
      return /heiltrank|trank|potion/i.test(item)
    })
  }, [character?.inventory])

  const resetTurnSelectionState = useCallback(() => {
    setPendingAttack(null)
    setSelectedTargetId(null)
    setSelectedSpell(null)
    setSelectedCastLevel(null)
    setFreeActionText('')
  }, [])

  const persistTurnState = useCallback((nextTurnState) => {
    setCombat(prev => {
      if (!prev?.active) return prev
      return { ...prev, turnState: createCombatTurnState(nextTurnState) }
    })
  }, [setCombat])

  const hasBonusActionSpellOption = useCallback((nextTurnState) => {
    return combatSpellOptions.some(spell => (
      spell.actionType === 'bonusAction' &&
      canCastSpellInCombatTurn({
        turnState: nextTurnState,
        spellLevel: spell.level,
        actionType: spell.actionType,
      })
    ))
  }, [combatSpellOptions])

  const hasRemainingTurnChoices = useCallback((nextTurnState) => {
    const normalized = createCombatTurnState(nextTurnState)
    if (normalized.actionAvailable) return true
    return hasBonusActionSpellOption(normalized)
  }, [hasBonusActionSpellOption])

  // ── Initiative ──────────────────────────────────────────────────────────

  const finalizeInitiativeRoll = useCallback(({ playerInit, playerFirst, enemies }) => {
    setCombat(prev => {
      if (!prev?.active) return prev
      return {
        ...prev,
        playerInitiative: playerInit,
        playerActsFirst: playerFirst,
        enemies,
        phase: 'ready',
        isPlayerTurn: false,
        round: 1,
      }
    })
    addLog(`Initiative: Du ${playerInit} | Gegner: ${enemies.map(e => `${e.name} ${e.initiative}`).join(', ')}`, 'info')
    addLog(playerFirst ? 'Du handelst zuerst!' : 'Gegner handeln zuerst!', 'info')
    setInitiativeRolling(false)
  }, [setCombat, addLog])

  const rollInitiative = useCallback(() => {
    if (!combat?.active || initiativeRolling) return
    setInitiativeRolling(true)
    const roll = rollDie(20)
    const dexMod = character ? getModifier(character.attributes?.dex || 10) : 0
    const playerInit = roll + dexMod + playerInitiativeBuff
    const enemies = (combat?.enemies || []).map(e => ({
      ...e,
      initiative: rollDie(20) + (e.initiativeBonus || 0),
    }))
    const enemyMaxInit = enemies.length ? Math.max(...enemies.map(e => e.initiative)) : 0
    const playerFirst = playerInit >= enemyMaxInit
    const resolution = { playerInit, playerFirst, enemies }
    showBanner(
      'Initiativewurf',
      'Die Zugreihenfolge wird ermittelt ...',
      playerFirst ? 'hit' : 'enemy',
      {
        d20Roll: roll,
        holdTime: 200,
        autoHideMs: 1600,
        onComplete: () => {
          finalizeInitiativeRoll(resolution)
          setResultBanner(null)
        },
      },
    )
  }, [character, combat, getModifier, initiativeRolling, playerInitiativeBuff, showBanner, finalizeInitiativeRoll])

  const confirmReadyAndStartRound = useCallback(() => {
    const playerFirst = Boolean(combat?.playerActsFirst)
    setCombat(prev => {
      if (!prev?.active) return prev
      const next = {
        ...prev,
        phase: 'action',
        isPlayerTurn: playerFirst,
      }
      return playerFirst ? startPlayerCombatTurn(next) : next
    })
    if (!playerFirst) {
      setTimeout(() => {
        if (runEnemyTurnRef.current) runEnemyTurnRef.current()
      }, 600)
    }
  }, [combat?.playerActsFirst, setCombat])

  useEffect(() => {
    if (!combat?.active || combat.phase !== 'initiative') {
      setInitiativeRolling(false)
    }
  }, [combat?.active, combat?.phase])

  useEffect(() => {
    if (!combat?.active || combat.phase !== 'initiative') return
    preloadAllD20SpriteSheets().catch(() => {})
  }, [combat?.active, combat?.phase])

  // ── Round-change banner ────────────────────────────────────────────────
  const lastRoundRef = useRef(0)
  useEffect(() => {
    if (!combat?.active || combat?.phase !== 'action') {
      lastRoundRef.current = 0
      return
    }
    const currentRound = combat.round || 1
    if (currentRound > 1 && currentRound !== lastRoundRef.current) {
      showBanner(`Runde ${currentRound}`, 'Neue Runde beginnt', 'info')
    }
    lastRoundRef.current = currentRound
  }, [combat?.round, combat?.active, combat?.phase, showBanner])

  // ── Turn management ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!combat?.active || combat?.phase === 'initiative' || combat?.phase === 'ready') {
      setPlayerPhase(null)
      return
    }
    if (combat.isPlayerTurn) {
      resetTurnSelectionState()
      setPlayerPhase('selectAction')
    } else {
      setPlayerPhase(null)
    }
  }, [combat?.isPlayerTurn, combat?.active, combat?.phase, resetTurnSelectionState])

  // ── Run enemy turn immediately, then send combined round summary to AI ──

  const runEnemyTurnAndFlush = useCallback(() => {
    if (!character || !combat?.active) {
      flushTurnSummary()
      return
    }

    const turnState = createCombatTurnState(combat?.turnState)
    const livingEnemies = (combat?.enemies || []).filter(e => e.currentHP > 0)
    if (!livingEnemies.length) {
      // All dead — just flush player actions (victory was already handled)
      flushTurnSummary()
      return
    }

    let newHP = character.currentHP ?? character.maxHP
    const logs = []
    for (const enemy of livingEnemies) {
      let attackRoll = rollDie(20)

      // Dodge: roll twice, take lower
      if (turnState.dodgeActive) {
        const secondRoll = rollDie(20)
        attackRoll = Math.min(attackRoll, secondRoll)
      }

      const atkTotal = attackRoll + (enemy.attackBonus || 3)
      const playerAC = (character.armorClass || 12) + playerArmorClassBuff
      if (attackRoll === 1) {
        logs.push(`${enemy.name}: Patzer! Verfehlt.`)
      } else if (attackRoll === 20 || atkTotal >= playerAC) {
        const dmgDice = enemy.damageDice || '1d6'
        let dmg = rollDamageStr(dmgDice)
        if (attackRoll === 20) dmg += rollDamageStr(dmgDice)
        if (enemy.maxDamagePerHit > 0) {
          dmg = Math.min(dmg, enemy.maxDamagePerHit)
        }
        newHP = Math.max(0, newHP - dmg)
        logs.push({ text: attackRoll === 20
          ? `${enemy.name} KRITISCH! ${dmg} Schaden`
          : `${enemy.name} trifft (${atkTotal} vs AC ${playerAC}) ${dmg} Schaden`, type: 'enemy' })
      } else {
        logs.push({ text: `${enemy.name} verfehlt (${atkTotal} vs AC ${playerAC})${turnState.dodgeActive ? ' [Ausweichen]' : ''}`, type: 'miss' })
      }
    }

    updateCharacterHP(newHP)
    logs.forEach(l => addLog(l.text, l.type))

    // Append enemy actions to the same turn summary
    turnActionsRef.current.push(`[Gegner-Angriff] ${logs.map(l => l.text).join(' | ')} → Du: ${newHP}/${character.maxHP} HP`)

    if (newHP <= 0) {
      const reviver = (combat?.enemies || []).find(e => e.revivePlayerOnDefeat)
      if (reviver) {
        const revivalText = String(reviver.defeatRevivalText || '').trim()
          || 'Der Arenameister hebt die Hand und warmes Licht füllt dich — du stehst wieder voll aufrecht.\n\nArenameister:\n„Noch einmal, wenn du willst."'
        addLog('Du bist gefallen – die Arena belebt dich wieder!', 'defeat')
        updateCharacterHP(character.maxHP)
        turnActionsRef.current.push(`[SPIELER WIEDERBELEBT] ${revivalText}`)
        flushTurnSummary()
        setTimeout(() => endCombat(), 800)
        return
      }
      addLog('Du bist gefallen! (0 HP)', 'defeat')
      turnActionsRef.current.push('[SPIELER BESIEGT] Der Held ist gefallen.')
      flushTurnSummary()
      setTimeout(() => endCombat(), 800)
      return
    }

    // Send the combined round summary (player action + enemy action) to AI
    flushTurnSummary()

    // Next round — give turn back to player and show action buttons directly
    // (cannot rely on useEffect for isPlayerTurn since it may already be true)
    setCombat(prev => {
      if (!prev?.active) return prev
      return startPlayerCombatTurn({
        ...prev,
        round: getRoundForNextTurn(prev, 'player'),
      })
    })
    resetTurnSelectionState()
    setPlayerPhase('selectAction')
  }, [character, combat, updateCharacterHP, addLog, flushTurnSummary, setCombat, endCombat, playerArmorClassBuff, resetTurnSelectionState])

  // Ref to always access latest runEnemyTurnAndFlush (avoids stale closures in setTimeout)
  const runEnemyTurnRef = useRef(runEnemyTurnAndFlush)
  useEffect(() => { runEnemyTurnRef.current = runEnemyTurnAndFlush }, [runEnemyTurnAndFlush])

  const finishPlayerTurn = useCallback((nextTurnState = combat?.turnState) => {
    setPlayerPhase('done')
    setCombat(prev => {
      if (!prev?.active) return prev
      return {
        ...prev,
        isPlayerTurn: false,
        round: getRoundForNextTurn(prev, 'enemy'),
        turnState: createCombatTurnState(nextTurnState),
      }
    })
    setTimeout(() => {
      if (runEnemyTurnRef.current) runEnemyTurnRef.current()
    }, 600)
  }, [combat?.turnState, setCombat])

  const endTurnEarly = useCallback(() => {
    const nextTurnState = createCombatTurnState(combat?.turnState)
    addLog('Du beendest deinen Zug.', 'info')
    turnActionsRef.current.push('[Zug beendet] Keine weitere Aktion.')
    finishPlayerTurn(nextTurnState)
  }, [combat?.turnState, addLog, finishPlayerTurn])

  const continuePlayerTurn = useCallback((nextTurnState) => {
    persistTurnState(nextTurnState)
    resetTurnSelectionState()
    setPlayerPhase('selectAction')
  }, [persistTurnState, resetTurnSelectionState])

  const advanceAfterActionResolution = useCallback((nextTurnState) => {
    if (hasRemainingTurnChoices(nextTurnState)) {
      continuePlayerTurn(nextTurnState)
      return
    }

    finishPlayerTurn(nextTurnState)
  }, [continuePlayerTurn, finishPlayerTurn, hasRemainingTurnChoices])

  // ── Action: Physical Attack ─────────────────────────────────────────────

  const startAttack = useCallback(() => {
    if (!createCombatTurnState(combat?.turnState).actionAvailable) return
    const living = (combat?.enemies || []).filter(e => e.currentHP > 0)
    if (living.length === 1) {
      setSelectedTargetId(living[0].id)
      setPlayerPhase('attack')
    } else {
      setSelectedTargetId(null)
      setPlayerPhase('selectTarget')
    }
  }, [combat])

  const rollAttack = useCallback(() => {
    if (playerPhase !== 'attack' || !selectedTargetId) return
    const target = (combat?.enemies || []).find(e => e.id === selectedTargetId)
    if (!target || target.currentHP <= 0) return

    const nextTurnState = consumeCombatTurnState(combat?.turnState, { action: true })
    const roll = rollDie(20)
    const attackBonus = Number(character?.attackBonus ?? 0) + playerAttackBonusBuff
    const total = roll + attackBonus
    const isCrit = roll === 20
    const isFumble = roll === 1

    if (isFumble) {
      const msg = `Patzer! Nat. 1 gegen ${target.name} — daneben!`
      addLog(msg, 'miss')
      showBanner('Patzer!', `Nat. 1 gegen ${target.name}`, 'miss', { d20Roll: roll })
      turnActionsRef.current.push(msg)
      setPendingAttack(null)
      advanceAfterActionResolution(nextTurnState)
    } else if (isCrit || total >= target.ac) {
      const msg = isCrit
        ? `KRITISCH! Nat. 20 gegen ${target.name}!`
        : `Treffer! ${total} (d20: ${roll} + ${attackBonus}) vs AC ${target.ac}`
      addLog(msg, isCrit ? 'crit' : 'hit')
      showBanner(isCrit ? 'KRITISCH!' : 'Treffer!', `${roll} + ${attackBonus} = ${total} vs AC ${target.ac}`, isCrit ? 'crit' : 'hit', { d20Roll: roll })
      turnActionsRef.current.push(msg)
      persistTurnState(nextTurnState)
      setPendingAttack({ roll, total, isCrit, targetId: selectedTargetId })
      setPlayerPhase('damage')
    } else {
      const msg = `Verfehlt! ${total} (d20: ${roll} + ${attackBonus}) vs AC ${target.ac}`
      addLog(msg, 'miss')
      showBanner('Verfehlt!', `${roll} + ${attackBonus} = ${total} vs AC ${target.ac}`, 'miss', { d20Roll: roll })
      turnActionsRef.current.push(msg)
      setPendingAttack(null)
      advanceAfterActionResolution(nextTurnState)
    }
  }, [playerPhase, selectedTargetId, combat, character, addLog, playerAttackBonusBuff, persistTurnState, advanceAfterActionResolution])

  const checkAllDead = useCallback((updatedEnemies, nextTurnState = combat?.turnState) => {
    const allDead = updatedEnemies.every(e => e.currentHP <= 0)
    if (allDead) {
      const totalXP = updatedEnemies.reduce((sum, e) => sum + (e.xp || 0), 0)
      const playerLevel = character?.level || 1
      const restoreAfterVictory = updatedEnemies.some(e => e.restorePlayerAfterVictory)

      // Engine is sole authority for combat rewards (XP, gold, loot)
      if (awardXP) awardXP(totalXP)
      const goldReward = generateGoldReward(totalXP)
      if (Object.keys(goldReward).length > 0 && updateCurrency) updateCurrency(goldReward)
      const itemLoot = generateItemLoot(totalXP, playerLevel)
      for (const itemKey of itemLoot) {
        if (addItem) addItem(itemKey)
      }
      if (restoreAfterVictory && character?.maxHP) {
        updateCharacterHP(character.maxHP)
        if (restoreSpellSlots) restoreSpellSlots()
        addLog('Rennald richtet dich nach dem Sieg wieder her.', 'heal')
      }

      // Build reward summary
      const rewardParts = [`+${totalXP} XP`]
      if (goldReward.gm) rewardParts.push(`+${goldReward.gm} GM`)
      if (goldReward.sm) rewardParts.push(`+${goldReward.sm} SM`)
      if (itemLoot.length) rewardParts.push(itemLoot.map(k => ITEM_CATALOG[k]?.name || k).join(', '))
      if (restoreAfterVictory) rewardParts.push('volle Heilung')

      const victoryMsg = `Alle Gegner besiegt! ${rewardParts.join(' · ')}`
      const victoryRecoveryText = String(
        updatedEnemies.find(enemy => enemy.victoryRecoveryText)?.victoryRecoveryText || ''
      ).trim()
      addLog(victoryMsg, 'victory')
      showBanner('SIEG!', rewardParts.join(' · '), 'victory')
      turnActionsRef.current.push(victoryMsg)
      if (victoryRecoveryText) {
        turnActionsRef.current.push(`[SPIELER NACH KAMPF GEHEILT] ${victoryRecoveryText}`)
      }
      flushTurnSummary()
      setTimeout(() => endCombat(), 800)
    } else {
      advanceAfterActionResolution(nextTurnState)
    }
  }, [combat?.turnState, addLog, awardXP, endCombat, flushTurnSummary, advanceAfterActionResolution, character, updateCurrency, addItem, updateCharacterHP, restoreSpellSlots])

  const rollDamageAction = useCallback(() => {
    if (playerPhase !== 'damage' || !pendingAttack) return
    const enemies = combat?.enemies || []
    const target = enemies.find(e => e.id === pendingAttack.targetId)
    if (!target || target.currentHP <= 0) return

    const nextTurnState = createCombatTurnState(combat?.turnState)
    const equippedWeapon = character?.inventory?.find(i => typeof i === 'object' && i.type === 'weapon' && i.equipped)
    const weaponInfo = equippedWeapon
      ? { damageDice: equippedWeapon.properties?.damageDice || '1d6', abilityMod: equippedWeapon.properties?.abilityMod || 'str', label: equippedWeapon.name }
      : getClassWeaponDefaults(character?.class)
    const abilityMod = getModifier(character?.attributes?.[weaponInfo.abilityMod] || 10)
    const totalDamageBonus = abilityMod + playerDamageBuff
    const diceStr = weaponInfo.damageDice
    const fullDice = `${diceStr}${totalDamageBonus >= 0 ? `+${totalDamageBonus}` : `${totalDamageBonus}`}`
    let dmg = rollDamageStr(fullDice)
    if (pendingAttack.isCrit) dmg += rollDamageStr(diceStr)

    const newHP = Math.max(0, target.currentHP - dmg)
    const updatedEnemies = enemies.map(e => e.id === target.id ? { ...e, currentHP: newHP } : e)
    setCombat(prev => ({ ...prev, enemies: updatedEnemies }))

    const critLabel = pendingAttack.isCrit ? ' (KRIT!)' : ''
    const killed = newHP <= 0
    const msg = killed
      ? `${target.name} faellt! ${dmg} Schaden${critLabel} (${weaponInfo.label}, ${fullDice})`
      : `${target.name}: ${dmg} Schaden${critLabel} (${weaponInfo.label}, ${fullDice}) → ${newHP}/${target.maxHP} HP`
    addLog(msg, killed ? 'kill' : 'hit')
    showBanner(
      killed ? `${target.name} besiegt!` : `${dmg} Schaden!`,
      `${weaponInfo.label}: ${fullDice}${critLabel}${killed ? '' : ` → ${newHP}/${target.maxHP} HP`}`,
      killed ? 'kill' : (pendingAttack.isCrit ? 'crit' : 'hit'),
      { autoHideMs: DAMAGE_RESULT_BANNER_MS }
    )
    turnActionsRef.current.push(msg)

    checkAllDead(updatedEnemies, nextTurnState)
  }, [playerPhase, pendingAttack, combat, character, getModifier, setCombat, addLog, playerDamageBuff, showBanner, checkAllDead])

  // ── Action: Cast Spell ──────────────────────────────────────────────────

  const startSpellCast = useCallback(() => {
    if (!castableSpellOptions.length) return
    setSelectedSpell(null)
    setSelectedCastLevel(null)
    setPlayerPhase('selectSpell')
  }, [castableSpellOptions.length])

  // Use ref to avoid stale closure in pickSpell/pickSpellSlot
  const resolveSpellRef = useRef(null)

  resolveSpellRef.current = (spell, castLevel) => {
    if (!spell || !character) return

    const actionType = spell.actionType || getSpellActionType(spell)
    if (!canCastSpellInCombatTurn({ turnState: combat?.turnState, spellLevel: castLevel, actionType })) {
      addLog(`${spell.name} kann in diesem Zug nicht mehr gewirkt werden.`, 'info')
      return
    }
    const nextTurnState = applySpellcastToTurnState(combat?.turnState, {
      spellLevel: castLevel,
      actionType,
    })

    const spellcastingAttr =
      character.class === 'Kleriker' || character.class === 'Druide' || character.class === 'Waldläufer' ? 'wis' :
      character.class === 'Zauberer' ? 'int' : 'cha'

    const target = getFirstLivingEnemy()
    const effect = resolveSpellInCombat({
      spellKey: spell.key,
      spellName: spell.name,
      spellLevel: spell.level,
      castLevel,
      casterLevel: character.level || 1,
      spellAttackBonus: (character.spellAttackBonus || 0) + playerSpellAttackBuff,
      spellSaveDC: (character.spellSaveDC || 10) + playerSpellSaveDcBuff,
      abilityMod: getModifier(character.attributes?.[spellcastingAttr] || 10),
      targetAC: target?.ac ?? 10,
      targetName: target?.name || 'Ziel',
    })

    // Consume spell slot (not for cantrips)
    if (castLevel > 0) {
      consumeSpellSlot(castLevel)
    }

    // Apply damage to first living enemy (with save resolution for save-based spells)
    if (effect.damage > 0 && target) {
      let finalDamage = effect.damage
      let saveText = ''

      // Resolve saving throw mechanically if required
      if (effect.saveRequired) {
        const saveMod = estimateSaveMod(target)
        const saveRoll = rollDie(20)
        const saveTotal = saveRoll + saveMod
        const saved = saveTotal >= effect.saveRequired.dc

        if (saved && effect.saveRequired.halfOnSuccess) {
          finalDamage = Math.max(1, Math.floor(effect.fullDamage / 2))
          saveText = ` ${target.name} RW ${saveTotal} (${saveRoll}+${saveMod}) vs SG ${effect.saveRequired.dc} — geschafft, halber Schaden!`
        } else if (saved) {
          finalDamage = 0
          saveText = ` ${target.name} RW ${saveTotal} (${saveRoll}+${saveMod}) vs SG ${effect.saveRequired.dc} — geschafft, kein Schaden!`
        } else {
          saveText = ` ${target.name} RW ${saveTotal} (${saveRoll}+${saveMod}) vs SG ${effect.saveRequired.dc} — fehlgeschlagen, voller Schaden!`
        }
      }

      const enemies = combat?.enemies || []
      const newHP = Math.max(0, target.currentHP - finalDamage)
      const updatedEnemies = enemies.map(e => e.id === target.id ? { ...e, currentHP: newHP } : e)
      setCombat(prev => ({ ...prev, enemies: updatedEnemies }))

      const killed = newHP <= 0
      const fullText = `${effect.resultText}${saveText}${killed ? ` ${target.name} faellt!` : ''}`

      addLog(fullText, killed ? 'kill' : (effect.success ? 'spell' : 'miss'))
      showBanner(
        killed ? `${target.name} besiegt!` : (effect.success ? `${finalDamage} Schaden!` : 'Verfehlt!'),
        `${spell.name}${saveText ? ' (RW)' : ''}${killed ? '' : ` → ${newHP}/${target.maxHP} HP`}`,
        killed ? 'kill' : (effect.success ? 'spell' : 'miss')
      )
      turnActionsRef.current.push(`[Zauber] ${fullText}`)
      checkAllDead(updatedEnemies, nextTurnState)
      return
    }

    // Apply healing to self
    if (effect.healing > 0) {
      const newHP = Math.min((character.currentHP || 0) + effect.healing, character.maxHP)
      updateCharacterHP(newHP)
      addLog(effect.resultText, 'heal')
      showBanner(`+${effect.healing} HP!`, `${spell.name} → ${newHP}/${character.maxHP} HP`, 'heal')
      turnActionsRef.current.push(`[Zauber] ${effect.resultText}`)
      advanceAfterActionResolution(nextTurnState)
      return
    }

    addLog(effect.resultText, 'spell')
    showBanner(spell.name, effect.resultText, 'spell')
    turnActionsRef.current.push(`[Zauber] ${effect.resultText}`)
    advanceAfterActionResolution(nextTurnState)
  }

  const pickSpell = useCallback((spell) => {
    setSelectedSpell(spell)
    if (spell.level === 0) {
      setSelectedCastLevel(0)
      resolveSpellRef.current(spell, 0)
    } else {
      setPlayerPhase('selectSpellSlot')
    }
  }, [])

  const pickSpellSlot = useCallback((slotLevel) => {
    if (!selectedSpell) return
    setSelectedCastLevel(slotLevel)
    resolveSpellRef.current(selectedSpell, slotLevel)
  }, [selectedSpell])

  // ── Action: Use Item ────────────────────────────────────────────────────

  const startUseItem = useCallback(() => {
    if (!createCombatTurnState(combat?.turnState).actionAvailable) return
    setPlayerPhase('selectItem')
  }, [combat?.turnState])

  const pickItem = useCallback((item) => {
    if (!character) return
    if (!createCombatTurnState(combat?.turnState).actionAvailable) return
    const nextTurnState = consumeCombatTurnState(combat?.turnState, { action: true })
    const itemName = typeof item === 'object' ? item.name : item
    const itemId = typeof item === 'object' ? item.id : item
    const isPotion = typeof item === 'object'
      ? (item.properties?.effect === 'heal' || /heiltrank|trank|potion/i.test(itemName))
      : /heiltrank|trank|potion/i.test(itemName)

    if (isPotion) {
      const result = resolveHealingPotion(typeof item === 'object' ? item : undefined)
      const newHP = Math.min((character.currentHP || 0) + result.healing, character.maxHP)
      updateCharacterHP(newHP)
      useItem(itemId)
      addLog(result.resultText, 'heal')
      showBanner(`+${result.healing} HP!`, `${itemName} → ${newHP}/${character.maxHP} HP`, 'heal')
      turnActionsRef.current.push(`[Gegenstand] ${result.resultText}`)
    } else {
      addLog(`${itemName} eingesetzt.`, 'item')
      showBanner(itemName, 'Gegenstand eingesetzt', 'item')
      turnActionsRef.current.push(`[Gegenstand] ${itemName} benutzt`)
      useItem(itemId)
    }

    advanceAfterActionResolution(nextTurnState)
  }, [character, combat?.turnState, updateCharacterHP, useItem, addLog, advanceAfterActionResolution])

  // ── Action: Dodge ───────────────────────────────────────────────────────

  const doDodge = useCallback(() => {
    if (!createCombatTurnState(combat?.turnState).actionAvailable) return
    const nextTurnState = consumeCombatTurnState(combat?.turnState, {
      action: true,
      dodgeActive: true,
    })
    addLog('Ausweichen! Gegner haben Nachteil auf Angriffe.', 'dodge')
    showBanner('Ausweichen!', 'Nachteil auf alle Gegnerangriffe', 'dodge')
    turnActionsRef.current.push(`[Ausweichen] Nachteil auf alle Gegnerangriffe`)
    advanceAfterActionResolution(nextTurnState)
  }, [combat?.turnState, addLog, showBanner, advanceAfterActionResolution])

  // ── Action: Free Action (creative input) ───────────────────────────────

  const startFreeAction = useCallback(() => {
    if (!createCombatTurnState(combat?.turnState).actionAvailable) return
    setFreeActionText('')
    setPlayerPhase('freeAction')
  }, [combat?.turnState])

  const submitFreeAction = useCallback(() => {
    const text = freeActionText.trim()
    if (!text) return
    if (!createCombatTurnState(combat?.turnState).actionAvailable) return
    const nextTurnState = consumeCombatTurnState(combat?.turnState, { action: true })
    addLog(`Improvisierte Aktion: ${text}`, 'free')
    turnActionsRef.current.push(`[Improvisierte Aktion] ${text}`)
    setFreeActionText('')
    advanceAfterActionResolution(nextTurnState)
  }, [freeActionText, combat?.turnState, addLog, advanceAfterActionResolution])

  // ── Helpers ─────────────────────────────────────────────────────────────

  const getFirstLivingEnemy = useCallback(() => {
    return (combat?.enemies || []).find(e => e.currentHP > 0) || null
  }, [combat])

  const handleEndCombat = useCallback(() => {
    addLog('Kampf beendet.')
    endCombat()
    if (onCombatAction) onCombatAction('Der Kampf ist beendet.')
  }, [endCombat, addLog, onCombatAction])

  // ── Render ──────────────────────────────────────────────────────────────

  const availableSlotLevels = useMemo(() => {
    if (!selectedSpell || selectedSpell.level === 0) return []
    const slots = character?.currentSpellSlots || character?.spellSlots || {}
    const levels = []
    for (let lvl = selectedSpell.level; lvl <= 9; lvl++) {
      if ((slots[lvl] || 0) > 0) levels.push(lvl)
    }
    return levels
  }, [selectedSpell, character])

  if (!combat?.active) return null

  const isPrepPhase = combat.phase === 'initiative' || (!combat.playerInitiative && combat.phase !== 'ready' && combat.phase !== 'action')
  const isReadyPhase = combat.phase === 'ready'
  const isInitPhase = isPrepPhase || isReadyPhase
  const isPlayerTurn = Boolean(combat.isPlayerTurn)
  const enemies = combat.enemies || []
  const playerHP = character?.currentHP ?? character?.maxHP ?? 0
  const playerMaxHP = character?.maxHP ?? 1
  const equippedWeaponRender = character?.inventory?.find(i => typeof i === 'object' && i.type === 'weapon' && i.equipped)
  const weaponInfo = equippedWeaponRender
    ? { damageDice: equippedWeaponRender.properties?.damageDice || '1d6', abilityMod: equippedWeaponRender.properties?.abilityMod || 'str', label: equippedWeaponRender.name }
    : getClassWeaponDefaults(character?.class)
  const abilityMod = character ? getModifier(character.attributes?.[weaponInfo.abilityMod] || 10) : 0
  const totalWeaponDamageBonus = abilityMod + playerDamageBuff
  const effectiveAttackBonus = Number(character?.attackBonus ?? 0) + playerAttackBonusBuff
  const effectivePlayerAC = Number(character?.armorClass || 12) + playerArmorClassBuff
  const isSpellcaster = combatSpellOptions.length > 0
  const actionOptionsAvailable = currentTurnState.actionAvailable
  const hasUsableItems = usableItems.length > 0
  const selectedTarget = enemies.find(e => e.id === selectedTargetId)
  const buffSummaryParts = [
    playerInitiativeBuff ? `INI ${formatSignedBonus(playerInitiativeBuff)}` : '',
    playerAttackBonusBuff ? `ATK ${formatSignedBonus(playerAttackBonusBuff)}` : '',
    playerArmorClassBuff ? `AC ${formatSignedBonus(playerArmorClassBuff)}` : '',
    playerDamageBuff ? `DMG ${formatSignedBonus(playerDamageBuff)}` : '',
    playerSpellAttackBuff ? `ZA ${formatSignedBonus(playerSpellAttackBuff)}` : '',
    playerSpellSaveDcBuff ? `SG ${formatSignedBonus(playerSpellSaveDcBuff)}` : '',
  ].filter(Boolean)

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
          {currentTurnState.dodgeActive && <span className="badge-red text-xs bg-blue-900/30 border-blue-700/40 text-blue-400">Ausweichen</span>}
          <button onClick={handleEndCombat} className="btn-ghost text-xs px-2 py-1">✕</button>
        </div>
      </div>

      {/* Result Banner — always visible at top */}
      <ResultBanner result={resultBanner} />

      <div className="divider-gold" />

      {/* Prep: Kampf beginnt — Initiative würfeln */}
      {isPrepPhase && (
        <div className="rounded-lg border-2 border-red-600/50 bg-red-900/20 p-4 text-center space-y-2 animate-slide-in">
          <div className="text-3xl">⚔️</div>
          <p className="font-heading text-lg text-red-300 tracking-wider">KAMPF BEGINNT</p>
          {enemies.length > 0 && (
            <p className="font-body text-sm text-stone-300">
              Gegner: {enemies.map(e => e.name).join(', ')}
            </p>
          )}
          <p className="font-body text-xs text-stone-400">
            {initiativeRolling
              ? 'Der Würfel rollt bereits. Das Ergebnis erscheint direkt nach der Animation.'
              : 'Würfle Initiative, um die Zugreihenfolge zu bestimmen.'}
          </p>
          <button
            onClick={rollInitiative}
            disabled={initiativeRolling}
            className={`btn-danger px-4 py-2 font-heading text-sm ${initiativeRolling ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {initiativeRolling ? '🎲 Initiative läuft ...' : '🎲 Initiative würfeln'}
          </button>
        </div>
      )}

      {/* Ready: Initiative ausgerollt, warte auf Bestätigung */}
      {isReadyPhase && (
        <div className="rounded-lg border-2 border-gold-600/50 bg-gold-600/10 p-4 text-center space-y-2 animate-slide-in">
          <div className="text-3xl">🎲</div>
          <p className="font-heading text-lg text-gold-300 tracking-wider">INITIATIVE</p>
          <div className="font-body text-sm text-stone-200 space-y-1">
            <p>Du: <span className="font-heading text-gold-400">{combat.playerInitiative}</span></p>
            {enemies.length > 0 && (
              <p>
                {enemies.map((e, i) => (
                  <span key={e.id || i}>
                    {i > 0 && ' · '}
                    {e.name}: <span className="font-heading text-red-400">{e.initiative}</span>
                  </span>
                ))}
              </p>
            )}
          </div>
          <p className={`font-heading text-sm ${combat.playerActsFirst ? 'text-gold-400' : 'text-red-400'}`}>
            {combat.playerActsFirst ? '▶ Du handelst zuerst!' : '💀 Gegner handeln zuerst!'}
          </p>
          <button
            onClick={confirmReadyAndStartRound}
            className={combat.playerActsFirst ? 'btn-gold px-4 py-2 font-heading text-sm' : 'btn-danger px-4 py-2 font-heading text-sm'}
          >
            ⚔️ Runde 1 starten
          </button>
        </div>
      )}

      {/* Prominent Turn Banner — shows whose turn it is during action phase */}
      {!isInitPhase && (
        <div className={`rounded-lg border-2 px-3 py-2 flex items-center justify-center gap-2 font-heading text-sm tracking-wider ${
          isPlayerTurn
            ? 'border-gold-600/50 bg-gold-600/10 text-gold-300'
            : 'border-red-700/50 bg-red-900/20 text-red-300'
        }`}>
          <span className={isPlayerTurn ? 'animate-pulse' : ''}>
            {isPlayerTurn ? '▶' : '⏳'}
          </span>
          <span>Runde {combat.round || 1} —</span>
          <span className="font-body">
            {isPlayerTurn ? 'DEINE AKTION' : 'Gegner handelt…'}
          </span>
        </div>
      )}

      {/* Enemy HP Bars */}
      {enemies.length > 0 && (
        <div>
          <p className="section-subtitle mb-2">Gegner</p>
          {playerPhase === 'selectTarget' && (
            <div className="bg-gold-600/10 border border-gold-600/30 rounded p-2 text-xs font-body text-gold-400 text-center mb-2">
              Wähle ein Ziel für deinen Angriff
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
          {combatPlayerBuffs && (
            <div className="rounded border border-emerald-700/40 bg-emerald-900/15 px-3 py-2">
              <p className="font-heading text-xs text-emerald-300">
                {combatPlayerBuffs.label || 'Aktiver Kampfbuff'}
              </p>
              {buffSummaryParts.length > 0 && (
                <p className="font-body text-[11px] text-stone-400 mt-1">
                  {buffSummaryParts.join(' · ')}
                </p>
              )}
            </div>
          )}
          <p className="font-body text-xs text-stone-500 mt-2">
            AC {effectivePlayerAC}{playerArmorClassBuff ? ` (${combatPlayerBuffs?.label || 'Buff'} aktiv)` : ''}
          </p>
        </div>
      )}

      {/* Spell Slots Display */}
      {isSpellcaster && character?.spellSlots && (
        <SpellSlotDisplay spellSlots={character.spellSlots} currentSpellSlots={character.currentSpellSlots} />
      )}

      {!isInitPhase && isPlayerTurn && (
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className={`badge-red ${currentTurnState.actionAvailable ? 'text-gold-400' : 'text-stone-500'}`}>
            Aktion: {currentTurnState.actionAvailable ? 'frei' : 'verbraucht'}
          </span>
          <span className={`badge-red ${currentTurnState.bonusActionAvailable ? 'text-blue-400' : 'text-stone-500'}`}>
            Bonusaktion: {currentTurnState.bonusActionAvailable ? 'frei' : 'verbraucht'}
          </span>
          <span className={`badge-red ${currentTurnState.reactionAvailable ? 'text-emerald-400' : 'text-stone-500'}`}>
            Reaktion: {currentTurnState.reactionAvailable ? 'frei' : 'verbraucht'}
          </span>
        </div>
      )}

      <div className="divider-gold" />

      {/* ── Combat Actions ─────────────────────────────────────────────── */}
      {!isInitPhase && (
        <div className="space-y-2">

          {/* Enemy turn indicator */}
          {!isPlayerTurn && (
            <div className="bg-red-900/20 border border-red-700/30 rounded p-2 text-xs font-body text-red-400 text-center animate-pulse">
              Gegner sind am Zug — warte...
            </div>
          )}

          {/* ── ACTION SELECTION ── */}
          {playerPhase === 'selectAction' && (
            <div className="space-y-1.5">
              <p className="section-subtitle mb-1">Aktion wählen</p>
              <button
                onClick={startAttack}
                disabled={!actionOptionsAvailable}
                className={`btn-primary w-full text-sm text-left px-3 ${!actionOptionsAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                ⚔️ Angriff ({weaponInfo.label}, {weaponInfo.damageDice}{totalWeaponDamageBonus >= 0 ? `+${totalWeaponDamageBonus}` : totalWeaponDamageBonus})
              </button>
              {castableSpellOptions.length > 0 && (
                <button onClick={startSpellCast} className="btn-primary w-full text-sm text-left px-3 bg-blue-900/40 border-blue-700/40 hover:bg-blue-800/50">
                  ✨ Zauber wirken ({castableSpellOptions.length} verfuegbar)
                </button>
              )}
              {hasUsableItems && (
                <button
                  onClick={startUseItem}
                  disabled={!actionOptionsAvailable}
                  className={`btn-primary w-full text-sm text-left px-3 bg-emerald-900/40 border-emerald-700/40 hover:bg-emerald-800/50 ${!actionOptionsAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  🧪 Gegenstand ({usableItems.length})
                </button>
              )}
              <button
                onClick={doDodge}
                disabled={!actionOptionsAvailable}
                className={`btn-primary w-full text-sm text-left px-3 bg-stone-800/60 border-stone-600/40 hover:bg-stone-700/50 ${!actionOptionsAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                🛡️ Ausweichen (Nachteil auf Gegnerangriffe)
              </button>
              <button
                onClick={startFreeAction}
                disabled={!actionOptionsAvailable}
                className={`btn-primary w-full text-sm text-left px-3 bg-purple-900/40 border-purple-700/40 hover:bg-purple-800/50 ${!actionOptionsAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                💬 Improvisierte Aktion
              </button>
              {!actionOptionsAvailable && (
                <div className="rounded border border-stone-700/40 bg-stone-900/25 px-3 py-2 text-xs font-body text-stone-400">
                  Deine Aktion ist bereits verbraucht. Du kannst noch einen verfuegbaren Bonusaktions-Zauber wirken oder den Zug beenden.
                </div>
              )}
              {isSpellcaster && castableSpellOptions.length === 0 && (
                <div className="rounded border border-blue-900/30 bg-blue-950/20 px-3 py-2 text-xs font-body text-stone-400">
                  In diesem Zug ist wegen der Aktionsoekonomie kein weiterer Zauber verfuegbar.
                </div>
              )}
              <button onClick={endTurnEarly} className="btn-ghost w-full text-sm text-left px-3">
                Zug beenden
              </button>
            </div>
          )}

          {/* ── SPELL SELECTION ── */}
          {playerPhase === 'selectSpell' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="section-subtitle">Zauber wählen</p>
                <button onClick={() => setPlayerPhase('selectAction')} className="btn-ghost text-xs px-2 py-0.5">Zurueck</button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {castableSpellOptions.map(spell => (
                  <button
                    key={spell.key}
                    onClick={() => pickSpell(spell)}
                    className="w-full text-left px-2 py-1.5 rounded text-xs font-body border border-transparent hover:border-blue-600/30 hover:bg-blue-900/20 transition-colors"
                  >
                    <span className="font-heading text-blue-400">{spell.name}</span>
                    <span className="text-stone-500 ml-1.5">
                      {spell.level === 0 ? 'Cantrip' : `Grad ${spell.level}`}
                    </span>
                    <span className="text-stone-500 ml-1.5">
                      {spell.actionType === 'bonusAction' ? 'Bonusaktion' : 'Aktion'}
                    </span>
                    <span className="text-stone-600 ml-1.5">{spell.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── SPELL SLOT SELECTION ── */}
          {playerPhase === 'selectSpellSlot' && selectedSpell && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="section-subtitle">{selectedSpell.name} — Slot wählen</p>
                <button onClick={() => setPlayerPhase('selectSpell')} className="btn-ghost text-xs px-2 py-0.5">Zurueck</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableSlotLevels.map(lvl => {
                  const cur = (character?.currentSpellSlots || character?.spellSlots || {})[lvl] || 0
                  const max = (character?.spellSlots || {})[lvl] || 0
                  return (
                    <button
                      key={lvl}
                      onClick={() => pickSpellSlot(lvl)}
                      className="btn-primary text-xs px-3 py-1.5 bg-blue-900/40 border-blue-700/40 hover:bg-blue-800/50"
                    >
                      Grad {lvl} ({cur}/{max})
                      {lvl > selectedSpell.level && <span className="text-gold-400 ml-1">↑</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── ITEM SELECTION ── */}
          {playerPhase === 'selectItem' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="section-subtitle">Gegenstand wählen</p>
                <button onClick={() => setPlayerPhase('selectAction')} className="btn-ghost text-xs px-2 py-0.5">Zurueck</button>
              </div>
              <div className="space-y-1">
                {usableItems.map((item, idx) => {
                  const name = typeof item === 'object' ? item.name : item
                  const qty = typeof item === 'object' && item.quantity > 1 ? ` x${item.quantity}` : ''
                  return (
                    <button
                      key={typeof item === 'object' ? item.id : idx}
                      onClick={() => pickItem(item)}
                      className="w-full text-left px-2 py-1.5 rounded text-xs font-body border border-transparent hover:border-emerald-600/30 hover:bg-emerald-900/20 transition-colors"
                    >
                      <span className="font-heading text-emerald-400">🧪 {name}{qty}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── FREE ACTION ── */}
          {playerPhase === 'freeAction' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="section-subtitle">Improvisierte Aktion</p>
                <button onClick={() => setPlayerPhase('selectAction')} className="btn-ghost text-xs px-2 py-0.5">Zurueck</button>
              </div>
              <p className="font-body text-xs text-stone-500">Beschreibe eine Aktion, die du statt eines Standardmanoevers versuchst.</p>
              <textarea
                value={freeActionText}
                onChange={e => setFreeActionText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitFreeAction() } }}
                placeholder="z.B. Ich versuche den Kronleuchter herunterzureissen..."
                rows={2}
                className="input-dark w-full resize-none text-xs leading-relaxed"
                autoFocus
              />
              <button
                onClick={submitFreeAction}
                disabled={!freeActionText.trim()}
                className="btn-primary w-full text-sm bg-purple-900/40 border-purple-700/40 hover:bg-purple-800/50"
              >
                💬 Improvisierte Aktion ausfuehren
              </button>
            </div>
          )}

          {/* ── ATTACK ROLL ── */}
          {playerPhase === 'attack' && selectedTarget && (
            <div className="space-y-1.5">
              <button onClick={() => setPlayerPhase('selectAction')} className="btn-ghost text-xs px-2 py-0.5">Zurueck</button>
              <button onClick={rollAttack} className="btn-primary w-full text-sm">
                ⚔️ Angriff auf {selectedTarget.name} (d20{effectiveAttackBonus >= 0 ? '+' : ''}{effectiveAttackBonus} vs AC {selectedTarget.ac})
              </button>
            </div>
          )}

          {/* ── DAMAGE ROLL ── */}
          {playerPhase === 'damage' && (
            <div className="space-y-2">
              <div className="bg-gold-600/10 border border-gold-600/30 rounded p-2 text-xs font-body text-gold-400 text-center">
                {pendingAttack?.isCrit ? 'KRITISCHER TREFFER! Doppelter Schaden!' : 'Treffer! Wuerfle Schaden:'}
              </div>
              <button onClick={rollDamageAction} className="btn-primary w-full text-sm">
                💥 Schaden ({weaponInfo.label}: {weaponInfo.damageDice}{totalWeaponDamageBonus >= 0 ? `+${totalWeaponDamageBonus}` : totalWeaponDamageBonus}){pendingAttack?.isCrit ? ' KRIT!' : ''}
              </button>
            </div>
          )}

          {/* ── DONE ── */}
          {playerPhase === 'done' && (
            <div className="text-center text-xs font-body text-stone-400 animate-pulse py-1">
              Zug wird beendet...
            </div>
          )}

          {/* Saving throws removed — SRD: saves are reactions triggered by enemy effects, not voluntary player actions */}
        </div>
      )}

      {/* Action Log */}
      {actionLog.length > 0 && (
        <div className="bg-dungeon-300/50 rounded border border-stone-800 p-2 max-h-36 overflow-y-auto space-y-0.5">
          {actionLog.slice().reverse().map(entry => (
            <LogEntry key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
