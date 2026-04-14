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

  it('starts a structured combat with altar blessing on success', () => {
    const adventure = getDemoAdventure()
    const sceneState = createInitialSceneState(adventure)
    const interaction = findInteractionDef(adventure.structure, 'attune_blessing_altar')

    const resolved = resolveInteractionOutcome(sceneState, interaction, adventure.structure.module, 'success')

    expect(resolved.sceneState.gmState.plotFlags.ALTAR_BLESSED).toBe(true)
    expect(resolved.combatStart).toMatchObject({
      active: true,
      round: 1,
      phase: 'initiative',
    })
    expect(resolved.combatStart.consequenceText).toContain('bronzene Trainingswaechter')
    expect(resolved.combatStart.playerBuffs).toMatchObject({
      label: 'Segen des Messingaltars',
      attackBonus: 1,
      armorClassBonus: 1,
      initiativeBonus: 2,
      damageBonus: 1,
      spellAttackBonus: 1,
      spellSaveDcBonus: 1,
    })
    expect(resolved.combatStart.enemies).toHaveLength(1)
    expect(resolved.combatStart.enemies[0]).toMatchObject({
      name: 'Bronzener Trainingswaechter',
      maxHP: 8,
      ac: 11,
      attackBonus: 2,
      damageDice: '1d4',
      damageBonus: 0,
      xp: 25,
      restorePlayerAfterVictory: true,
    })
  })

  it('still starts the training fight on failure without a blessing', () => {
    const adventure = getDemoAdventure()
    const sceneState = createInitialSceneState(adventure)
    const interaction = findInteractionDef(adventure.structure, 'attune_blessing_altar')

    const resolved = resolveInteractionOutcome(sceneState, interaction, adventure.structure.module, 'failure')

    expect(resolved.sceneState.gmState.plotFlags.ALTAR_BLESSED).not.toBe(true)
    expect(resolved.combatStart).toMatchObject({
      active: true,
      phase: 'initiative',
      consequenceText: expect.stringContaining('ohne Segen'),
      playerBuffs: null,
    })
    expect(resolved.combatStart.enemies).toHaveLength(1)
  })

  it('still offers the altar button after the rules were read', () => {
    const adventure = getDemoAdventure()
    const initialSceneState = createInitialSceneState(adventure)
    const readRules = findInteractionDef(adventure.structure, 'read_trial_rules')
    const afterRules = resolveInteractionOutcome(
      initialSceneState,
      readRules,
      adventure.structure.module,
      'success'
    ).sceneState
    const section = adventure.structure.sections.find(entry => entry.id === 'brass_arena')

    const choices = rebuildVisibleChoices({
      section,
      sceneState: afterRules,
      runtimeModule: true,
    })

    expect(choices.some(choice => choice.label === 'Den Messingaltar beruehren')).toBe(true)
  })
})
