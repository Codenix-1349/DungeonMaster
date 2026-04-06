import { describe, expect, it } from 'vitest'
import {
  createPendingCheckFromChoice,
  createPendingChoiceMeta,
  formatAssistantTextForDisplay,
  resolveResponsePendingCheck,
  resolveVisibleChoiceFromText,
  resolveRuntimeChoiceFromText,
  shouldBuildChoicesAfterResponse,
} from '../pages/gamePageRuntime.js'

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
    })
    expect(createPendingCheckFromChoice(choice)).toEqual({
      skillOrAbility: 'investigation',
      dc: 12,
      advantage: null,
      choiceLabel: 'Den beschädigten Tresen untersuchen',
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
