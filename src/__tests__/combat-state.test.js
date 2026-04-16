import { describe, expect, it } from 'vitest'

import {
  applySpellcastToTurnState,
  canCastSpellInCombatTurn,
  createCombatState,
  getRoundForNextTurn,
  startPlayerCombatTurn,
} from '../data/combatState.js'

describe('combat state helpers', () => {
  it('normalizes combat state defaults and preserves partial turn state', () => {
    const combat = createCombatState({
      enemies: [{ id: 'wolf-1', name: 'Wolf' }],
      turnState: { actionAvailable: false },
    })

    expect(combat.active).toBe(true)
    expect(combat.round).toBe(1)
    expect(combat.phase).toBe('initiative')
    expect(combat.isPlayerTurn).toBe(false)
    expect(combat.playerActsFirst).toBeNull()
    expect(combat.enemies).toHaveLength(1)
    expect(combat.turnState.actionAvailable).toBe(false)
    expect(combat.turnState.bonusActionAvailable).toBe(true)
    expect(combat.turnState.reactionAvailable).toBe(true)
    expect(combat.turnState.dodgeActive).toBe(false)
  })

  it('starts a fresh player turn and clears per-turn combat flags', () => {
    const combat = startPlayerCombatTurn({
      round: 2,
      isPlayerTurn: false,
      turnState: {
        actionAvailable: false,
        bonusActionAvailable: false,
        dodgeActive: true,
      },
    })

    expect(combat.isPlayerTurn).toBe(true)
    expect(combat.round).toBe(2)
    expect(combat.turnState.actionAvailable).toBe(true)
    expect(combat.turnState.bonusActionAvailable).toBe(true)
    expect(combat.turnState.dodgeActive).toBe(false)
  })
})

describe('combat spell action economy', () => {
  it('restricts leveled action spells after a bonus-action spell, but still allows an action cantrip', () => {
    const turnState = applySpellcastToTurnState(null, {
      spellLevel: 1,
      actionType: 'bonusAction',
    })

    expect(turnState.bonusActionAvailable).toBe(false)
    expect(turnState.bonusActionSpellCast).toBe(true)
    expect(canCastSpellInCombatTurn({
      turnState,
      spellLevel: 0,
      actionType: 'action',
    })).toBe(true)
    expect(canCastSpellInCombatTurn({
      turnState,
      spellLevel: 1,
      actionType: 'action',
    })).toBe(false)
  })

  it('blocks all bonus-action spells after a leveled action spell', () => {
    const turnState = applySpellcastToTurnState(null, {
      spellLevel: 2,
      actionType: 'action',
    })

    expect(turnState.actionAvailable).toBe(false)
    expect(turnState.leveledActionSpellCast).toBe(true)
    expect(canCastSpellInCombatTurn({
      turnState,
      spellLevel: 0,
      actionType: 'bonusAction',
    })).toBe(false)
    expect(canCastSpellInCombatTurn({
      turnState,
      spellLevel: 2,
      actionType: 'bonusAction',
    })).toBe(false)
  })

  it('still allows a bonus-action spell after an action cantrip', () => {
    const turnState = applySpellcastToTurnState(null, {
      spellLevel: 0,
      actionType: 'action',
    })

    expect(canCastSpellInCombatTurn({
      turnState,
      spellLevel: 1,
      actionType: 'bonusAction',
    })).toBe(true)
  })
})

describe('combat round progression', () => {
  it('keeps the enemy turn in the same round when the player won initiative', () => {
    expect(getRoundForNextTurn({ round: 1, playerActsFirst: true }, 'enemy')).toBe(1)
    expect(getRoundForNextTurn({ round: 1, playerActsFirst: true }, 'player')).toBe(2)
  })

  it('keeps the player turn in the same round when enemies won initiative', () => {
    expect(getRoundForNextTurn({ round: 1, playerActsFirst: false }, 'player')).toBe(1)
    expect(getRoundForNextTurn({ round: 1, playerActsFirst: false }, 'enemy')).toBe(2)
  })
})
