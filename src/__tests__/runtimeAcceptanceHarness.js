import { expect } from 'vitest'
import { normalizeAdventureEntry } from '../data/srd.js'
import {
  createInitialSceneState,
  findSectionById,
  buildRelevantAdventureContext,
} from '../data/srd.js'
import { getAllowedRuntimeInteractions, getAllowedSectionExits } from '../data/runtimeModule.js'
import { buildAvailableChoices } from '../engine/choiceEngine.js'
import { buildSystemPrompt } from '../services/openrouter.js'

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function loadRuntimeModuleFixture(filename, id, title) {
  const text = readFileSync(resolve(__dirname, `../data/adventures/${filename}`), 'utf-8')
  return normalizeAdventureEntry({ id, title, text })
}

export function makeRuntimeTestCharacter(skillProficiencies = ['investigation', 'perception', 'athletics', 'persuasion']) {
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
    skillProficiencies,
    inventory: [],
    currency: { gm: 0, sm: 0, km: 0 },
  }
}

export function collectRuntimeSurfaces(adventure, sceneState, character = makeRuntimeTestCharacter()) {
  const section = findSectionById(adventure.structure, sceneState?.gmState?.currentSectionId)
  const choices = buildAvailableChoices({
    aiResponse: '',
    section,
    sceneState,
    isRuntimeModule: true,
  })
  const context = buildRelevantAdventureContext({ adventure, sceneState, messages: [] })
  const prompt = buildSystemPrompt(character, adventure, [], null, sceneState)

  return {
    section,
    choices,
    choiceLabels: choices.map(choice => choice.label),
    contextText: context.text,
    promptText: prompt,
  }
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))]
}

function sorted(values = []) {
  return [...values].sort((a, b) => a.localeCompare(b, 'de'))
}

function expectTextContainsAll(text, labels = []) {
  for (const label of labels) {
    expect(text).toContain(label)
  }
}

function expectTextOmitsAll(text, labels = []) {
  for (const label of labels) {
    expect(text).not.toContain(label)
  }
}

function collectCurrentSectionRevealLabels(section, sceneState) {
  const visibleObjectIds = new Set(
    Object.entries(sceneState?.gmState?.runtimeObjects || {})
      .filter(([, object]) => object?.visible && (!object.sectionId || object.sectionId === section.id))
      .map(([objectId]) => objectId)
  )
  const visibleInteractionIds = new Set(
    Object.entries(sceneState?.gmState?.runtimeInteractions || {})
      .filter(([, interaction]) => interaction?.visible && (!interaction.sectionId || interaction.sectionId === section.id))
      .map(([interactionId]) => interactionId)
  )

  const hiddenObjectLabels = []
  const hiddenInteractionLabels = []

  for (const interaction of section.interactions || []) {
    for (const result of Object.values(interaction.results || {})) {
      for (const object of result?.revealRuntime?.objects || []) {
        if ((object.sectionId || section.id) !== section.id) continue
        if (visibleObjectIds.has(object.id)) continue
        hiddenObjectLabels.push(object.label)
      }
      for (const revealedInteraction of result?.revealRuntime?.interactions || []) {
        if ((revealedInteraction.sectionId || section.id) !== section.id) continue
        if (visibleInteractionIds.has(revealedInteraction.id)) continue
        hiddenInteractionLabels.push(revealedInteraction.label)
      }
    }
  }

  return {
    hiddenObjectLabels: unique(hiddenObjectLabels),
    hiddenInteractionLabels: unique(hiddenInteractionLabels),
  }
}

