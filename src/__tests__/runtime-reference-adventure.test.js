import { describe, expect, it } from 'vitest'
import { normalizeAdventureEntry } from '../data/srd.js'
import {
  applyInteractionSuccess,
  createInitialSceneState,
  deriveSceneState,
  findInteractionDef,
  findSectionById,
  buildRelevantAdventureContext,
  resolveInteractionOutcome,
} from '../data/srd.js'
import { buildAvailableChoices } from '../engine/choiceEngine.js'
import { buildSystemPrompt } from '../services/openrouter.js'

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const MODULE_TEXT = readFileSync(resolve(__dirname, '../data/adventures/graufurt_reference_runtime_module.txt'), 'utf-8')

function loadModule() {
  return normalizeAdventureEntry({ id: 'graufurt-reference', title: 'Graufurt Referenz', text: MODULE_TEXT })
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
    skillProficiencies: ['investigation', 'athletics', 'persuasion'],
    inventory: [],
    currency: { gm: 0, sm: 0, km: 0 },
  }
}

function makeState(adventure, sectionId, plotFlags = {}) {
  const base = createInitialSceneState(adventure)
  return {
    ...base,
    gmState: {
      ...base.gmState,
      currentSectionId: sectionId,
      plotFlags: { ...(base.gmState?.plotFlags || {}), ...plotFlags },
    },
  }
}

function collectRuntimeSurfaces(adventure, sceneState) {
  const section = findSectionById(adventure.structure, sceneState?.gmState?.currentSectionId)
  const choices = buildAvailableChoices({
    aiResponse: '',
    section,
    sceneState,
    isRuntimeModule: true,
  })
  const context = buildRelevantAdventureContext({ adventure, sceneState, messages: [] })
  const prompt = buildSystemPrompt(makeCharacter(), adventure, [], null, sceneState)

  return {
    choiceLabels: choices.map(choice => choice.label),
    contextText: context.text,
    promptText: prompt,
  }
}

function expectChoiceLabelsContain(surfaces, labels) {
  for (const label of labels) {
    expect(surfaces.choiceLabels).toContain(label)
  }
}

function expectChoiceLabelsOmit(surfaces, labels) {
  for (const label of labels) {
    expect(surfaces.choiceLabels).not.toContain(label)
  }
}

function expectContextAndPromptContain(surfaces, labels) {
  for (const label of labels) {
    expect(surfaces.contextText).toContain(label)
    expect(surfaces.promptText).toContain(label)
  }
}

function expectContextAndPromptOmit(surfaces, labels) {
  for (const label of labels) {
    expect(surfaces.contextText).not.toContain(label)
    expect(surfaces.promptText).not.toContain(label)
  }
}

