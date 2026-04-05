import { inferCheckFromLabel } from '../engine/choiceEngine'

export function createPendingChoiceMeta(choice) {
  if (!choice?.check) return null
  return {
    target: choice.target || null,
    kind: choice.kind || null,
    interactionId: choice.interactionId || null,
  }
}

export function createPendingCheckFromChoice(choice) {
  if (!choice?.check) return null
  return {
    ...choice.check,
    choiceLabel: choice.label,
  }
}

export function resolveResponsePendingCheck({
  aiCheckTag = null,
  userText = '',
  combatActive = false,
  allowEngineCheckInference = true,
  hasPendingChoiceMeta = false,
} = {}) {
  if (combatActive) return null
  if (aiCheckTag) return aiCheckTag
  if (!allowEngineCheckInference || hasPendingChoiceMeta) return null
  return inferCheckFromLabel(userText)
}

export function shouldBuildChoicesAfterResponse({ combatActive = false, pendingCheck = null } = {}) {
  return !combatActive && !pendingCheck
}
