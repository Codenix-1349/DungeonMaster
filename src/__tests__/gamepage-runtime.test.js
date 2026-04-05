import { describe, expect, it } from 'vitest'
import {
  createPendingCheckFromChoice,
  createPendingChoiceMeta,
  resolveResponsePendingCheck,
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
})
