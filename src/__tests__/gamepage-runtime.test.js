import { describe, expect, it } from 'vitest'
import {
  applyPendingCheckResult,
  createPendingCheckFromChoice,
  createPendingChoiceMeta,
  formatAssistantTextForDisplay,
  rebuildVisibleChoices,
  resolveResponsePendingCheck,
  resolveResolvedChoiceSubmission,
  resolveUnmatchedRuntimeInput,
  resolveVisibleChoiceFromText,
  resolveRuntimeChoiceFromText,
  shouldBuildChoicesAfterResponse,
} from '../pages/gamePageRuntime.js'
import { createInitialSceneState, findInteractionDef, findSectionById, normalizeAdventureEntry } from '../data/srd.js'
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

  it('prepares pending check execution for resolved authored probe choices', () => {
    const resolution = resolveResolvedChoiceSubmission({
      choice: {
        label: 'Das Schloss und die Kratzspuren untersuchen',
        kind: 'inspect',
        target: 'cellar_door',
        interactionId: 'inspect_lock',
        actionKey: 'intr:inspect_lock',
        check: {
          skillOrAbility: 'investigation',
          dc: 11,
          advantage: null,
          onFail: 'Du erkennst Abnutzung am alten Schloss, aber die Kratzspuren ergeben noch kein klares Bild.',
        },
      },
    })

    expect(resolution).toEqual({
      type: 'pending_check',
      pendingChoiceMeta: {
        target: 'cellar_door',
        kind: 'inspect',
        interactionId: 'inspect_lock',
        actionKey: 'intr:inspect_lock',
        onFail: 'Du erkennst Abnutzung am alten Schloss, aber die Kratzspuren ergeben noch kein klares Bild.',
      },
      pendingCheck: {
        skillOrAbility: 'investigation',
        dc: 11,
        advantage: null,
        choiceLabel: 'Das Schloss und die Kratzspuren untersuchen',
      },
    })
  })

  it('prepares immediate runtime interaction execution for resolved no-check choices', () => {
    const adventure = loadBirkenhainModule()
    const base = createInitialSceneState(adventure)
    const sceneState = {
      ...base,
      gmState: {
        ...base.gmState,
        currentSectionId: 'old_brewery',
        plotFlags: { HAS_CELLAR_KEY: true, CELLAR_UNLOCKED: true },
        runtimeObjects: {
          hidden_plate: {
            id: 'hidden_plate',
            sectionId: 'old_brewery',
            label: 'Vibrierende Metallplatte',
            visible: true,
            state: 'sealed',
          },
        },
      },
    }

    const resolution = resolveResolvedChoiceSubmission({
      choice: {
        label: 'Die Metallplatte oeffnen',
        kind: 'manipulate',
        target: 'hidden_plate',
        interactionId: 'open_hidden_plate',
        actionKey: 'intr:open_hidden_plate',
      },
      sceneState,
      adventure,
    })

    expect(resolution.type).toBe('submit')
    expect(resolution.submitText).toBe('Die Metallplatte oeffnen')
    expect(resolution.recentActionKey).toBe('intr:open_hidden_plate')
    expect(resolution.sendOptions).toEqual({
      allowEngineCheckInference: false,
      skipTextChoiceResolution: true,
      recentActionKey: 'intr:open_hidden_plate',
    })
    expect(resolution.inventoryAdds).toEqual([])
    expect(resolution.sceneStateOverride?.gmState?.plotFlags?.HIDDEN_PLATE_OPENED).toBe(true)
    expect(resolution.sceneStateOverride?.gmState?.runtimeObjects?.hidden_plate).toEqual(expect.objectContaining({
      sectionId: 'old_brewery',
      state: 'opened',
    }))
    expect(resolution.sceneStateOverride?.gmState?.runtimeObjects?.parchment_note).toEqual(expect.objectContaining({
      sectionId: 'old_brewery',
      visible: true,
    }))
  })

  it('keeps authored intent slots on dynamically revealed runtime interactions', () => {
    const adventure = loadGraufurtModule()
    const base = createInitialSceneState(adventure)
    const sceneState = {
      ...base,
      gmState: {
        ...base.gmState,
        currentSectionId: 'sealed_stacks',
        runtimeObjects: {
          service_drawer: {
            id: 'service_drawer',
            sectionId: 'sealed_stacks',
            label: 'Versteckte Schublade im Schreiberpult',
            visible: true,
            state: 'sealed',
          },
        },
      },
    }

    const resolution = resolveResolvedChoiceSubmission({
      choice: {
        label: 'Die versteckte Schublade aufziehen',
        kind: 'manipulate',
        target: 'service_drawer',
        interactionId: 'open_service_drawer',
        actionKey: 'intr:open_service_drawer',
      },
      sceneState,
      adventure,
    })

    expect(resolution.sceneStateOverride?.gmState?.runtimeInteractions?.read_service_map?.intent).toEqual({
      explicit: true,
      actions: ['lesen', 'studieren', 'entziffern'],
      targets: ['Servicekarte', 'Karte', 'Plan'],
      tools: [],
      topics: [],
      requiredSlots: [],
    })
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

  it('resolves same-label runtime choices through authored topic slots', () => {
    const choice = resolveRuntimeChoiceFromText({
      userText: 'Ich frage Mara nach dem Schluessel.',
      choices: [
        {
          label: 'Mara befragen',
          kind: 'talk',
          target: 'mara',
          interactionId: 'ask_mara_about_key',
          actionKey: 'intr:ask_mara_about_key',
          intent: {
            actions: ['fragen', 'befragen'],
            targets: ['Mara'],
            topics: ['Schluessel', 'Kellerschluessel'],
            requiredSlots: ['topic'],
          },
        },
        {
          label: 'Mara befragen',
          kind: 'talk',
          target: 'mara',
          interactionId: 'ask_mara_about_tomas',
          actionKey: 'intr:ask_mara_about_tomas',
          intent: {
            actions: ['fragen', 'befragen'],
            targets: ['Mara'],
            topics: ['Tomas', 'Vermissten'],
            requiredSlots: ['topic'],
          },
        },
      ],
    })

    expect(choice?.interactionId).toBe('ask_mara_about_key')
  })

  it('matches parameterized runtime free text to the choice with the stronger entity overlap', () => {
    const choice = resolveRuntimeChoiceFromText({
      userText: 'Ich benutze die Fackel am Brunnen.',
      choices: [
        {
          label: 'Dem Brunnen lauschen',
          kind: 'listen',
          interactionId: 'listen_well',
          actionKey: 'intr:listen_well',
        },
        {
          label: 'Den Brunnen mit der Fackel beleuchten',
          kind: 'use',
          interactionId: 'light_well_with_torch',
          actionKey: 'intr:light_well_with_torch',
        },
      ],
    })

    expect(choice?.interactionId).toBe('light_well_with_torch')
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

  it('asks for clarification when runtime text only names an authored tool slot without a full valid action target', () => {
    const resolution = resolveUnmatchedRuntimeInput({
      userText: 'Ich benutze den Schluessel.',
      choices: [
        {
          label: 'Die Kellertuer aufschliessen',
          kind: 'use_item',
          target: 'cellar_door',
          interactionId: 'unlock_cellar_door',
          actionKey: 'intr:unlock_cellar_door',
          intent: {
            actions: ['aufschliessen', 'oeffnen', 'entriegeln'],
            targets: ['Kellertuer', 'Schloss'],
            tools: ['Schluessel', 'Kellerschluessel'],
            requiredSlots: ['tool'],
          },
        },
      ],
    })

    expect(resolution?.type).toBe('needs_clarification')
    expect(resolution?.message).toContain('nicht eindeutig')
  })

  it('treats harmless unmatched runtime free text as flavor-only', () => {
    const resolution = resolveUnmatchedRuntimeInput({
      userText: 'Ich huepfe kurz in die Luft.',
      choices: [
        {
          label: 'Zurueck zur Brauerei',
          kind: 'exit',
          actionKey: 'exit:back_to_brewery',
        },
      ],
    })

    expect(resolution).toEqual({
      type: 'flavor_only',
      runtimeRequestMode: 'runtime_flavor_only',
    })
  })

  it('asks for clarification when unmatched runtime free text references known scene entities', () => {
    const resolution = resolveUnmatchedRuntimeInput({
      userText: 'Ich benutze die Fackel am Brunnen anders.',
      choices: [
        {
          label: 'Dem Brunnen lauschen',
          kind: 'listen',
          interactionId: 'listen_well',
          actionKey: 'intr:listen_well',
        },
        {
          label: 'Den Brunnen mit der Fackel beleuchten',
          kind: 'use',
          interactionId: 'light_well_with_torch',
          actionKey: 'intr:light_well_with_torch',
        },
      ],
    })

    expect(resolution?.type).toBe('needs_clarification')
    expect(resolution?.message).toContain('nicht eindeutig')
  })

  it('routes escalating free text against a visible runtime NPC through the authoritative warning path', () => {
    const adventure = loadBirkenhainModule()
    const sceneState = createInitialSceneState(adventure)
    const section = findSectionById(adventure.structure, 'inn_common_room')
    const resolution = resolveUnmatchedRuntimeInput({
      userText: 'Ich beleidige Mara.',
      choices: [
        {
          label: 'Mara ruhig nach dem Vermissten fragen',
          kind: 'talk',
          interactionId: 'ask_mara_about_tomas',
          actionKey: 'intr:ask_mara_about_tomas',
        },
      ],
      adventure,
      sceneState,
      section,
    })

    expect(resolution?.type).toBe('authoritative_escalation')
    expect(resolution?.runtimeRequestMode).toBe('runtime_authoritative_resolution')
    expect(resolution?.runtimeResolution).toEqual(expect.objectContaining({
      intent: 'insult',
      outcome: 'warning',
      npcId: 'mara',
      npcName: 'Mara Birken',
    }))
    expect(resolution?.sceneStateOverride?.dialogueState?.activeNpcId).toBe('mara')
    expect(resolution?.sceneStateOverride?.dialogueState?.npcRelations?.mara).toEqual(expect.objectContaining({
      disposition: 'wary',
      engagementState: 'warned',
    }))
  })

  it('routes authored threat escalation into a guard-call consequence and suppresses the escalated npc talk path', () => {
    const adventure = loadGraufurtModule()
    const sceneState = createInitialSceneState(adventure)
    const section = findSectionById(adventure.structure, 'archive_foyer')
    const resolution = resolveUnmatchedRuntimeInput({
      userText: 'Ich drohe Leno.',
      choices: [
        {
          label: 'Elsa nach der Sperrung fragen',
          kind: 'talk',
          interactionId: 'ask_elsa_about_lockdown',
          actionKey: 'intr:ask_elsa_about_lockdown',
        },
        {
          label: 'Leno nach Mira fragen',
          kind: 'talk',
          interactionId: 'ask_leno_about_mira',
          actionKey: 'intr:ask_leno_about_mira',
        },
      ],
      adventure,
      sceneState,
      section,
    })

    expect(resolution?.type).toBe('authoritative_escalation')
    expect(resolution?.runtimeResolution).toEqual(expect.objectContaining({
      intent: 'threat',
      outcome: 'call_guards',
      npcId: 'leno',
      npcName: 'Leno Falk',
    }))
    expect(resolution?.sceneStateOverride?.gmState?.plotFlags?.LENO_CALLED_FOR_ELSA).toBe(true)
    expect(resolution?.sceneStateOverride?.dialogueState?.activeNpcId).toBe('elsa')
    expect(resolution?.sceneStateOverride?.dialogueState?.npcRelations?.leno).toEqual(expect.objectContaining({
      engagementState: 'calling_guards',
    }))

    const rebuiltChoices = rebuildVisibleChoices({
      section,
      sceneState: resolution.sceneStateOverride,
      runtimeModule: true,
    })
    expect(rebuiltChoices.some(choice => choice.interactionId === 'ask_leno_about_mira')).toBe(false)
    expect(rebuiltChoices.some(choice => choice.interactionId === 'ask_elsa_about_lockdown')).toBe(true)
  })

  it('starts authored combat for escalation targets with an explicit combat preset', () => {
    const adventure = loadGraufurtModule()
    const sceneState = createInitialSceneState(adventure)
    const section = findSectionById(adventure.structure, 'archive_foyer')
    const resolution = resolveUnmatchedRuntimeInput({
      userText: 'Ich greife Elsa an.',
      choices: [
        {
          label: 'Elsa nach der Sperrung fragen',
          kind: 'talk',
          interactionId: 'ask_elsa_about_lockdown',
          actionKey: 'intr:ask_elsa_about_lockdown',
        },
        {
          label: 'Leno nach Mira fragen',
          kind: 'talk',
          interactionId: 'ask_leno_about_mira',
          actionKey: 'intr:ask_leno_about_mira',
        },
      ],
      adventure,
      sceneState,
      section,
    })

    expect(resolution?.type).toBe('authoritative_escalation')
    expect(resolution?.runtimeResolution).toEqual(expect.objectContaining({
      intent: 'attack',
      outcome: 'combat_start',
      npcId: 'elsa',
      npcName: 'Elsa Dorn',
    }))
    expect(resolution?.combatOverride).toEqual(expect.objectContaining({
      active: true,
      phase: 'initiative',
      enemies: [
        expect.objectContaining({
          id: 'runtime-enemy-elsa',
          name: 'Elsa Dorn',
          ac: 16,
          xp: 25,
        }),
      ],
    }))
    expect(resolution?.sceneStateOverride?.dialogueState?.npcRelations?.elsa).toEqual(expect.objectContaining({
      disposition: 'hostile',
      engagementState: 'hostile',
    }))
  })

  it('routes authored attack escalation into a flee consequence with a scene transition', () => {
    const adventure = loadGraufurtModule()
    const base = createInitialSceneState(adventure)
    const sceneState = {
      ...base,
      gmState: {
        ...base.gmState,
        currentSectionId: 'witness_alcove',
        plotFlags: {
          ...base.gmState.plotFlags,
          CATWALK_CROSSED: true,
        },
      },
    }
    const section = findSectionById(adventure.structure, 'witness_alcove')
    const resolution = resolveUnmatchedRuntimeInput({
      userText: 'Ich greife Mira an.',
      choices: [
        {
          label: 'Mira vorsichtig beruhigen',
          kind: 'talk',
          interactionId: 'calm_mira',
          actionKey: 'intr:calm_mira',
        },
      ],
      adventure,
      sceneState,
      section,
    })

    expect(resolution?.type).toBe('authoritative_escalation')
    expect(resolution?.runtimeResolution).toEqual(expect.objectContaining({
      intent: 'attack',
      outcome: 'flee',
      npcId: 'mira',
      npcName: 'Mira Sen',
      transitionToSectionId: 'collapsed_gallery',
    }))
    expect(resolution?.sceneStateOverride?.gmState?.currentSectionId).toBe('collapsed_gallery')
    expect(resolution?.sceneStateOverride?.gmState?.plotFlags?.MIRA_ESCAPED).toBe(true)
    expect(resolution?.sceneStateOverride?.gmState?.npcStates?.mira).toEqual(expect.objectContaining({
      currentlyVisible: false,
      state: 'fled',
    }))
    expect(resolution?.sceneStateOverride?.dialogueState?.activeNpcId).toBeNull()
    expect(resolution?.sceneStateOverride?.dialogueState?.npcRelations?.mira).toEqual(expect.objectContaining({
      engagementState: 'fled',
    }))
  })

  it('asks for clarification when escalating free text does not identify one visible NPC in a multi-npc scene', () => {
    const adventure = loadGraufurtModule()
    const sceneState = createInitialSceneState(adventure)
    const section = findSectionById(adventure.structure, 'archive_foyer')
    const resolution = resolveUnmatchedRuntimeInput({
      userText: 'Ich beleidige euch beide.',
      choices: [
        {
          label: 'Elsa nach der Sperrung fragen',
          kind: 'talk',
          interactionId: 'ask_elsa_about_lockdown',
          actionKey: 'intr:ask_elsa_about_lockdown',
        },
        {
          label: 'Leno nach Mira fragen',
          kind: 'talk',
          interactionId: 'ask_leno_about_mira',
          actionKey: 'intr:ask_leno_about_mira',
        },
      ],
      adventure,
      sceneState,
      section,
    })

    expect(resolution?.type).toBe('needs_clarification')
    expect(resolution?.message).toContain('Nenne die Person direkt')
  })

  it('strips probe hint tags from runtime-module narration', () => {
    const text = formatAssistantTextForDisplay(
      'Du bemerkst das Schloss. [PROBE_HINWEIS:investigation|SG:12]',
      skill => skill,
      { runtimeModule: true }
    )

    expect(text).toBe('Du bemerkst das Schloss.')
  })

  it('strips hallucinated option boilerplate from runtime-module narration', () => {
    const text = formatAssistantTextForDisplay(
      'Der Altar summt kurz auf.\n\nDu siehst drei M\u00f6glichkeiten:\n\nWelche Aktion w\u00e4hlst du?',
      skill => skill,
      { runtimeModule: true }
    )

    expect(text).toBe('Der Altar summt kurz auf.')
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
