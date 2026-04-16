import { SPELL_EFFECTS } from './spellEffects.js'

export const DEFAULT_COMBAT_TURN_STATE = Object.freeze({
  actionAvailable: true,
  bonusActionAvailable: true,
  reactionAvailable: true,
  bonusActionSpellCast: false,
  leveledActionSpellCast: false,
  dodgeActive: false,
  dashActive: false,
  disengageActive: false,
})

export function createCombatTurnState(overrides = {}) {
  const raw = overrides && typeof overrides === 'object' && !Array.isArray(overrides)
    ? overrides
    : {}

  return {
    actionAvailable: raw.actionAvailable ?? true,
    bonusActionAvailable: raw.bonusActionAvailable ?? true,
    reactionAvailable: raw.reactionAvailable ?? true,
    bonusActionSpellCast: raw.bonusActionSpellCast ?? false,
    leveledActionSpellCast: raw.leveledActionSpellCast ?? false,
    dodgeActive: raw.dodgeActive ?? false,
    dashActive: raw.dashActive ?? false,
    disengageActive: raw.disengageActive ?? false,
  }
}

export function getSpellActionType(spell = null) {
  const effect = spell?.key ? SPELL_EFFECTS[spell.key] : null
  if (effect?.reaction) return 'reaction'
  if (effect?.bonusAction) return 'bonusAction'
  return 'action'
}

export function canCastSpellInCombatTurn({ turnState = null, spellLevel = 0, actionType = 'action' } = {}) {
  const normalized = createCombatTurnState(turnState)

  if (actionType === 'reaction') {
    return normalized.reactionAvailable
  }

  if (actionType === 'bonusAction') {
    if (!normalized.bonusActionAvailable) return false
    if (normalized.leveledActionSpellCast) return false
    return true
  }

  if (!normalized.actionAvailable) return false
  if (normalized.bonusActionSpellCast && spellLevel > 0) return false
  return true
}

export function consumeCombatTurnState(
  turnState = null,
  {
    action = false,
    bonusAction = false,
    reaction = false,
    dodgeActive = null,
    dashActive = null,
    disengageActive = null,
    bonusActionSpellCast = false,
    leveledActionSpellCast = false,
  } = {},
) {
  const next = createCombatTurnState(turnState)

  if (action) next.actionAvailable = false
  if (bonusAction) next.bonusActionAvailable = false
  if (reaction) next.reactionAvailable = false
  if (bonusActionSpellCast) next.bonusActionSpellCast = true
  if (leveledActionSpellCast) next.leveledActionSpellCast = true
  if (dodgeActive != null) next.dodgeActive = Boolean(dodgeActive)
  if (dashActive != null) next.dashActive = Boolean(dashActive)
  if (disengageActive != null) next.disengageActive = Boolean(disengageActive)

  return next
}

export function applySpellcastToTurnState(turnState = null, { spellLevel = 0, actionType = 'action' } = {}) {
  if (actionType === 'reaction') {
    return consumeCombatTurnState(turnState, { reaction: true })
  }

  if (actionType === 'bonusAction') {
    return consumeCombatTurnState(turnState, {
      bonusAction: true,
      bonusActionSpellCast: spellLevel > 0,
    })
  }

  return consumeCombatTurnState(turnState, {
    action: true,
    leveledActionSpellCast: spellLevel > 0,
  })
}

export function createCombatState(config = {}) {
  const raw = config && typeof config === 'object' && !Array.isArray(config)
    ? config
    : {}

  return {
    ...raw,
    active: raw.active ?? true,
    round: raw.round ?? 1,
    enemies: Array.isArray(raw.enemies) ? raw.enemies : [],
    playerInitiative: raw.playerInitiative ?? 0,
    phase: raw.phase || 'initiative',
    isPlayerTurn: raw.isPlayerTurn ?? false,
    playerActsFirst: raw.playerActsFirst ?? null,
    turnState: createCombatTurnState(raw.turnState),
  }
}

export function startPlayerCombatTurn(combat = null, { incrementRound = false } = {}) {
  const normalized = createCombatState(combat || {})
  return {
    ...normalized,
    isPlayerTurn: true,
    round: incrementRound ? (normalized.round || 1) + 1 : (normalized.round || 1),
    turnState: createCombatTurnState(),
  }
}

export function getRoundForNextTurn(combat = null, nextTurnOwner = 'player') {
  const normalized = createCombatState(combat || {})
  const currentRound = normalized.round || 1

  if (nextTurnOwner === 'player') {
    return normalized.playerActsFirst ? currentRound + 1 : currentRound
  }

  return normalized.playerActsFirst ? currentRound : currentRound + 1
}
