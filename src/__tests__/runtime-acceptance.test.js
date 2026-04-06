import { describe, expect, it } from 'vitest'
import { normalizeAdventureEntry } from '../data/srd.js'
import {
  applyInteractionSuccess,
  createInitialSceneState,
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
const MODULE_TEXT = readFileSync(resolve(__dirname, '../data/adventures/birkenhain_minimal_runtime_module.txt'), 'utf-8')

function loadModule() {
  return normalizeAdventureEntry({ id: 'runtime-acceptance', title: 'Birkenhain Test', text: MODULE_TEXT })
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

function makeBreweryState(adventure, overrides = {}) {
  const base = createInitialSceneState(adventure)
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

describe('runtime acceptance matrix', () => {
  const adventure = loadModule()
  const structure = adventure.structure
  const askMaraLabel = findInteractionDef(structure, 'ask_mara_about_tomas').label
  const inspectCounterLabel = findInteractionDef(structure, 'inspect_counter').label
  const inspectHiddenPlateLabel = findInteractionDef(structure, 'inspect_hidden_plate').label
  const openHiddenPlateLabel = findInteractionDef(structure, 'open_hidden_plate').label
  const readParchmentLabel = findInteractionDef(structure, 'read_parchment_note').label
  const takeParchmentLabel = findInteractionDef(structure, 'take_parchment_note').label
  const rearHallExitLabel = findSectionById(structure, 'inn_common_room').exits.find(exit => exit.id === 'to_rear_hall').label
  const hiddenPlateLabel = 'Vibrierende Metallplatte'
  const parchmentLabel = 'Gefaltetes Pergament'

  it('keeps the start scene aligned across choices, context, and prompt', () => {
    const surfaces = collectRuntimeSurfaces(adventure, createInitialSceneState(adventure))

    expectChoiceLabelsContain(surfaces, [askMaraLabel])
    expectChoiceLabelsOmit(surfaces, [rearHallExitLabel])
    expectContextAndPromptContain(surfaces, [askMaraLabel])
    expectContextAndPromptContain(surfaces, [
      'Sprich mit Mara und finde heraus, was geschehen ist.',
      'Der Gastraum ist warm vom Kaminfeuer',
      'Finde den Vermissten lebend.',
    ])
    expectContextAndPromptOmit(surfaces, [rearHallExitLabel, hiddenPlateLabel, parchmentLabel, 'Tomas'])
  })

  it('keeps unlocked exits and consumed interactions aligned after talking to Mara', () => {
    const state = applyInteractionSuccess(
      createInitialSceneState(adventure),
      findInteractionDef(structure, 'ask_mara_about_tomas'),
      structure.module
    )
    const surfaces = collectRuntimeSurfaces(adventure, state)

    expectChoiceLabelsContain(surfaces, [rearHallExitLabel])
    expectChoiceLabelsOmit(surfaces, [askMaraLabel])
    expectContextAndPromptContain(surfaces, [rearHallExitLabel])
    expectContextAndPromptContain(surfaces, ['Tomas'])
    expectContextAndPromptOmit(surfaces, [askMaraLabel, hiddenPlateLabel, parchmentLabel])
  })

  it('keeps hidden brewery objects and interactions sealed before reveal', () => {
    const surfaces = collectRuntimeSurfaces(adventure, makeBreweryState(adventure))

    expectChoiceLabelsContain(surfaces, [inspectCounterLabel])
    expectChoiceLabelsOmit(surfaces, [
      inspectHiddenPlateLabel,
      openHiddenPlateLabel,
      readParchmentLabel,
      takeParchmentLabel,
    ])
    expectContextAndPromptContain(surfaces, [inspectCounterLabel])
    expectContextAndPromptOmit(surfaces, [hiddenPlateLabel, parchmentLabel, inspectHiddenPlateLabel, openHiddenPlateLabel, readParchmentLabel, takeParchmentLabel])
  })

  it('keeps revealed plate state aligned across all runtime surfaces', () => {
    const state = applyInteractionSuccess(
      makeBreweryState(adventure),
      findInteractionDef(structure, 'inspect_counter'),
      structure.module
    )
    const surfaces = collectRuntimeSurfaces(adventure, state)

    expectChoiceLabelsContain(surfaces, [inspectHiddenPlateLabel, openHiddenPlateLabel])
    expectChoiceLabelsOmit(surfaces, [parchmentLabel, readParchmentLabel, takeParchmentLabel, hiddenPlateLabel])
    expectContextAndPromptContain(surfaces, [hiddenPlateLabel, inspectHiddenPlateLabel, openHiddenPlateLabel])
    expectContextAndPromptOmit(surfaces, [parchmentLabel, readParchmentLabel, takeParchmentLabel])
  })

  it('keeps taken parchment hidden across choices, context, and prompt', () => {
    const afterInspect = applyInteractionSuccess(
      makeBreweryState(adventure),
      findInteractionDef(structure, 'inspect_counter'),
      structure.module
    )
    const afterOpen = applyInteractionSuccess(
      afterInspect,
      findInteractionDef(structure, 'open_hidden_plate'),
      structure.module
    )
    const afterTake = resolveInteractionOutcome(
      afterOpen,
      findInteractionDef(structure, 'take_parchment_note'),
      structure.module,
      'success'
    ).sceneState
    const surfaces = collectRuntimeSurfaces(adventure, afterTake)

    expectChoiceLabelsOmit(surfaces, [parchmentLabel, readParchmentLabel, takeParchmentLabel, openHiddenPlateLabel, hiddenPlateLabel])
    expectContextAndPromptContain(surfaces, [hiddenPlateLabel])
    expectContextAndPromptOmit(surfaces, [parchmentLabel, readParchmentLabel, takeParchmentLabel, openHiddenPlateLabel])
  })
})
