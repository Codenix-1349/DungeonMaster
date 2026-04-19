import { describe, expect, it } from 'vitest'
import { BUILTIN_ADVENTURES, mergeBuiltinAdventures } from '../data/builtinAdventures.js'
import { createInitialSceneState, findInteractionDef, normalizeAdventureEntry, resolveInteractionOutcome } from '../data/srd.js'
import { rebuildVisibleChoices } from '../pages/gamePageRuntime.js'

function getDemoAdventure() {
  const demo = BUILTIN_ADVENTURES.find(entry => entry.id === 'builtin-arena-mechanics-demo')
  return normalizeAdventureEntry(demo)
}

describe('builtin mechanics demo adventure', () => {
  it('keeps the demo module available when merging custom adventures', () => {
    const merged = mergeBuiltinAdventures([
      { id: 'custom-adventure', title: 'Custom Adventure', text: 'A short custom test.' },
    ])

    expect(merged.some(entry => entry.id === 'builtin-arena-mechanics-demo')).toBe(true)
    expect(merged.some(entry => entry.id === 'custom-adventure')).toBe(true)
  })

  it('grants the altar blessing flag on a successful arcana check without starting combat', () => {
    const adventure = getDemoAdventure()
    const sceneState = createInitialSceneState(adventure)
    const interaction = findInteractionDef(adventure.structure, 'attune_blessing_altar')

    const resolved = resolveInteractionOutcome(sceneState, interaction, adventure.structure.module, 'success')

    expect(resolved.sceneState.gmState.plotFlags.ALTAR_BLESSED).toBe(true)
    expect(resolved.sceneState.gmState.plotFlags.BLESSING_SOURCE_CHOSEN).toBe(true)
    expect(resolved.combatStart).toBeNull()
  })

  it('locks the second blessing source even when the altar check fails', () => {
    const adventure = getDemoAdventure()
    const sceneState = createInitialSceneState(adventure)
    const interaction = findInteractionDef(adventure.structure, 'attune_blessing_altar')

    const resolved = resolveInteractionOutcome(sceneState, interaction, adventure.structure.module, 'failure')

    expect(resolved.sceneState.gmState.plotFlags.ALTAR_BLESSED).not.toBe(true)
    expect(resolved.sceneState.gmState.plotFlags.BLESSING_SOURCE_CHOSEN).toBe(true)
    expect(resolved.combatStart).toBeNull()
  })

  it('starts the blessed training combat with buffs + revive when the player asks Rennald', () => {
    const adventure = getDemoAdventure()
    const baseScene = createInitialSceneState(adventure)
    const altar = findInteractionDef(adventure.structure, 'attune_blessing_altar')
    const afterBlessing = resolveInteractionOutcome(baseScene, altar, adventure.structure.module, 'success').sceneState

    const beginTrial = findInteractionDef(adventure.structure, 'begin_trial_blessed')
    const resolved = resolveInteractionOutcome(afterBlessing, beginTrial, adventure.structure.module, 'success')

    expect(resolved.combatStart).toMatchObject({
      active: true,
      round: 1,
      phase: 'initiative',
    })
    expect(resolved.combatStart.consequenceText).toContain('bronzene Trainingswächter')
    expect(resolved.combatStart.playerBuffs).toMatchObject({
      label: 'Segen des Messingaltars',
      attackBonus: 1,
      initiativeBonus: 2,
    })
    expect(resolved.combatStart.enemies[0]).toMatchObject({
      name: 'Bronzener Trainingswächter',
      maxHP: 6,
      ac: 10,
      attackBonus: 1,
      damageDice: '1d3',
      maxDamagePerHit: 2,
      restorePlayerAfterVictory: true,
      revivePlayerOnDefeat: true,
    })
    expect(resolved.combatStart.enemies[0].defeatRevivalText).toContain('Rennald')
    expect(resolved.combatStart.enemies[0].victoryRecoveryText).toContain('Rennald')
  })

  it('starts the unblessed training combat with revive when the player asks Rennald without a blessing', () => {
    const adventure = getDemoAdventure()
    const sceneState = createInitialSceneState(adventure)
    const beginTrial = findInteractionDef(adventure.structure, 'begin_trial_plain')

    const resolved = resolveInteractionOutcome(sceneState, beginTrial, adventure.structure.module, 'success')

    expect(resolved.combatStart).toMatchObject({
      active: true,
      phase: 'initiative',
      consequenceText: expect.stringContaining('ohne Segen'),
      playerBuffs: null,
    })
    expect(resolved.combatStart.enemies[0]).toMatchObject({
      maxHP: 6,
      ac: 10,
      attackBonus: 1,
      damageDice: '1d3',
      maxDamagePerHit: 2,
      revivePlayerOnDefeat: true,
      restorePlayerAfterVictory: true,
    })
  })

  it('shows only one blessing source attempt per arena run', () => {
    const adventure = getDemoAdventure()
    const section = adventure.structure.sections.find(entry => entry.id === 'brass_arena')

    const initialScene = createInitialSceneState(adventure)
    const initialChoices = rebuildVisibleChoices({ section, sceneState: initialScene, runtimeModule: true })
    expect(initialChoices.some(c => c.interactionId === 'read_trial_rules')).toBe(false)
    expect(initialChoices.some(c => c.interactionId === 'attune_blessing_altar')).toBe(true)
    expect(initialChoices.some(c => c.interactionId === 'study_ancient_tome')).toBe(true)
    expect(initialChoices.some(c => c.interactionId === 'begin_trial_blessed')).toBe(false)
    expect(initialChoices.some(c => c.interactionId === 'begin_trial_plain')).toBe(true)

    const altar = findInteractionDef(adventure.structure, 'attune_blessing_altar')
    const afterBlessing = resolveInteractionOutcome(initialScene, altar, adventure.structure.module, 'success').sceneState
    const blessedChoices = rebuildVisibleChoices({ section, sceneState: afterBlessing, runtimeModule: true })

    expect(blessedChoices.some(c => c.interactionId === 'attune_blessing_altar')).toBe(false)
    expect(blessedChoices.some(c => c.interactionId === 'study_ancient_tome')).toBe(false)
    expect(blessedChoices.some(c => c.interactionId === 'begin_trial_blessed')).toBe(true)
    expect(blessedChoices.some(c => c.interactionId === 'begin_trial_plain')).toBe(false)

    const afterFailedAttempt = resolveInteractionOutcome(initialScene, altar, adventure.structure.module, 'failure').sceneState
    const failedChoices = rebuildVisibleChoices({ section, sceneState: afterFailedAttempt, runtimeModule: true })

    expect(failedChoices.some(c => c.interactionId === 'attune_blessing_altar')).toBe(false)
    expect(failedChoices.some(c => c.interactionId === 'study_ancient_tome')).toBe(false)
    expect(failedChoices.some(c => c.interactionId === 'begin_trial_blessed')).toBe(false)
    expect(failedChoices.some(c => c.interactionId === 'begin_trial_plain')).toBe(true)
  })

  it('keeps arena restart and blessing interactions visible even after they were used recently', () => {
    const adventure = getDemoAdventure()
    const section = adventure.structure.sections.find(entry => entry.id === 'brass_arena')
    const sceneState = {
      ...createInitialSceneState(adventure),
      recentActions: [
        'Rennald bitten, den Trainingskampf zu starten',
        'Den Messingaltar berühren (Arkane Kunde)',
      ],
      recentActionKeys: [
        'intr:begin_trial_plain',
        'intr:attune_blessing_altar',
      ],
    }

    const choices = rebuildVisibleChoices({ section, sceneState, runtimeModule: true })

    expect(choices.some(c => c.interactionId === 'begin_trial_plain')).toBe(true)
    expect(choices.some(c => c.interactionId === 'attune_blessing_altar')).toBe(true)
  })
})
