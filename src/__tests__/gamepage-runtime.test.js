import { describe, expect, it } from 'vitest'
import {
  applyPendingCheckResult,
  createPendingCheckFromChoice,
  createPendingChoiceMeta,
  formatAssistantTextForDisplay,
  rebuildVisibleChoices,
  resolveResponsePendingCheck,
  resolveVisibleChoiceFromText,
  resolveRuntimeChoiceFromText,
  shouldBuildChoicesAfterResponse,
} from '../pages/gamePageRuntime.js'
import { createInitialSceneState, findInteractionDef, normalizeAdventureEntry } from '../data/srd.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const BIRKENHAIN_MODULE_TEXT = readFileSync(resolve(__dirname, '../data/adventures/birkenhain_minimal_runtime_module.txt'), 'utf-8')
const GRAUFURT_MODULE_TEXT = readFileSync(resolve(__dirname, '../data/adventures/graufurt_reference_runtime_module.txt'), 'utf-8')

function loadBirkenhainModule() {
  return normalizeAdventureEntry({ id: 'gamepage-runtime-birkenhain', title: 'Birkenhain Minimal', text: BIRKENHAIN_MODULE_TEXT })
}

function loadGraufurtModule() {
  return normalizeAdventureEntry({ id: 'gamepage-runtime-graufurt', title: 'Graufurt Referenz', text: GRAUFURT_MODULE_TEXT })
}