describe('runtime reference module', () => {
  const adventure = loadModule()
  const structure = adventure.structure
  const askElsaLabel = findInteractionDef(structure, 'ask_elsa_about_lockdown').label
  const askLenoLabel = findInteractionDef(structure, 'ask_leno_about_mira').label
  const askElsaOpenLabel = findInteractionDef(structure, 'ask_elsa_to_open_stacks').label
  const inspectDeskLabel = findInteractionDef(structure, 'inspect_clerk_desk').label
  const openDrawerLabel = findInteractionDef(structure, 'open_service_drawer').label
  const readMapLabel = findInteractionDef(structure, 'read_service_map').label
  const crossGalleryLabel = findInteractionDef(structure, 'cross_broken_catwalk').label
  const inspectRackLabel = findInteractionDef(structure, 'inspect_maintenance_rack').label
  const takeHookLabel = findInteractionDef(structure, 'take_grappling_hook').label
  const containResonanceLabel = findInteractionDef(structure, 'contain_resonance').label
  const retreatWithMiraLabel = findInteractionDef(structure, 'retreat_with_mira').label

  it('parses as a fully-authored runtime module without validation warnings', () => {
    expect(structure.module.startSectionId).toBe('archive_foyer')
    expect(structure.module.playerPrimaryObjective).toBe('Finde die Vermisste und bringe Ordnung in das Archiv.')
    expect(structure.sections).toHaveLength(6)
    expect(structure.module.validationWarnings).toEqual([])
  })

  it('keeps the start scene aligned across choices, context, and prompt', () => {
    const surfaces = collectRuntimeSurfaces(adventure, createInitialSceneState(adventure))

    expectChoiceLabelsContain(surfaces, [askElsaLabel, askLenoLabel])
    expectChoiceLabelsOmit(surfaces, [askElsaOpenLabel, 'Ins abgesperrte Magazin gehen'])
    expectContextAndPromptContain(surfaces, [
      'Elsa Dorn',
      'Leno Falk',
      'Sprich mit Elsa und Leno und finde einen Weg in die Magazine.',
      'Finde die Vermisste und bringe Ordnung in das Archiv.',
    ])
    expectContextAndPromptOmit(surfaces, ['Mira Sen', 'Mit Mira tiefer zum Flutschacht gehen', containResonanceLabel])
  })

  it('derives the active runtime NPC from the chosen authored talk interaction in a two-npc scene', () => {
    const initial = createInitialSceneState(adventure)

    const afterElsa = deriveSceneState({
      adventure,
      previousSceneState: initial,
      messages: [
        msg('user', askElsaLabel),
        msg('assistant', 'Elsa antwortet knapp, waehrend Leno unruhig zum Gitter blickt.'),
      ],
      fallbackUserText: askElsaLabel,
      fallbackUserActionKey: 'intr:ask_elsa_about_lockdown',
    })

    const afterLeno = deriveSceneState({
      adventure,
      previousSceneState: initial,
      messages: [
        msg('user', askLenoLabel),
        msg('assistant', 'Leno senkt die Stimme, waehrend Elsa daneben schweigt.'),
      ],
      fallbackUserText: askLenoLabel,
      fallbackUserActionKey: 'intr:ask_leno_about_mira',
    })

    expect(afterElsa.dialogueState.activeNpcId).toBe('elsa')
    expect(afterLeno.dialogueState.activeNpcId).toBe('leno')
  })

  it('hides authored talk actions for NPCs that have withdrawn after an engine-owned escalation', () => {
    const state = makeState(adventure, 'archive_foyer')
    state.dialogueState = {
      activeNpcId: 'elsa',
      npcRelations: {
        ...state.dialogueState.npcRelations,
        elsa: {
          disposition: 'hostile',
          suspicion: 4,
          threat: 2,
          warningsIssued: 2,
          engagementState: 'withdrawn',
          lastTopic: 'Beleidigung',
        },
      },
    }

    const surfaces = collectRuntimeSurfaces(adventure, state)

    expectChoiceLabelsOmit(surfaces, [askElsaLabel, askElsaOpenLabel])
    expectChoiceLabelsContain(surfaces, [askLenoLabel])
    expectContextAndPromptOmit(surfaces, [askElsaLabel, askElsaOpenLabel])
    expectContextAndPromptContain(surfaces, ['Elsa Dorn'])
    expect(surfaces.promptText).toContain('Status: withdrawn')
  })

  it('keeps the sealed-stacks reveal chain aligned across choices, context, and prompt', () => {
    const stacksState = makeState(adventure, 'sealed_stacks', { STACKS_OPEN: true })
    const before = collectRuntimeSurfaces(adventure, stacksState)

    expectChoiceLabelsContain(before, [inspectDeskLabel])
    expectChoiceLabelsOmit(before, [openDrawerLabel, readMapLabel, 'Versteckte Schublade im Schreiberpult'])
    expectContextAndPromptOmit(before, ['Versteckte Schublade im Schreiberpult', 'Gefaltete Servicekarte aus der Schublade', readMapLabel])

    const afterInspect = applyInteractionSuccess(
      stacksState,
      findInteractionDef(structure, 'inspect_clerk_desk'),
      structure.module
    )
    const afterInspectSurfaces = collectRuntimeSurfaces(adventure, afterInspect)
    expectChoiceLabelsContain(afterInspectSurfaces, [openDrawerLabel])
    expectChoiceLabelsOmit(afterInspectSurfaces, [readMapLabel])
    expectContextAndPromptContain(afterInspectSurfaces, ['Versteckte Schublade im Schreiberpult', openDrawerLabel])
    expectContextAndPromptOmit(afterInspectSurfaces, ['Gefaltete Servicekarte aus der Schublade', readMapLabel])

    const afterOpen = applyInteractionSuccess(
      afterInspect,
      findInteractionDef(structure, 'open_service_drawer'),
      structure.module
    )
    const afterOpenSurfaces = collectRuntimeSurfaces(adventure, afterOpen)
    expectChoiceLabelsContain(afterOpenSurfaces, [readMapLabel])
    expectContextAndPromptContain(afterOpenSurfaces, ['Gefaltete Servicekarte aus der Schublade', readMapLabel])
  })

  it('allows a failed gallery check to reappear after the player gains a new tool', () => {
    const galleryState = makeState(adventure, 'collapsed_gallery')
    const gallerySection = findSectionById(structure, 'collapsed_gallery')
    const afterInspectRack = applyInteractionSuccess(
      galleryState,
      findInteractionDef(structure, 'inspect_maintenance_rack'),
      structure.module
    )

    const failedOutcome = resolveInteractionOutcome(
      afterInspectRack,
      findInteractionDef(structure, 'cross_broken_catwalk'),
      structure.module,
      'failure'
    ).sceneState

    const failedState = {
      ...failedOutcome,
      interactionHistory: [{
        id: 'fail-catwalk',
        sectionId: 'collapsed_gallery',
        targetId: 'catwalk',
        skill: 'athletics',
        outcome: 'failure',
        turn: failedOutcome.turnCount || 0,
        label: crossGalleryLabel,
        kind: 'move',
        contextSnapshot: {
          clueCount: failedOutcome.playerKnowledge?.discoveredClues?.length || 0,
          npcCount: failedOutcome.playerKnowledge?.knownNpcs?.length || 0,
          itemCount: 0,
        },
      }],
      _currentItemCount: 0,
    }

    const choicesWhileBlocked = buildAvailableChoices({
      aiResponse: '',
      section: gallerySection,
      sceneState: failedState,
      isRuntimeModule: true,
    })

    expect(failedState.gmState.plotFlags.CATWALK_SLIPPED).toBe(true)
    expect(choicesWhileBlocked.some(choice => choice.label === crossGalleryLabel)).toBe(false)
    expect(choicesWhileBlocked.some(choice => choice.label === takeHookLabel)).toBe(true)
    expect(choicesWhileBlocked.some(choice => choice.label === inspectRackLabel)).toBe(false)

    const afterTake = resolveInteractionOutcome(
      failedState,
      findInteractionDef(structure, 'take_grappling_hook'),
      structure.module,
      'success'
    ).sceneState

    const choicesAfterTool = buildAvailableChoices({
      aiResponse: '',
      section: gallerySection,
      sceneState: { ...afterTake, _currentItemCount: 1 },
      isRuntimeModule: true,
    })

    expect(choicesAfterTool.some(choice => choice.label === crossGalleryLabel)).toBe(true)
    expect(choicesAfterTool.some(choice => choice.label === takeHookLabel)).toBe(false)
  })

  it('keeps final chamber options gated by authored runtime truth', () => {
    const finalBase = makeState(adventure, 'bell_scriptorium', { MIRA_ESCORTING: true })
    const before = collectRuntimeSurfaces(adventure, finalBase)

    expectChoiceLabelsContain(before, [retreatWithMiraLabel])
    expectChoiceLabelsOmit(before, [containResonanceLabel])
    expectContextAndPromptContain(before, ['Mira Sen'])
    expectContextAndPromptOmit(before, [containResonanceLabel])

    const after = collectRuntimeSurfaces(adventure, makeState(adventure, 'bell_scriptorium', {
      MIRA_ESCORTING: true,
      MIRA_TRUSTS: true,
      BELL_MECHANISM_UNDERSTOOD: true,
      SEAL_TAKEN: true,
    }))

    expectChoiceLabelsContain(after, [retreatWithMiraLabel, containResonanceLabel])
    expectContextAndPromptContain(after, [containResonanceLabel, retreatWithMiraLabel])
  })
})
