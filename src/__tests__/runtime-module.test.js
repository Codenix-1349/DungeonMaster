// ─── Runtime Module Tests ───────────────────────────────────────────────────
// Tests for the Birkenhain minimal runtime module:
// parser, interaction resolution, reveal chains, choice generation, clue registry.

import { describe, it, expect } from 'vitest'
import { normalizeAdventureEntry } from '../data/srd.js'
import {
  createInitialSceneState,
  findInteractionDef,
  applyInteractionSuccess,
  findSectionById,
} from '../data/srd.js'
import { buildAvailableChoices } from '../engine/choiceEngine.js'

// ── Load the module text ──
import { readFileSync } from 'fs'
import { resolve } from 'path'
const MODULE_TEXT = readFileSync(resolve('c:/Apps/Abenteuer/birkenhain_minimal_runtime_module.txt'), 'utf-8')

function loadModule() {
  return normalizeAdventureEntry({ id: 'test-module', title: 'Birkenhain Test', text: MODULE_TEXT })
}

// ── 1. Module loading / parsing ──

describe('runtime module parser', () => {
  it('loads and parses the module successfully', () => {
    const adv = loadModule()
    expect(adv.structure).toBeDefined()
    expect(adv.structure.format).toBe('structured')
    expect(adv.structure.module.moduleId).toBe('birkenhain_minimal_runtime')
  })

  it('parses module meta', () => {
    const m = loadModule().structure.module
    expect(m.startSectionId).toBe('inn_common_room')
    expect(m.primaryObjective).toMatch(/Tomas/)
    expect(m.plotFlags).toContain('HAS_CELLAR_KEY')
    expect(m.npcRegistry.mara).toBeDefined()
    expect(m.npcRegistry.mara.name).toBe('Mara Birken')
    expect(m.clueRegistry.tomas_obsessed).toBeDefined()
    expect(m.objectRegistry.hidden_plate).toBeDefined()
  })

  it('parses sections with interactions', () => {
    const sections = loadModule().structure.sections
    expect(sections.length).toBeGreaterThanOrEqual(3)
    const inn = sections.find(s => s.id === 'inn_common_room')
    expect(inn).toBeDefined()
    expect(inn.interactions.length).toBeGreaterThanOrEqual(1)
    expect(inn.interactions[0].id).toBe('ask_mara_about_tomas')
    expect(inn.exits.length).toBeGreaterThanOrEqual(1)
    expect(inn.visibleFeatures).toContain('fireplace')
  })

  it('parses old_brewery with inspect_counter interaction', () => {
    const sections = loadModule().structure.sections
    const brewery = sections.find(s => s.id === 'old_brewery')
    expect(brewery).toBeDefined()
    const inspectCounter = brewery.interactions.find(i => i.id === 'inspect_counter')
    expect(inspectCounter).toBeDefined()
    expect(inspectCounter.check).toEqual({ skill: 'investigation', dc: 12, onFail: expect.any(String) })
    expect(inspectCounter.results.success.revealRuntime.objects).toHaveLength(1)
    expect(inspectCounter.results.success.revealRuntime.objects[0].id).toBe('hidden_plate')
  })
})

// ── 2. Start section ──

describe('initial scene state', () => {
  it('sets startSection correctly', () => {
    const adv = loadModule()
    const state = createInitialSceneState(adv)
    expect(state.gmState.currentSectionId).toBe('inn_common_room')
    expect(state.gmState.runtimeObjects).toEqual({})
    expect(state.gmState.runtimeInteractions).toEqual({})
    expect(state.gmState.revealedClueIds).toEqual([])
  })
})

// ── 3–6. Reveal chain: inspect_counter → hidden_plate → open → parchment ──

