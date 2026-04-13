import { buildAvailableChoices, getChoiceActionKey, inferCheckFromLabel } from '../engine/choiceEngine'
import { formatProbeHinweisTags, stripCheckTags, stripProbeHintTags } from '../services/openrouter'
import {
  applyReveals,
  findInteractionDef,
  findSectionById,
  normalizeAdventureEntry,
  resolveInteractionOutcome,
  resolveReveals,
} from '../data/srd'

export function createPendingChoiceMeta(choice) {
  if (!choice?.check) return null
  return {
    target: choice.target || null,
    kind: choice.kind || null,
    interactionId: choice.interactionId || null,
    actionKey: getChoiceActionKey(choice),
    onFail: choice.check.onFail || null,
  }
}

export function createPendingCheckFromChoice(choice) {
  if (!choice?.check) return null
  const { skillOrAbility, dc, advantage = null } = choice.check
  return {
    skillOrAbility,
    dc,
    advantage,
    choiceLabel: choice.label,
  }
}

export function applyPendingCheckResult({
  result = null,
  choiceMeta = null,
  sceneState = null,
  characterItemCount = 0,
  adventure = null,
} = {}) {
  if (!result || !sceneState) {
    return {
      sceneState,
      inventoryAdds: [],
      recentActionKey: null,
    }
  }

  let nextSceneState = sceneState
  let inventoryAdds = []

  if (!result.success) {
    const record = {
      id: `int-${Date.now()}`,
      sectionId: nextSceneState.gmState?.currentSectionId || null,
      targetId: choiceMeta?.target || null,
      interactionId: choiceMeta?.interactionId || null,
      actionKey: choiceMeta?.actionKey || null,
      skill: result.skillOrAbility || null,
      outcome: 'failure',
      turn: nextSceneState.turnCount || 0,
      label: choiceMeta?.label || '',
      kind: choiceMeta?.kind || null,
      contextSnapshot: {
        clueCount: nextSceneState.playerKnowledge?.discoveredClues?.length || 0,
        npcCount: nextSceneState.playerKnowledge?.knownNpcs?.length || 0,
        itemCount: characterItemCount || 0,
      },
    }
    nextSceneState = {
      ...nextSceneState,
      interactionHistory: [...(nextSceneState.interactionHistory || []), record].slice(-20),
    }
  }

  const normalizedAdventure = normalizeAdventureEntry(adventure)
  const structure = normalizedAdventure?.structure || null

  if (choiceMeta?.interactionId && structure) {
    const interactionDef = findInteractionDef(structure, choiceMeta.interactionId)
    const resolved = resolveInteractionOutcome(
      nextSceneState,
      interactionDef,
      structure.module,
      result.success ? 'success' : 'failure'
    )
    if (resolved?.sceneState) nextSceneState = resolved.sceneState
    if (resolved?.inventoryAdds?.length) inventoryAdds = resolved.inventoryAdds
  } else if (result.success && choiceMeta?.target && structure) {
    const currentSection = findSectionById(structure, nextSceneState.gmState?.currentSectionId)
    if (currentSection) {
      const matched = resolveReveals(currentSection, nextSceneState, choiceMeta.target)
      if (matched.length) {
        nextSceneState = applyReveals(nextSceneState, matched)
      }
    }
  }

  return {
    sceneState: nextSceneState,
    inventoryAdds,
    recentActionKey: result.success ? (choiceMeta?.actionKey || null) : null,
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
    .replace(/\u00e4/g, 'ae')
    .replace(/\u00f6/g, 'oe')
    .replace(/\u00fc/g, 'ue')
    .replace(/\u00df/g, 'ss')
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

function getChoiceResolutionTexts(choice = {}) {
  const texts = [choice.label, ...(Array.isArray(choice.aliases) ? choice.aliases : [])]
  return texts.map(text => String(text || '').trim()).filter(Boolean)
}

export function resolveVisibleChoiceFromText({ userText = '', choices = [] } = {}) {
  const inputNorm = normalizeRuntimeChoiceText(userText)
  const inputTokens = tokenizeRuntimeChoiceText(userText)
  if (!inputNorm || !inputTokens.length || !Array.isArray(choices) || !choices.length) return null

  const ranked = choices
    .filter(choice => getChoiceResolutionTexts(choice).length && choice.kind !== 'free')
    .map(choice => {
      let best = null
      for (const text of getChoiceResolutionTexts(choice)) {
        const labelNorm = normalizeRuntimeChoiceText(text)
        if (!labelNorm) continue
        if (labelNorm === inputNorm) {
          const exactScore = text === choice.label ? 1000 : 1100
          best = { choice, score: exactScore, exact: true }
          break
        }

        const labelTokens = tokenizeRuntimeChoiceText(text)
        if (!labelTokens.length) continue

        const matchedLabelTokens = labelTokens.filter(labelToken => (
          inputTokens.some(inputToken => runtimeTokensMatch(inputToken, labelToken))
        ))
        const matchedInputTokens = inputTokens.filter(inputToken => (
          labelTokens.some(labelToken => runtimeTokensMatch(inputToken, labelToken))
        ))

        const labelCoverage = matchedLabelTokens.length / labelTokens.length
        const inputCoverage = matchedInputTokens.length / inputTokens.length

        let score = null
        if (matchedLabelTokens.length === labelTokens.length && inputCoverage >= 0.6) {
          score = 800 + matchedLabelTokens.length
        } else if (matchedInputTokens.length === inputTokens.length && matchedInputTokens.length >= 2 && labelCoverage >= 0.6) {
          score = 700 + matchedInputTokens.length
        } else if (matchedLabelTokens.length >= 2 && labelCoverage >= 0.75 && inputCoverage >= 0.75) {
          score = 500 + matchedLabelTokens.length
        }

        if (score == null) continue
        if (!best || score > best.score) {
          best = { choice, score, exact: false }
        }
      }

      return best
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
    return null
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

export function rebuildVisibleChoices({
  section = null,
  sceneState = null,
  assistantText = '',
  combatActive = false,
  runtimeModule = false,
  inventoryCount = 0,
} = {}) {
  if (!section || !sceneState || combatActive) return []

  const sceneWithItemCount = {
    ...sceneState,
    _currentItemCount: inventoryCount || 0,
  }

  return buildAvailableChoices({
    aiResponse: runtimeModule ? '' : assistantText,
    section,
    sceneState: sceneWithItemCount,
    combatActive,
    isRuntimeModule: runtimeModule,
  })
}

export function shouldBuildChoicesAfterResponse({ combatActive = false, pendingCheck = null } = {}) {
  return !combatActive && !pendingCheck
}
