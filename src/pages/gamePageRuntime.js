import { getChoiceActionKey, inferCheckFromLabel } from '../engine/choiceEngine'
import { formatProbeHinweisTags, stripCheckTags, stripProbeHintTags } from '../services/openrouter'

export function createPendingChoiceMeta(choice) {
  if (!choice?.check) return null
  return {
    target: choice.target || null,
    kind: choice.kind || null,
    interactionId: choice.interactionId || null,
    actionKey: getChoiceActionKey(choice),
  }
}

export function createPendingCheckFromChoice(choice) {
  if (!choice?.check) return null
  return {
    ...choice.check,
    choiceLabel: choice.label,
  }
}

const RUNTIME_MATCH_STOPWORDS = new Set([
  'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr',
  'den', 'die', 'das', 'dem', 'der', 'des',
  'ein', 'eine', 'einen', 'einem', 'einer',
  'und', 'oder', 'mit', 'ohne', 'zu', 'zum', 'zur',
  'im', 'in', 'am', 'an', 'auf', 'aus', 'von', 'vom',
  'bitte', 'mal', 'doch', 'nur',
])

function normalizeRuntimeChoiceText(text = '') {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stemRuntimeChoiceToken(token = '') {
  const suffixes = ['chen', 'lein', 'ern', 'en', 'er', 'em', 'es', 'e', 'n', 's']
  let stem = token
  for (const suffix of suffixes) {
    if (stem.length > suffix.length + 2 && stem.endsWith(suffix)) {
      stem = stem.slice(0, -suffix.length)
      break
    }
  }
  return stem
}

function tokenizeRuntimeChoiceText(text = '') {
  return normalizeRuntimeChoiceText(text)
    .split(' ')
    .map(token => token.trim())
    .filter(Boolean)
    .filter(token => !RUNTIME_MATCH_STOPWORDS.has(token))
    .map(stemRuntimeChoiceToken)
    .filter(token => token.length >= 3)
}

function runtimeTokensMatch(a = '', b = '') {
  if (!a || !b) return false
  if (a === b) return true
  const shorter = a.length <= b.length ? a : b
  const longer = a.length <= b.length ? b : a
  return shorter.length >= 4 && longer.startsWith(shorter)
}

export function resolveVisibleChoiceFromText({ userText = '', choices = [] } = {}) {
  const inputNorm = normalizeRuntimeChoiceText(userText)
  const inputTokens = tokenizeRuntimeChoiceText(userText)
  if (!inputNorm || !inputTokens.length || !Array.isArray(choices) || !choices.length) return null

  const ranked = choices
    .filter(choice => choice?.label && choice.kind !== 'free')
    .map(choice => {
      const labelNorm = normalizeRuntimeChoiceText(choice.label)
      if (!labelNorm) return null
      if (labelNorm === inputNorm) {
        return { choice, score: 1000, exact: true }
      }

      const labelTokens = tokenizeRuntimeChoiceText(choice.label)
      if (!labelTokens.length) return null

      const matchedLabelTokens = labelTokens.filter(labelToken => (
        inputTokens.some(inputToken => runtimeTokensMatch(inputToken, labelToken))
      ))
      const matchedInputTokens = inputTokens.filter(inputToken => (
        labelTokens.some(labelToken => runtimeTokensMatch(inputToken, labelToken))
      ))

      const labelCoverage = matchedLabelTokens.length / labelTokens.length
      const inputCoverage = matchedInputTokens.length / inputTokens.length

      if (matchedLabelTokens.length === labelTokens.length && inputCoverage >= 0.6) {
        return { choice, score: 800 + matchedLabelTokens.length, exact: false }
      }

      if (matchedInputTokens.length === inputTokens.length && matchedInputTokens.length >= 2 && labelCoverage >= 0.6) {
        return { choice, score: 700 + matchedInputTokens.length, exact: false }
      }

      if (matchedLabelTokens.length >= 2 && labelCoverage >= 0.75 && inputCoverage >= 0.75) {
        return { choice, score: 500 + matchedLabelTokens.length, exact: false }
      }

      return null
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.choice.label.length - b.choice.label.length)

  if (!ranked.length) return null
  if (ranked.length === 1) return ranked[0].choice
  if (ranked[0].score > ranked[1].score) return ranked[0].choice
  return null
}

export function resolveRuntimeChoiceFromText(params = {}) {
  return resolveVisibleChoiceFromText(params)
}

export function resolveResponsePendingCheck({
  aiCheckTag = null,
  userText = '',
  combatActive = false,
  allowEngineCheckInference = true,
  hasPendingChoiceMeta = false,
  runtimeModule = false,
} = {}) {
  if (combatActive) return null
  if (runtimeModule) {
    if (!allowEngineCheckInference || hasPendingChoiceMeta) return null
    return inferCheckFromLabel(userText)
  }
  if (aiCheckTag) return aiCheckTag
  if (!allowEngineCheckInference || hasPendingChoiceMeta) return null
  return inferCheckFromLabel(userText)
}

export function formatAssistantTextForDisplay(rawText = '', getLabel, { runtimeModule = false } = {}) {
  const withoutCheckTags = stripCheckTags(rawText)
  if (runtimeModule) return stripProbeHintTags(withoutCheckTags)
  return formatProbeHinweisTags(withoutCheckTags, getLabel)
}

export function shouldBuildChoicesAfterResponse({ combatActive = false, pendingCheck = null } = {}) {
  return !combatActive && !pendingCheck
}