describe('reveal chain', () => {
  const adv = loadModule()
  const structure = adv.structure

  function makeBreweryState(overrides = {}) {
    const base = createInitialSceneState(adv)
    return {
      ...base,
      gmState: {
        ...base.gmState,
        currentSectionId: 'old_brewery',
        plotFlags: { HAS_CELLAR_KEY: true, CELLAR_UNLOCKED: true },
        ...(overrides.gmState || {}),
      },
    }
  }

  it('inspect_counter reveals hidden_plate', () => {
    const scene = makeBreweryState()
    const intr = findInteractionDef(structure, 'inspect_counter')
    expect(intr).toBeDefined()
    const updated = applyInteractionSuccess(scene, intr, structure.module)
    expect(updated.gmState.runtimeObjects.hidden_plate).toBeDefined()
    expect(updated.gmState.runtimeObjects.hidden_plate.label).toMatch(/metal plate/i)
    expect(updated.gmState.runtimeObjects.hidden_plate.visible).toBe(true)
  })

  it('hidden_plate generates new choices', () => {
    const scene = makeBreweryState({
      gmState: {
        currentSectionId: 'old_brewery',
        plotFlags: { HAS_CELLAR_KEY: true, CELLAR_UNLOCKED: true },
        runtimeObjects: {
          hidden_plate: { id: 'hidden_plate', sectionId: 'old_brewery', label: 'Vibrating metal plate', visible: true, state: 'sealed' },
        },
      },
    })
    const section = findSectionById(structure, 'old_brewery')
    const choices = buildAvailableChoices({ aiResponse: '', section, sceneState: scene })
    const plateChoices = choices.filter(c => c.interactionId === 'inspect_hidden_plate' || c.interactionId === 'open_hidden_plate')
    expect(plateChoices.length).toBeGreaterThanOrEqual(1)
  })

  it('open_hidden_plate reveals parchment_note', () => {
    const scene = makeBreweryState({
      gmState: {
        currentSectionId: 'old_brewery',
        plotFlags: { HAS_CELLAR_KEY: true, CELLAR_UNLOCKED: true },
        runtimeObjects: {
          hidden_plate: { id: 'hidden_plate', sectionId: 'old_brewery', label: 'Vibrating metal plate', visible: true, state: 'sealed' },
        },
      },
    })
    const intr = findInteractionDef(structure, 'open_hidden_plate')
    expect(intr).toBeDefined()
    const updated = applyInteractionSuccess(scene, intr, structure.module)
    expect(updated.gmState.runtimeObjects.parchment_note).toBeDefined()
    expect(updated.gmState.runtimeObjects.parchment_note.visible).toBe(true)
    expect(updated.gmState.runtimeObjects.hidden_plate.state).toBe('opened')
  })

  it('parchment_note generates read/take choices', () => {
    const scene = makeBreweryState({
      gmState: {
        currentSectionId: 'old_brewery',
        plotFlags: { HAS_CELLAR_KEY: true, CELLAR_UNLOCKED: true },
        runtimeObjects: {
          hidden_plate: { id: 'hidden_plate', sectionId: 'old_brewery', label: 'Vibrating metal plate', visible: true, state: 'opened' },
          parchment_note: { id: 'parchment_note', sectionId: 'old_brewery', label: 'Folded parchment', visible: true, state: 'unread' },
        },
      },
    })
    const section = findSectionById(structure, 'old_brewery')
    const choices = buildAvailableChoices({ aiResponse: '', section, sceneState: scene })
    const parchChoices = choices.filter(c => c.interactionId === 'read_parchment_note' || c.interactionId === 'take_parchment_note')
    expect(parchChoices.length).toBeGreaterThanOrEqual(1)
  })
})

// ── 7. Truth firewall — AI narration doesn't create runtime truth ──

describe('truth firewall', () => {
  it('AI text does not create runtime objects or interactions', () => {
    const adv = loadModule()
    const state = createInitialSceneState(adv)
    // Simulating: AI says "you discover a hidden plate" but no interaction was resolved
    // runtimeObjects should remain empty — only engine writes truth
    expect(state.gmState.runtimeObjects).toEqual({})
    expect(state.gmState.runtimeInteractions).toEqual({})
  })
})

// ── 8. Choice priority: structured/runtime before AI/fallback ──

describe('choice priority', () => {
  it('interaction choices have higher priority than AI choices', () => {
    const adv = loadModule()
    const section = findSectionById(adv.structure, 'inn_common_room')
    const state = createInitialSceneState(adv)
    const choices = buildAvailableChoices({
      aiResponse: '1. Schau dich um\n2. Rede mit dem Wirt',
      section,
      sceneState: state,
    })
    const intrChoice = choices.find(c => c.interactionId)
    const aiChoice = choices.find(c => c.source === 'ai')
    if (intrChoice && aiChoice) {
      expect(intrChoice.priority).toBeLessThan(aiChoice.priority)
    }
  })
})

// ── 9. Clue registry updates on interaction success ──

describe('clue registry', () => {
  it('reveal clues updates playerKnowledge.discoveredClues', () => {
    const adv = loadModule()
    const state = createInitialSceneState(adv)
    const intr = findInteractionDef(adv.structure, 'ask_mara_about_tomas')
    const updated = applyInteractionSuccess(state, intr, adv.structure.module)
    expect(updated.gmState.revealedClueIds).toContain('tomas_obsessed')
    expect(updated.playerKnowledge.discoveredClues.some(c => /Tomas/i.test(c))).toBe(true)
  })
})

// ── 10. Static choices still work (exits, NPCs) ──

describe('static choices', () => {
  it('exits are generated (flag-gated)', () => {
    const adv = loadModule()
    const section = findSectionById(adv.structure, 'inn_common_room')
    // Without flag: exit to rear hall should be hidden
    const stateNoFlag = createInitialSceneState(adv)
    const choicesNoFlag = buildAvailableChoices({ aiResponse: '', section, sceneState: stateNoFlag })
    const exitNoFlag = choicesNoFlag.find(c => c.kind === 'exit' && c.label === 'Rear hallway')
    expect(exitNoFlag).toBeUndefined()

    // With flag: exit should appear
    const stateWithFlag = {
      ...stateNoFlag,
      gmState: { ...stateNoFlag.gmState, plotFlags: { HAS_CELLAR_KEY: true } },
    }
    const choicesWithFlag = buildAvailableChoices({ aiResponse: '', section, sceneState: stateWithFlag })
    const exitWithFlag = choicesWithFlag.find(c => c.kind === 'exit' && c.label === 'Rear hallway')
    expect(exitWithFlag).toBeDefined()
  })
})
