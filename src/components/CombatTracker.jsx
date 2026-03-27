import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useGame } from '../context/GameContext'
import { getClassWeaponDefaults, SPELL_LIST } from '../data/srd'
import { resolveSpellInCombat, resolveHealingPotion, rollDice } from '../data/spellEffects'

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
      <div className="text-2xl mb-1">{style.icon}</div>
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
  } = useGame()

  const [actionLog, setActionLog] = useState([])
  const [resultBanner, setResultBanner] = useState(null)
  const bannerTimerRef = useRef(null)

  // State machine for player turn
  // null | 'selectAction' | 'selectTarget' | 'attack' | 'damage' |
  // 'selectSpell' | 'selectSpellSlot' | 'selectSpellTarget' |
  // 'selectItem' | 'freeAction' | 'done'
  const [playerPhase, setPlayerPhase] = useState(null)
  const [selectedTargetId, setSelectedTargetId] = useState(null)
  const [pendingAttack, setPendingAttack] = useState(null)
  const [selectedSpell, setSelectedSpell] = useState(null)
  const [selectedCastLevel, setSelectedCastLevel] = useState(null)
  const [dodgeActive, setDodgeActive] = useState(false)
  const [freeActionText, setFreeActionText] = useState('')

  // Guards and accumulators
  const enemyTurnRunningRef = useRef(false)
  const turnActionsRef = useRef([])
  const initRolledRef = useRef(false)

  const addLog = useCallback((text, type = 'info') => {
    setActionLog(prev => [...prev.slice(-40), { id: Date.now() + Math.random(), text, type }])
  }, [])

  const showBanner = useCallback((title, detail, type = 'hit') => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
    setResultBanner({ title, detail, type })
    bannerTimerRef.current = setTimeout(() => setResultBanner(null), 2500)
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

  // ── Initiative ──────────────────────────────────────────────────────────

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
    addLog(`Initiative: Du ${playerInit} | Gegner: ${enemies.map(e => `${e.name} ${e.initiative}`).join(', ')}`, 'info')
    addLog(playerFirst ? 'Du handelst zuerst!' : 'Gegner handeln zuerst!', 'info')
    if (!playerFirst) {
      setTimeout(() => {
        if (runEnemyTurnRef.current) runEnemyTurnRef.current()
      }, 600)
    }
  }, [character, combat, getModifier, setCombat, addLog])

  useEffect(() => {
    if (!combat?.active || combat?.phase !== 'initiative' || !character) return
    if (combat.playerInitiative > 0 || initRolledRef.current) return
    initRolledRef.current = true
    rollInitiative()
  }, [combat?.active, combat?.phase, character, combat?.playerInitiative, rollInitiative])

  useEffect(() => {
    if (!combat?.active) {
      initRolledRef.current = false
      setDodgeActive(false)
    }
  }, [combat?.active])

  // ── Turn management ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!combat?.active || combat?.phase === 'initiative') {
      setPlayerPhase(null)
      return
    }
    if (combat.isPlayerTurn) {
      setPendingAttack(null)
      setSelectedSpell(null)
      setSelectedCastLevel(null)
      setPlayerPhase('selectAction')
    } else {
      setPlayerPhase(null)
    }
  }, [combat?.isPlayerTurn, combat?.active, combat?.phase])

  // ── Run enemy turn immediately, then send combined round summary to AI ──

  const runEnemyTurnAndFlush = useCallback(() => {
    if (!character || !combat?.active) {
      flushTurnSummary()
      return
    }

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
      if (dodgeActive) {
        const secondRoll = rollDie(20)
        attackRoll = Math.min(attackRoll, secondRoll)
      }

      const atkTotal = attackRoll + (enemy.attackBonus || 3)
      const playerAC = character.armorClass || 12
      if (attackRoll === 1) {
        logs.push(`${enemy.name}: Patzer! Verfehlt.`)
      } else if (attackRoll === 20 || atkTotal >= playerAC) {
        const dmgDice = enemy.damageDice || '1d6'
        let dmg = rollDamageStr(dmgDice)
        if (attackRoll === 20) dmg += rollDamageStr(dmgDice)
        newHP = Math.max(0, newHP - dmg)
        logs.push({ text: attackRoll === 20
          ? `${enemy.name} KRITISCH! ${dmg} Schaden`
          : `${enemy.name} trifft (${atkTotal} vs AC ${playerAC}) ${dmg} Schaden`, type: 'enemy' })
      } else {
        logs.push({ text: `${enemy.name} verfehlt (${atkTotal} vs AC ${playerAC})${dodgeActive ? ' [Ausweichen]' : ''}`, type: 'miss' })
      }
    }

    setDodgeActive(false)
    updateCharacterHP(newHP)
    logs.forEach(l => addLog(l.text, l.type))

    // Append enemy actions to the same turn summary
    turnActionsRef.current.push(`[Gegner-Angriff] ${logs.map(l => l.text).join(' | ')} → Du: ${newHP}/${character.maxHP} HP`)

    if (newHP <= 0) {
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
    setCombat(prev => ({ ...prev, isPlayerTurn: true, round: (prev.round || 1) + 1 }))
    setPendingAttack(null)
    setSelectedSpell(null)
    setSelectedCastLevel(null)
    setFreeActionText('')
    setPlayerPhase('selectAction')
  }, [character, combat, dodgeActive, updateCharacterHP, addLog, flushTurnSummary, setCombat, endCombat])

  // Ref to always access latest runEnemyTurnAndFlush (avoids stale closures in setTimeout)
  const runEnemyTurnRef = useRef(runEnemyTurnAndFlush)
  useEffect(() => { runEnemyTurnRef.current = runEnemyTurnAndFlush }, [runEnemyTurnAndFlush])

  // Finish player turn: show 'done' briefly, then run enemy turn via ref
  const finishPlayerTurn = useCallback(() => {
    setPlayerPhase('done')
    setTimeout(() => {
      if (runEnemyTurnRef.current) runEnemyTurnRef.current()
    }, 600)
  }, [])

  // ── Action: Physical Attack ─────────────────────────────────────────────

  const startAttack = useCallback(() => {
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

    const roll = rollDie(20)
    const attackBonus = Number(character?.attackBonus ?? 0)
    const total = roll + attackBonus
    const isCrit = roll === 20
    const isFumble = roll === 1

    if (isFumble) {
      const msg = `Patzer! Nat. 1 gegen ${target.name} — daneben!`
      addLog(msg, 'miss')
      showBanner('Patzer!', `Nat. 1 gegen ${target.name}`, 'miss')
      turnActionsRef.current.push(msg)
      setPendingAttack(null)
      finishPlayerTurn()
    } else if (isCrit || total >= target.ac) {
      const msg = isCrit
        ? `KRITISCH! Nat. 20 gegen ${target.name}!`
        : `Treffer! ${total} (d20: ${roll} + ${attackBonus}) vs AC ${target.ac}`
      addLog(msg, isCrit ? 'crit' : 'hit')
      showBanner(isCrit ? 'KRITISCH!' : 'Treffer!', `${roll} + ${attackBonus} = ${total} vs AC ${target.ac}`, isCrit ? 'crit' : 'hit')
      turnActionsRef.current.push(msg)
      setPendingAttack({ roll, total, isCrit, targetId: selectedTargetId })
      setPlayerPhase('damage')
    } else {
      const msg = `Verfehlt! ${total} (d20: ${roll} + ${attackBonus}) vs AC ${target.ac}`
      addLog(msg, 'miss')
      showBanner('Verfehlt!', `${roll} + ${attackBonus} = ${total} vs AC ${target.ac}`, 'miss')
      turnActionsRef.current.push(msg)
      setPendingAttack(null)
      finishPlayerTurn()
    }
  }, [playerPhase, selectedTargetId, combat, character, addLog, finishPlayerTurn])

  const rollDamageAction = useCallback(() => {
    if (playerPhase !== 'damage' || !pendingAttack) return
    const enemies = combat?.enemies || []
    const target = enemies.find(e => e.id === pendingAttack.targetId)
    if (!target || target.currentHP <= 0) return

    const equippedWeapon = character?.inventory?.find(i => typeof i === 'object' && i.type === 'weapon' && i.equipped)
    const weaponInfo = equippedWeapon
      ? { damageDice: equippedWeapon.properties?.damageDice || '1d6', abilityMod: equippedWeapon.properties?.abilityMod || 'str', label: equippedWeapon.name }
      : getClassWeaponDefaults(character?.class)
    const abilityMod = getModifier(character?.attributes?.[weaponInfo.abilityMod] || 10)
    const diceStr = weaponInfo.damageDice
    const fullDice = `${diceStr}${abilityMod >= 0 ? `+${abilityMod}` : `${abilityMod}`}`
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
      killed ? 'kill' : (pendingAttack.isCrit ? 'crit' : 'hit')
    )
    turnActionsRef.current.push(msg)

    checkAllDead(updatedEnemies)
  }, [playerPhase, pendingAttack, combat, character, getModifier, setCombat, addLog])

  // ── Action: Cast Spell ──────────────────────────────────────────────────

  const startSpellCast = useCallback(() => {
    setSelectedSpell(null)
    setSelectedCastLevel(null)
    setPlayerPhase('selectSpell')
  }, [])

  // Use ref to avoid stale closure in pickSpell/pickSpellSlot
  const resolveSpellRef = useRef(null)

  resolveSpellRef.current = (spell, castLevel) => {
    if (!spell || !character) return

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
      spellAttackBonus: character.spellAttackBonus || 0,
      spellSaveDC: character.spellSaveDC || 10,
      abilityMod: getModifier(character.attributes?.[spellcastingAttr] || 10),
      targetAC: target?.ac ?? 10,
      targetName: target?.name || 'Ziel',
    })

    // Consume spell slot (not for cantrips)
    if (castLevel > 0) {
      consumeSpellSlot(castLevel)
    }

    // Apply damage to first living enemy
    if (effect.damage > 0 && target) {
      const enemies = combat?.enemies || []
      const newHP = Math.max(0, target.currentHP - effect.damage)
      const updatedEnemies = enemies.map(e => e.id === target.id ? { ...e, currentHP: newHP } : e)
      setCombat(prev => ({ ...prev, enemies: updatedEnemies }))

      const killed = newHP <= 0
      if (killed) {
        effect.resultText += ` ${target.name} faellt!`
      }

      addLog(effect.resultText, killed ? 'kill' : (effect.success ? 'spell' : 'miss'))
      showBanner(
        killed ? `${target.name} besiegt!` : (effect.success ? `${effect.damage} Schaden!` : 'Verfehlt!'),
        `${spell.name}${killed ? '' : ` → ${newHP}/${target.maxHP} HP`}`,
        killed ? 'kill' : (effect.success ? 'spell' : 'miss')
      )
      turnActionsRef.current.push(`[Zauber] ${effect.resultText}`)
      checkAllDead(updatedEnemies)
      return
    }

    // Apply healing to self
    if (effect.healing > 0) {
      const newHP = Math.min((character.currentHP || 0) + effect.healing, character.maxHP)
      updateCharacterHP(newHP)
      addLog(effect.resultText, 'heal')
      showBanner(`+${effect.healing} HP!`, `${spell.name} → ${newHP}/${character.maxHP} HP`, 'heal')
      turnActionsRef.current.push(`[Zauber] ${effect.resultText}`)
      finishPlayerTurn()
      return
    }

    addLog(effect.resultText, 'spell')
    showBanner(spell.name, effect.resultText, 'spell')
    turnActionsRef.current.push(`[Zauber] ${effect.resultText}`)
    finishPlayerTurn()
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
    setPlayerPhase('selectItem')
  }, [])

  const pickItem = useCallback((item) => {
    if (!character) return
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

    finishPlayerTurn()
  }, [character, updateCharacterHP, useItem, addLog, finishPlayerTurn])

  // ── Action: Dodge ───────────────────────────────────────────────────────

  const doDodge = useCallback(() => {
    setDodgeActive(true)
    addLog('Ausweichen! Gegner haben Nachteil auf Angriffe.', 'dodge')
    showBanner('Ausweichen!', 'Nachteil auf alle Gegnerangriffe', 'dodge')
    turnActionsRef.current.push(`[Ausweichen] Nachteil auf alle Gegnerangriffe`)
    finishPlayerTurn()
  }, [addLog, showBanner, finishPlayerTurn])

  // ── Action: Free Action (creative input) ───────────────────────────────

  const startFreeAction = useCallback(() => {
    setFreeActionText('')
    setPlayerPhase('freeAction')
  }, [])

  const submitFreeAction = useCallback(() => {
    const text = freeActionText.trim()
    if (!text) return
    addLog(`Freie Aktion: ${text}`, 'free')
    turnActionsRef.current.push(`[Freie Aktion] ${text}`)
    setFreeActionText('')
    finishPlayerTurn()
  }, [freeActionText, addLog, finishPlayerTurn])

  // ── Saving throw ────────────────────────────────────────────────────────

  const rollSave = useCallback((label, attr) => {
    const roll = rollDie(20)
    const mod = character ? getModifier(character.attributes?.[attr] || 10) : 0
    const total = roll + mod
    addLog(`Rettungswurf ${label}: d20 ${roll} + ${mod} = ${total}`, 'info')
    if (onCombatAction) onCombatAction(`[Rettungswurf ${label}] Ergebnis: ${total}`)
  }, [character, getModifier, addLog, onCombatAction])

  // ── Helpers ─────────────────────────────────────────────────────────────

  const getFirstLivingEnemy = useCallback(() => {
    return (combat?.enemies || []).find(e => e.currentHP > 0) || null
  }, [combat])

  const checkAllDead = useCallback((updatedEnemies) => {
    const allDead = updatedEnemies.every(e => e.currentHP <= 0)
    if (allDead) {
      const totalXP = updatedEnemies.reduce((sum, e) => sum + (e.xp || 0), 0)
      const victoryMsg = `Alle Gegner besiegt! +${totalXP} XP`
      addLog(victoryMsg, 'victory')
      showBanner('SIEG!', `+${totalXP} XP`, 'victory')
      turnActionsRef.current.push(victoryMsg)
      if (awardXP) awardXP(totalXP)
      flushTurnSummary()
      setTimeout(() => endCombat(), 800)
    } else {
      setPendingAttack(null)
      finishPlayerTurn()
    }
  }, [addLog, awardXP, endCombat, flushTurnSummary, finishPlayerTurn])

  const handleEndCombat = useCallback(() => {
    addLog('Kampf beendet.')
    endCombat()
    if (onCombatAction) onCombatAction('Der Kampf ist beendet.')
  }, [endCombat, addLog, onCombatAction])

  // ── Render ──────────────────────────────────────────────────────────────

  if (!combat?.active) return null

  const isInitPhase = !combat.playerInitiative || combat.playerInitiative === 0 || combat.phase === 'initiative'
  const isPlayerTurn = Boolean(combat.isPlayerTurn)
  const enemies = combat.enemies || []
  const livingEnemies = enemies.filter(e => e.currentHP > 0)
  const playerHP = character?.currentHP ?? character?.maxHP ?? 0
  const playerMaxHP = character?.maxHP ?? 1
  const equippedWeaponRender = character?.inventory?.find(i => typeof i === 'object' && i.type === 'weapon' && i.equipped)
  const weaponInfo = equippedWeaponRender
    ? { damageDice: equippedWeaponRender.properties?.damageDice || '1d6', abilityMod: equippedWeaponRender.properties?.abilityMod || 'str', label: equippedWeaponRender.name }
    : getClassWeaponDefaults(character?.class)
  const abilityMod = character ? getModifier(character.attributes?.[weaponInfo.abilityMod] || 10) : 0
  const isSpellcaster = availableSpells.length > 0
  const hasUsableItems = usableItems.length > 0
  const selectedTarget = enemies.find(e => e.id === selectedTargetId)

  // Slot levels available for the selected spell
  const availableSlotLevels = useMemo(() => {
    if (!selectedSpell || selectedSpell.level === 0) return []
    const slots = character?.currentSpellSlots || character?.spellSlots || {}
    const levels = []
    for (let lvl = selectedSpell.level; lvl <= 9; lvl++) {
      if ((slots[lvl] || 0) > 0) levels.push(lvl)
    }
    return levels
  }, [selectedSpell, character])

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
          {dodgeActive && <span className="badge-red text-xs bg-blue-900/30 border-blue-700/40 text-blue-400">Ausweichen</span>}
          <button onClick={handleEndCombat} className="btn-ghost text-xs px-2 py-1">✕</button>
        </div>
      </div>

      {/* Result Banner — always visible at top */}
      <ResultBanner result={resultBanner} />

      <div className="divider-gold" />

      {/* Initiative auto-rolling */}
      {isInitPhase && (
        <div className="text-center py-2">
          <p className="font-body text-xs text-stone-400 animate-pulse">Initiative wird gewuerfelt...</p>
        </div>
      )}

      {/* Enemy HP Bars */}
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
        </div>
      )}

      {/* Spell Slots Display */}
      {isSpellcaster && character?.spellSlots && (
        <SpellSlotDisplay spellSlots={character.spellSlots} currentSpellSlots={character.currentSpellSlots} />
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
              <p className="section-subtitle mb-1">Aktion waehlen</p>
              <button onClick={startAttack} className="btn-primary w-full text-sm text-left px-3">
                ⚔️ Angriff ({weaponInfo.label}, {weaponInfo.damageDice}{abilityMod >= 0 ? `+${abilityMod}` : abilityMod})
              </button>
              {isSpellcaster && (
                <button onClick={startSpellCast} className="btn-primary w-full text-sm text-left px-3 bg-blue-900/40 border-blue-700/40 hover:bg-blue-800/50">
                  ✨ Zauber wirken ({availableSpells.length} verfuegbar)
                </button>
              )}
              {hasUsableItems && (
                <button onClick={startUseItem} className="btn-primary w-full text-sm text-left px-3 bg-emerald-900/40 border-emerald-700/40 hover:bg-emerald-800/50">
                  🧪 Gegenstand ({usableItems.length})
                </button>
              )}
              <button onClick={doDodge} className="btn-primary w-full text-sm text-left px-3 bg-stone-800/60 border-stone-600/40 hover:bg-stone-700/50">
                🛡️ Ausweichen (Nachteil auf Gegnerangriffe)
              </button>
              <button onClick={startFreeAction} className="btn-primary w-full text-sm text-left px-3 bg-purple-900/40 border-purple-700/40 hover:bg-purple-800/50">
                💬 Freie Aktion (kreativ handeln)
              </button>
            </div>
          )}

          {/* ── SPELL SELECTION ── */}
          {playerPhase === 'selectSpell' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="section-subtitle">Zauber waehlen</p>
                <button onClick={() => setPlayerPhase('selectAction')} className="btn-ghost text-xs px-2 py-0.5">Zurueck</button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {availableSpells.map(spell => (
                  <button
                    key={spell.key}
                    onClick={() => pickSpell(spell)}
                    className="w-full text-left px-2 py-1.5 rounded text-xs font-body border border-transparent hover:border-blue-600/30 hover:bg-blue-900/20 transition-colors"
                  >
                    <span className="font-heading text-blue-400">{spell.name}</span>
                    <span className="text-stone-500 ml-1.5">
                      {spell.level === 0 ? 'Cantrip' : `Grad ${spell.level}`}
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
                <p className="section-subtitle">{selectedSpell.name} — Slot waehlen</p>
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
                <p className="section-subtitle">Gegenstand waehlen</p>
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
                <p className="section-subtitle">Freie Aktion</p>
                <button onClick={() => setPlayerPhase('selectAction')} className="btn-ghost text-xs px-2 py-0.5">Zurueck</button>
              </div>
              <p className="font-body text-xs text-stone-500">Beschreibe, was du versuchst — die KI erzaehlt das Ergebnis.</p>
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
                💬 Aktion ausfuehren
              </button>
            </div>
          )}

          {/* ── ATTACK ROLL ── */}
          {playerPhase === 'attack' && selectedTarget && (
            <div className="space-y-1.5">
              <button onClick={() => setPlayerPhase('selectAction')} className="btn-ghost text-xs px-2 py-0.5">Zurueck</button>
              <button onClick={rollAttack} className="btn-primary w-full text-sm">
                ⚔️ Angriff auf {selectedTarget.name} (d20{character?.attackBonus >= 0 ? '+' : ''}{character?.attackBonus} vs AC {selectedTarget.ac})
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
                💥 Schaden ({weaponInfo.label}: {weaponInfo.damageDice}{abilityMod >= 0 ? `+${abilityMod}` : abilityMod}){pendingAttack?.isCrit ? ' KRIT!' : ''}
              </button>
            </div>
          )}

          {/* ── DONE ── */}
          {playerPhase === 'done' && (
            <div className="text-center text-xs font-body text-stone-400 animate-pulse py-1">
              Zug wird beendet...
            </div>
          )}

          {/* Saving throws */}
          {isPlayerTurn && playerPhase !== 'done' && (
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
        <div className="bg-dungeon-300/50 rounded border border-stone-800 p-2 max-h-36 overflow-y-auto space-y-0.5">
          {actionLog.slice().reverse().map(entry => (
            <LogEntry key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
