import { describe, expect, it } from 'vitest'
import {
  createPendingCheckFromChoice,
  createPendingChoiceMeta,
  resolveResponsePendingCheck,
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
})
