// ─── Runtime Module Tests ───────────────────────────────────────────────────
// Tests for the Birkenhain minimal runtime module:
// parser, interaction resolution, reveal chains, choice generation, clue registry,
// blocksIfFlags lifecycle, engine-truth verification.

import { describe, it, expect } from 'vitest'
import { normalizeAdventureEntry } from '../data/srd.js'
import {
  createInitialSceneState,
  deriveSceneState,
  findInteractionDef,
  applyInteractionSuccess,
  findSectionById,
  buildRelevantAdventureContext,
} from '../data/srd.js'
import { buildAvailableChoices } from '../engine/choiceEngine.js'
import { buildSystemPrompt } from '../services/openrouter.js'

// ── Load the module text ──
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const MODULE_TEXT = readFileSync(resolve(__dirname, '../data/adventures/birkenhain_minimal_runtime_module.txt'), 'utf-8')

function loadModule() {
  return normalizeAdventureEntry({ id: 'test-module', title: 'Birkenhain Test', text: MODULE_TEXT })
}

function msg(role, content) {
  return {
    id: `${role}-${Math.random()}`,
    role,
    content,
    type: 'narrative',
    timestamp: new Date().toISOString(),
  }
}

function makeCharacter() {
  return {
    name: 'Testheld',
    race: 'Mensch',
    class: 'Schurke',
    level: 2,
    currentHP: 14,
    maxHP: 14,
    armorClass: 14,
    proficiencyBonus: 2,
    xp: 0,
    attributes: { str: 10, dex: 16, con: 12, int: 12, wis: 11, cha: 13 },
    skillProficiencies: ['investigation', 'perception'],
    inventory: [],
    currency: { gm: 0, sm: 0, km: 0 },
  }
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

  it('parses sections with interactions including blocksIfFlags', () => {
    const sections = loadModule().structure.sections
    expect(sections.length).toBeGreaterThanOrEqual(3)
    const inn = sections.find(s => s.id === 'inn_common_room')
    expect(inn).toBeDefined()
    expect(inn.interactions.length).toBeGreaterThanOrEqual(1)
    expect(inn.interactions[0].id).toBe('ask_mara_about_tomas')
    expect(inn.interactions[0].blocksIfFlags).toContain('MARA_BEFRAGT')
    expect(inn.exits.length).toBeGreaterThanOrEqual(1)
    expect(inn.visibleFeatures).toContain('Kaminfeuer')
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
    expect(updated.gmState.runtimeObjects.hidden_plate.label).toMatch(/Metallplatte/i)
    expect(updated.gmState.runtimeObjects.hidden_plate.visible).toBe(true)
  })

  it('hidden_plate generates new choices', () => {
    const scene = makeBreweryState({
      gmState: {
        currentSectionId: 'old_brewery',
        plotFlags: { HAS_CELLAR_KEY: true, CELLAR_UNLOCKED: true },
        runtimeObjects: {
          hidden_plate: { id: 'hidden_plate', sectionId: 'old_brewery', label: 'Vibrierende Metallplatte', visible: true, state: 'sealed' },
        },
      },
    })
    const section = findSectionById(structure, 'old_brewery')
    const choices = buildAvailableChoices({ aiResponse: '', section, sceneState: scene, isRuntimeModule: true })
    const plateChoices = choices.filter(c => c.interactionId === 'inspect_hidden_plate' || c.interactionId === 'open_hidden_plate')
    expect(plateChoices.length).toBeGreaterThanOrEqual(1)
    const inspectChoice = choices.find(c => c.interactionId === 'inspect_hidden_plate')
    expect(inspectChoice?.check).toBeNull()
  })

  it('open_hidden_plate reveals parchment_note', () => {
    const scene = makeBreweryState({
      gmState: {
        currentSectionId: 'old_brewery',
        plotFlags: { HAS_CELLAR_KEY: true, CELLAR_UNLOCKED: true },
        runtimeObjects: {
          hidden_plate: { id: 'hidden_plate', sectionId: 'old_brewery', label: 'Vibrierende Metallplatte', visible: true, state: 'sealed' },
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
          hidden_plate: { id: 'hidden_plate', sectionId: 'old_brewery', label: 'Vibrierende Metallplatte', visible: true, state: 'opened' },
          parchment_note: { id: 'parchment_note', sectionId: 'old_brewery', label: 'Gefaltetes Pergament', visible: true, state: 'unread' },
        },
      },
    })
    const section = findSectionById(structure, 'old_brewery')
    const choices = buildAvailableChoices({ aiResponse: '', section, sceneState: scene, isRuntimeModule: true })
    const parchChoices = choices.filter(c => c.interactionId === 'read_parchment_note' || c.interactionId === 'take_parchment_note')
    expect(parchChoices.length).toBeGreaterThanOrEqual(1)
  })
})

// ── 7. Truth firewall — AI narration doesn't create runtime truth ──