describe('GamePage runtime check flow helpers', () => {
  it('probe-based choice creates pending check metadata', () => {
    const choice = {
      label: 'Den beschädigten Tresen untersuchen',
      kind: 'inspect',
      target: 'counter',
      interactionId: 'inspect_counter',
      check: { skillOrAbility: 'investigation', dc: 12, advantage: null },
    }

    expect(createPendingChoiceMeta(choice)).toEqual({
      target: 'counter',
      kind: 'inspect',
      interactionId: 'inspect_counter',
      actionKey: 'intr:inspect_counter',
      onFail: null,
    })
    expect(createPendingCheckFromChoice(choice)).toEqual({
      skillOrAbility: 'investigation',
      dc: 12,
      advantage: null,
      choiceLabel: 'Den beschädigten Tresen untersuchen',
    })
  })

  it('stores authored failure narration in pending choice metadata without leaking it into the pending check payload', () => {
    const choice = {
      label: 'Das Schloss und die Kratzspuren untersuchen',
      kind: 'inspect',
      target: 'cellar_door',
      interactionId: 'inspect_lock',
      check: {
        skillOrAbility: 'investigation',
        dc: 11,
        advantage: null,
        onFail: 'Du erkennst Abnutzung am alten Schloss, aber die Kratzspuren ergeben noch kein klares Bild.',
      },
    }

    expect(createPendingChoiceMeta(choice)).toEqual({
      target: 'cellar_door',
      kind: 'inspect',
      interactionId: 'inspect_lock',
      actionKey: 'intr:inspect_lock',
      onFail: 'Du erkennst Abnutzung am alten Schloss, aber die Kratzspuren ergeben noch kein klares Bild.',
    })
    expect(createPendingCheckFromChoice(choice)).toEqual({
      skillOrAbility: 'investigation',
      dc: 11,
      advantage: null,
      choiceLabel: 'Das Schloss und die Kratzspuren untersuchen',
    })
  })

  it('uses AI check tag when the response explicitly requests a check', () => {
    const pendingCheck = resolveResponsePendingCheck({
      aiCheckTag: { skillOrAbility: 'perception', dc: 13, advantage: null },
      userText: 'Ich höre an der Tür.',
      allowEngineCheckInference: true,
    })

    expect(pendingCheck).toEqual({ skillOrAbility: 'perception', dc: 13, advantage: null })
  })

  it('ignores AI check tags in runtime modules and stays engine-authoritative', () => {
    const pendingCheck = resolveResponsePendingCheck({
      aiCheckTag: { skillOrAbility: 'investigation', dc: 12, advantage: null },
      userText: 'Die Metallplatte öffnen',
      allowEngineCheckInference: true,
      runtimeModule: true,
    })

    expect(pendingCheck).toBeNull()
  })

  it('does not infer runtime checks from free text without an explicit module check', () => {
    const pendingCheck = resolveResponsePendingCheck({
      userText: 'Ich untersuche das Schloss und die Kratzspuren.',
      allowEngineCheckInference: true,
      runtimeModule: true,
    })

    expect(pendingCheck).toBeNull()
  })

  it('does not infer a second check for app-driven follow-up actions', () => {
    const pendingCheck = resolveResponsePendingCheck({
      userText: 'Die Metallplatte öffnen',
      allowEngineCheckInference: false,
    })

    expect(pendingCheck).toBeNull()
  })

  it('suppresses choice rebuilding while a check is pending', () => {
    expect(shouldBuildChoicesAfterResponse({
      pendingCheck: { skillOrAbility: 'investigation', dc: 12 },
    })).toBe(false)

    expect(shouldBuildChoicesAfterResponse({ pendingCheck: null })).toBe(true)
  })

  it('applies authored runtime success checks directly to engine state and keeps the stable action key', () => {
    const adventure = loadBirkenhainModule()
    const structure = adventure.structure
    const base = createInitialSceneState(adventure)
    const sceneState = {
      ...base,
      gmState: {
        ...base.gmState,
        currentSectionId: 'old_brewery',
        plotFlags: { HAS_CELLAR_KEY: true, CELLAR_UNLOCKED: true },
      },
    }
    const interaction = findInteractionDef(structure, 'inspect_counter')

    const resolved = applyPendingCheckResult({
      result: { success: true, skillOrAbility: 'investigation' },
      choiceMeta: {
        label: interaction.label,
        kind: 'inspect',
        target: 'counter',
        interactionId: 'inspect_counter',
        actionKey: 'intr:inspect_counter',
      },
      sceneState,
      adventure,
    })

    expect(resolved.recentActionKey).toBe('intr:inspect_counter')
    expect(resolved.inventoryAdds).toEqual([])
    expect(resolved.sceneState.gmState.plotFlags.COUNTER_INSPECTED).toBe(true)
    expect(resolved.sceneState.gmState.runtimeObjects.hidden_plate).toEqual(expect.objectContaining({
      sectionId: 'old_brewery',
      visible: true,
      state: 'sealed',
    }))
  })

  it('applies authored runtime failure checks directly to engine state and records retry history', () => {
    const adventure = loadGraufurtModule()
    const structure = adventure.structure
    const base = createInitialSceneState(adventure)
    const sceneState = {
      ...base,
      gmState: {
        ...base.gmState,
        currentSectionId: 'collapsed_gallery',
      },
    }
    const interaction = findInteractionDef(structure, 'cross_broken_catwalk')

    const resolved = applyPendingCheckResult({
      result: { success: false, skillOrAbility: 'athletics' },
      choiceMeta: {
        label: interaction.label,
        kind: 'move',
        target: 'catwalk',
        interactionId: 'cross_broken_catwalk',
        actionKey: 'intr:cross_broken_catwalk',
      },
      sceneState,
      adventure,
      characterItemCount: 0,
    })

    expect(resolved.recentActionKey).toBeNull()
    expect(resolved.inventoryAdds).toEqual([])
    expect(resolved.sceneState.gmState.plotFlags.CATWALK_SLIPPED).toBe(true)
    expect(resolved.sceneState.interactionHistory).toEqual([
      expect.objectContaining({
        interactionId: 'cross_broken_catwalk',
        actionKey: 'intr:cross_broken_catwalk',
        targetId: 'catwalk',
        skill: 'athletics',
        outcome: 'failure',
        label: interaction.label,
        kind: 'move',
      }),
    ])
  })

  it('rebuilds runtime choices from persisted section state without a new AI roundtrip', () => {
    const choices = rebuildVisibleChoices({
      section: {
        id: 'inn_common_room',
        exits: [],
        interactions: [
          {
            id: 'ask_mara_about_missing_person',
            label: 'Mara ruhig nach dem Vermissten fragen',
            kind: 'talk',
            target: 'mara',
          },
        ],
      },
      sceneState: {
        gmState: {
          currentSectionId: 'inn_common_room',
          plotFlags: {},
          runtimeObjects: {},
          runtimeInteractions: {},
        },
        playerKnowledge: {
          knownNpcs: [],
          knownPlaces: [],
          discoveredClues: [],
          knownFactions: [],
          knownFacts: [],
        },
        dialogueState: { activeNpcId: null, npcRelations: {} },
        inferred: { npcStates: {}, objectStates: {}, dialogueHints: {} },
        recentActions: [],
        recentActionKeys: [],
        interactionHistory: [],
      },
      runtimeModule: true,
    })

    expect(choices.some(choice => choice.label === 'Mara ruhig nach dem Vermissten fragen')).toBe(true)
    expect(choices.some(choice => choice.kind === 'free')).toBe(true)
  })

  it('rebuilds legacy choices from the last visible assistant response', () => {
    const choices = rebuildVisibleChoices({
      section: {
        id: 'chapel',
        exits: [],
        interactions: [],
      },
      sceneState: {
        gmState: {
          currentSectionId: 'chapel',
          plotFlags: {},
          runtimeObjects: {},
          runtimeInteractions: {},
        },
        playerKnowledge: {
          knownNpcs: [],
          knownPlaces: [],
          discoveredClues: [],
          knownFactions: [],
          knownFacts: [],
        },
        dialogueState: { activeNpcId: null, npcRelations: {} },
        inferred: { npcStates: {}, objectStates: {}, dialogueHints: {} },
        recentActions: [],
        recentActionKeys: [],
        interactionHistory: [],
      },
      assistantText: '1. Den Raum nach Fallen untersuchen\n2. Die Kapelle verlassen\n3. Etwas anderes (beschreibe selbst)',
      runtimeModule: false,
    })

    expect(choices.some(choice => choice.label === 'Den Raum nach Fallen untersuchen')).toBe(true)
    expect(choices.some(choice => choice.label === 'Die Kapelle verlassen')).toBe(true)
  })

  it('matches free text to an unambiguous runtime inspect choice', () => {
    const choice = resolveRuntimeChoiceFromText({
      userText: 'Ich untersuche den Tresen.',
      choices: [
        {
          label: 'Den beschädigten Tresen untersuchen',
          kind: 'inspect',
          interactionId: 'inspect_counter',
          actionKey: 'intr:inspect_counter',
        },
        {
          label: 'Den Wassergeräuschen folgen',
          kind: 'exit',
          target: 'well_chamber',
          actionKey: 'exit:well_chamber',
        },
      ],
    })

    expect(choice?.interactionId).toBe('inspect_counter')
  })

  it('matches typed legacy text to a visible probe choice before the AI is asked again', () => {
    const choice = resolveVisibleChoiceFromText({
      userText: 'Ich untersuche den Raum nach Fallen.',
      choices: [
        {
          label: 'Den Raum nach Fallen untersuchen',
          kind: 'action',
          source: 'ai',
          check: { skillOrAbility: 'investigation', dc: 12, advantage: null },
        },
        {
          label: 'Die Kapelle verlassen',
          kind: 'exit',
          source: 'ai',
          check: null,
        },
      ],
    })

    expect(choice?.label).toBe('Den Raum nach Fallen untersuchen')
    expect(choice?.check).toEqual({ skillOrAbility: 'investigation', dc: 12, advantage: null })
  })

  it('matches umlaut free text to ASCII-authored runtime exit labels', () => {
    const choice = resolveVisibleChoiceFromText({
      userText: 'Zur\u00fcck zur Brauerei',
      choices: [
        {
          label: 'Zurueck zur Brauerei',
          kind: 'exit',
          source: 'structured',
          target: 'old_brewery',
          actionKey: 'exit:back_to_brewery',
        },
        {
          label: 'Weiter zur verketteten Kammer',
          kind: 'exit',
          source: 'structured',
          target: 'ritual_cellar',
          actionKey: 'exit:to_ritual_cellar',
        },
      ],
    })

    expect(choice?.label).toBe('Zurueck zur Brauerei')
    expect(choice?.actionKey).toBe('exit:back_to_brewery')
  })

  it('matches inflected free text to the parchment read interaction', () => {
    const choice = resolveRuntimeChoiceFromText({
      userText: 'Ich lese das Pergament',
      choices: [
        {
          label: 'Das Pergament lesen',
          kind: 'read',
          interactionId: 'read_parchment_note',
          actionKey: 'intr:read_parchment_note',
        },
        {
          label: 'Das Pergament nehmen',
          kind: 'take',
          interactionId: 'take_parchment_note',
          actionKey: 'intr:take_parchment_note',
        },
      ],
    })

    expect(choice?.interactionId).toBe('read_parchment_note')
  })

  it('matches runtime free text through authored aliases instead of the visible label alone', () => {
    const choice = resolveRuntimeChoiceFromText({
      userText: 'Elsa das Gitter aufschliessen lassen',
      choices: [
        {
          label: 'Elsa bitten, das Magazin zu oeffnen',
          aliases: ['Elsa das Gitter aufschliessen lassen'],
          kind: 'talk',
          interactionId: 'ask_elsa_to_open_stacks',
          actionKey: 'intr:ask_elsa_to_open_stacks',
        },
        {
          label: 'Leno nach Mira fragen',
          kind: 'talk',
          interactionId: 'ask_leno_about_mira',
          actionKey: 'intr:ask_leno_about_mira',
        },
      ],
    })

    expect(choice?.interactionId).toBe('ask_elsa_to_open_stacks')
  })

  it('returns null for ambiguous typed text across multiple visible choices', () => {
    const choice = resolveVisibleChoiceFromText({
      userText: 'Ich untersuche die Tür.',
      choices: [
        {
          label: 'Die linke Tür untersuchen',
          kind: 'inspect',
          source: 'structured',
        },
        {
          label: 'Die rechte Tür untersuchen',
          kind: 'inspect',
          source: 'structured',
        },
      ],
    })

    expect(choice).toBeNull()
  })

  it('returns null when the free text does not map cleanly to a visible runtime choice', () => {
    const choice = resolveRuntimeChoiceFromText({
      userText: 'Ich mache irgendwas damit.',
      choices: [
        {
          label: 'Die Metallplatte genauer untersuchen',
          kind: 'inspect',
          interactionId: 'inspect_hidden_plate',
          actionKey: 'intr:inspect_hidden_plate',
        },
        {
          label: 'Die Metallplatte öffnen',
          kind: 'manipulate',
          interactionId: 'open_hidden_plate',
          actionKey: 'intr:open_hidden_plate',
        },
      ],
    })

    expect(choice).toBeNull()
  })

  it('strips probe hint tags from runtime-module narration', () => {
    const text = formatAssistantTextForDisplay(
      'Du bemerkst das Schloss. [PROBE_HINWEIS:investigation|SG:12]',
      skill => skill,
      { runtimeModule: true }
    )

    expect(text).toBe('Du bemerkst das Schloss.')
  })

  it('keeps probe hint formatting in legacy narration', () => {
    const text = formatAssistantTextForDisplay(
      '1. Die Tür prüfen [PROBE_HINWEIS:investigation|SG:12]',
      skill => skill,
      { runtimeModule: false }
    )

    expect(text).toContain('SG 12')
    expect(text).toContain('investigation')
  })
})