export function expectRuntimeAcceptanceInvariants({ adventure, sceneState, character = makeRuntimeTestCharacter() }) {
  const structure = adventure.structure
  expect(structure.module.validationWarnings).toEqual([])

  const surfaces = collectRuntimeSurfaces(adventure, sceneState, character)
  const { section, choices, choiceLabels, contextText, promptText } = surfaces
  expect(section).toBeTruthy()

  const nonFreeChoices = choices.filter(choice => choice.kind !== 'free')
  expect(nonFreeChoices.every(choice => choice.source === 'structured')).toBe(true)

  const choiceActionKeys = nonFreeChoices.map(choice => choice.actionKey)
  expect(choiceActionKeys.every(Boolean)).toBe(true)
  expect(new Set(choiceActionKeys).size).toBe(choiceActionKeys.length)
  expect(new Set(choiceLabels).size).toBe(choiceLabels.length)

  for (const choice of nonFreeChoices) {
    if (choice.kind === 'exit') {
      expect(choice.target).toBeTruthy()
    } else {
      expect(choice.interactionId).toBeTruthy()
    }
  }

  const allowedExitLabels = getAllowedSectionExits(section, sceneState).map(exit => exit.label)
  const allowedInteractionLabels = getAllowedRuntimeInteractions(section, sceneState).map(interaction => interaction.label)
  const expectedVisibleLabels = unique([...allowedExitLabels, ...allowedInteractionLabels])

  expect(sorted(nonFreeChoices.map(choice => choice.label))).toEqual(sorted(expectedVisibleLabels))
  expectTextContainsAll(contextText, expectedVisibleLabels)
  expectTextContainsAll(promptText, expectedVisibleLabels)

  const blockedExitLabels = (section.exits || [])
    .filter(exit => !allowedExitLabels.includes(exit.label))
    .map(exit => exit.label)
  const allowedInteractionIds = new Set(
    getAllowedRuntimeInteractions(section, sceneState).map(interaction => interaction.id)
  )
  const blockedSectionInteractionLabels = (section.interactions || [])
    .filter(interaction => !allowedInteractionIds.has(interaction.id))
    .map(interaction => interaction.label)
  const blockedRuntimeInteractionLabels = Object.entries(sceneState?.gmState?.runtimeInteractions || {})
    .filter(([, interaction]) => interaction?.label)
    .filter(([interactionId, interaction]) => {
      if (interaction.sectionId && interaction.sectionId !== section.id) return false
      return !allowedInteractionIds.has(interactionId)
    })
    .map(([, interaction]) => interaction.label)

  const blockedChoiceLabels = unique([
    ...blockedExitLabels,
    ...blockedSectionInteractionLabels,
    ...blockedRuntimeInteractionLabels,
  ])

  expectTextOmitsAll(contextText, blockedChoiceLabels)
  expectTextOmitsAll(promptText, blockedChoiceLabels)

  const playerPrimaryObjective = structure.module?.playerPrimaryObjective || structure.module?.primaryObjective || ''
  const internalPrimaryObjective = structure.module?.primaryObjective || ''
  const playerObjective = section.playerObjective || section.objective || ''
  const internalObjective = section.objective || ''
  const playerIntro = section.introText || section.sceneText || ''

  expectTextContainsAll(contextText, unique([playerPrimaryObjective, playerObjective, playerIntro]))
  expectTextContainsAll(promptText, unique([playerPrimaryObjective, playerObjective, playerIntro]))

  if (
    structure.module?.playerPrimaryObjective &&
    structure.module?.primaryObjective &&
    structure.module.playerPrimaryObjective !== structure.module.primaryObjective
  ) {
    expectTextOmitsAll(contextText, [internalPrimaryObjective])
    expectTextOmitsAll(promptText, [internalPrimaryObjective])
  }

  if (section.playerObjective && section.objective && section.playerObjective !== section.objective) {
    expectTextOmitsAll(contextText, [internalObjective])
    expectTextOmitsAll(promptText, [internalObjective])
  }

  const visibleRuntimeObjectLabels = Object.values(sceneState?.gmState?.runtimeObjects || {})
    .filter(object => object?.visible && (!object.sectionId || object.sectionId === section.id))
    .map(object => object.label)
  expectTextContainsAll(contextText, unique(visibleRuntimeObjectLabels))
  expectTextContainsAll(promptText, unique(visibleRuntimeObjectLabels))

  const { hiddenObjectLabels, hiddenInteractionLabels } = collectCurrentSectionRevealLabels(section, sceneState)
  expectTextOmitsAll(contextText, hiddenObjectLabels)
  expectTextOmitsAll(promptText, hiddenObjectLabels)
  expectTextOmitsAll(contextText, hiddenInteractionLabels)
  expectTextOmitsAll(promptText, hiddenInteractionLabels)

  const allClueTexts = Object.values(structure.module?.clueRegistry || {})
    .map(clue => clue?.text)
    .filter(Boolean)
  const discoveredClueTexts = sceneState?.playerKnowledge?.discoveredClues || []
  const undiscoveredClueTexts = allClueTexts.filter(text => !discoveredClueTexts.includes(text))

  expectTextContainsAll(contextText, discoveredClueTexts)
  expectTextContainsAll(promptText, discoveredClueTexts)
  expectTextOmitsAll(contextText, undiscoveredClueTexts)
  expectTextOmitsAll(promptText, undiscoveredClueTexts)
}

export function createRuntimeInitialState(adventure) {
  return createInitialSceneState(adventure)
}