describe('truth firewall', () => {
  it('AI text does not create runtime objects or interactions', () => {
    const adv = loadModule()
    const state = createInitialSceneState(adv)
    expect(state.gmState.runtimeObjects).toEqual({})
    expect(state.gmState.runtimeInteractions).toEqual({})
  })

  it('AI narration alone does not reveal runtime clues or objects', () => {
    const adv = loadModule()
    const next = deriveSceneState({
      adventure: adv,
      previousSceneState: createInitialSceneState(adv),
      messages: [
        msg('user', 'Ich schaue mich nur um.'),
        msg('assistant', 'Unter dem Tresen spürst du fast eine vibrierende Metallplatte, und jemand raunt von Tomas und dem goldenen Kessel.'),
      ],
    })

    expect(next.gmState.runtimeObjects).toEqual({})
    expect(next.gmState.revealedClueIds).toEqual([])
    expect(next.playerKnowledge.discoveredClues).toEqual([])
  })
})

// ── 8. Choice priority: runtime-module suppresses AI choices ──

describe('choice priority', () => {
  it('runtime module suppresses AI-parsed choices entirely', () => {
    const adv = loadModule()
    const section = findSectionById(adv.structure, 'inn_common_room')
    const state = createInitialSceneState(adv)
    const choices = buildAvailableChoices({
      aiResponse: '1. Schau dich um\n2. Rede mit dem Wirt',
      section,
      sceneState: state,
      isRuntimeModule: true,
    })
    const aiChoice = choices.find(c => c.source === 'ai')
    expect(aiChoice).toBeUndefined()
    const intrChoice = choices.find(c => c.interactionId)
    expect(intrChoice).toBeDefined()
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

// ── 10. Static choices still work (exits, flag-gated) ──

describe('static choices', () => {
  it('exits are generated (flag-gated)', () => {
    const adv = loadModule()
    const section = findSectionById(adv.structure, 'inn_common_room')
    const stateNoFlag = createInitialSceneState(adv)
    const choicesNoFlag = buildAvailableChoices({ aiResponse: '', section, sceneState: stateNoFlag, isRuntimeModule: true })
    const exitNoFlag = choicesNoFlag.find(c => c.kind === 'exit' && /Hinterflur/i.test(c.label))
    expect(exitNoFlag).toBeUndefined()

    const stateWithFlag = {
      ...stateNoFlag,
      gmState: { ...stateNoFlag.gmState, plotFlags: { HAS_CELLAR_KEY: true } },
    }
    const choicesWithFlag = buildAvailableChoices({ aiResponse: '', section, sceneState: stateWithFlag, isRuntimeModule: true })
    const exitWithFlag = choicesWithFlag.find(c => c.kind === 'exit' && /Hinterflur/i.test(c.label))
    expect(exitWithFlag).toBeDefined()
  })
})

describe('npc visibility', () => {
  it('talk choices come from the active runtime section, not from free narration', () => {
    const adv = loadModule()
    const innSection = findSectionById(adv.structure, 'inn_common_room')
    const innState = createInitialSceneState(adv)
    const innChoices = buildAvailableChoices({ aiResponse: '', section: innSection, sceneState: innState, isRuntimeModule: true })
    expect(innChoices.some(c => /Mara/i.test(c.label))).toBe(true)
    expect(innChoices.some(c => c.label === 'Mit Mara Birken sprechen')).toBe(false)
    expect(innChoices.some(c => /Mit Tomas sprechen/i.test(c.label))).toBe(false)

    const hideoutSection = findSectionById(adv.structure, 'tomas_hideout')
    const hideoutState = {
      ...innState,
      gmState: {
        ...innState.gmState,
        currentSectionId: 'tomas_hideout',
      },
    }
    const hideoutChoices = buildAvailableChoices({ aiResponse: '', section: hideoutSection, sceneState: hideoutState, isRuntimeModule: true })
    expect(hideoutChoices.some(c => /Tomas/i.test(c.label))).toBe(true)
    expect(hideoutChoices.some(c => c.label === 'Mit Tomas sprechen')).toBe(false)
    expect(hideoutChoices.some(c => /Mara/i.test(c.label))).toBe(false)
  })
})

describe('runtime context', () => {
  it('adventure context exposes only visible runtime state and allowed interactions', () => {
    const adv = loadModule()
    const state = createInitialSceneState(adv)
    const context = buildRelevantAdventureContext({ adventure: adv, sceneState: state, messages: [] })

    expect(context.runtimeModule).toBe(true)
    expect(context.text).toContain('ANWESENDE NPCS')
    expect(context.text).toContain('Mara Birken')
    expect(context.text).toContain('ERLAUBTE INTERAKTIONEN')
    expect(context.text).toContain('Mara ruhig nach Tomas fragen')
    expect(context.text).not.toContain('Mit Tomas sprechen')
    expect(context.text).not.toContain('NÄCHSTE SZENEN')
    expect(context.text).not.toContain('Vibrierende Metallplatte')
  })
})

describe('runtime prompt mode', () => {
  it('uses strict runtime-module prompt instructions without spoiler context', () => {
    const adv = loadModule()
    const state = createInitialSceneState(adv)
    const prompt = buildSystemPrompt(makeCharacter(), adv, [], null, state)

    expect(prompt).toContain('Strukturiertes Modul (STRENG)')
    expect(prompt).toContain('Generiere KEINE nummerierten Optionslisten')
    expect(prompt).toContain('ERLAUBTE INTERAKTIONEN')
    expect(prompt).not.toContain('NÄCHSTE SZENEN')
    expect(prompt).not.toContain('Vibrierende Metallplatte')
  })
})

// ── 11. blocksIfFlags — consumed interactions disappear ──

describe('blocksIfFlags lifecycle', () => {
  it('interaction is hidden after its blocksIfFlags flag is set', () => {
    const adv = loadModule()
    const section = findSectionById(adv.structure, 'inn_common_room')

    // Before: MARA_BEFRAGT not set → interaction visible
    const stateBefore = createInitialSceneState(adv)
    const choicesBefore = buildAvailableChoices({ aiResponse: '', section, sceneState: stateBefore, isRuntimeModule: true })
    const maraBefore = choicesBefore.find(c => c.interactionId === 'ask_mara_about_tomas')
    expect(maraBefore).toBeDefined()

    // After: MARA_BEFRAGT set → interaction hidden
    const stateAfter = {
      ...stateBefore,
      gmState: { ...stateBefore.gmState, plotFlags: { MARA_BEFRAGT: true, HAS_CELLAR_KEY: true } },
    }
    const choicesAfter = buildAvailableChoices({ aiResponse: '', section, sceneState: stateAfter, isRuntimeModule: true })
    const maraAfter = choicesAfter.find(c => c.interactionId === 'ask_mara_about_tomas')
    expect(maraAfter).toBeUndefined()
  })

  it('consumed brewery reveal-chain interactions stay hidden across derived runtime turns', () => {
    const adv = loadModule()
    const structure = adv.structure
    const section = findSectionById(structure, 'old_brewery')

    const makeBreweryState = () => {
      const base = createInitialSceneState(adv)
      return {
        ...base,
        gmState: {
          ...base.gmState,
          currentSectionId: 'old_brewery',
          plotFlags: { HAS_CELLAR_KEY: true, CELLAR_UNLOCKED: true },
        },
      }
    }

    const applyTurn = (state, interactionId) => {
      const intr = findInteractionDef(structure, interactionId)
      const updated = applyInteractionSuccess(state, intr, structure.module)
      return deriveSceneState({
        adventure: adv,
        previousSceneState: updated,
        messages: [
          msg('user', intr.label),
          msg('assistant', intr.aiNarrationHint || ''),
        ],
        fallbackUserText: intr.label,
        fallbackUserActionKey: `intr:${interactionId}`,
      })
    }

    let state = makeBreweryState()

    state = applyTurn(state, 'inspect_counter')
    let choices = buildAvailableChoices({ aiResponse: '', section, sceneState: state, isRuntimeModule: true })
    expect(choices.some(c => c.interactionId === 'inspect_counter')).toBe(false)
    expect(choices.some(c => c.interactionId === 'inspect_hidden_plate')).toBe(true)
    expect(choices.some(c => c.interactionId === 'open_hidden_plate')).toBe(true)

    state = applyTurn(state, 'inspect_hidden_plate')
    expect(state.gmState.plotFlags.HIDDEN_PLATE_INSPECTED).toBe(true)
    choices = buildAvailableChoices({ aiResponse: '', section, sceneState: state, isRuntimeModule: true })
    expect(choices.some(c => c.interactionId === 'inspect_hidden_plate')).toBe(false)
    expect(choices.some(c => c.interactionId === 'open_hidden_plate')).toBe(true)

    state = applyTurn(state, 'open_hidden_plate')
    choices = buildAvailableChoices({ aiResponse: '', section, sceneState: state, isRuntimeModule: true })
    expect(choices.some(c => c.interactionId === 'open_hidden_plate')).toBe(false)
    expect(choices.some(c => c.interactionId === 'read_parchment_note')).toBe(true)
    expect(choices.some(c => c.interactionId === 'take_parchment_note')).toBe(true)

    state = applyTurn(state, 'read_parchment_note')
    choices = buildAvailableChoices({ aiResponse: '', section, sceneState: state, isRuntimeModule: true })
    expect(choices.some(c => c.interactionId === 'read_parchment_note')).toBe(false)
    expect(choices.some(c => c.interactionId === 'take_parchment_note')).toBe(true)

    state = applyTurn(state, 'take_parchment_note')
    choices = buildAvailableChoices({ aiResponse: '', section, sceneState: state, isRuntimeModule: true })
    expect(choices.some(c => c.interactionId === 'inspect_counter')).toBe(false)
    expect(choices.some(c => c.interactionId === 'inspect_hidden_plate')).toBe(false)
    expect(choices.some(c => c.interactionId === 'open_hidden_plate')).toBe(false)
    expect(choices.some(c => c.interactionId === 'read_parchment_note')).toBe(false)
    expect(choices.some(c => c.interactionId === 'take_parchment_note')).toBe(false)
  })
})
