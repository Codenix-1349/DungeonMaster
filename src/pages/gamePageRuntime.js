import { buildAvailableChoices, getChoiceActionKey, inferCheckFromLabel } from '../engine/choiceEngine'
import { formatProbeHinweisTags, stripCheckTags, stripProbeHintTags } from '../services/openrouter'
import {
  ENEMY_PRESETS,
  applyReveals,
  findInteractionDef,
  findSectionById,
  normalizeAdventureEntry,
  resolveInteractionOutcome,
  resolveReveals,
} from '../data/srd'
import {
  getVisibleRuntimeNpcs,
  isRuntimeStructure,
} from '../data/runtimeModule'

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

export function resolveResolvedChoiceSubmission({
  choice = null,
  sceneState = null,
  adventure = null,
} = {}) {
  if (!choice) return null

  if (choice.kind === 'free') {
    return {
      type: 'free',
    }
  }

  if (choice.check) {
    return {
      type: 'pending_check',
      pendingChoiceMeta: createPendingChoiceMeta(choice),
      pendingCheck: createPendingCheckFromChoice(choice),
    }
  }

  let nextSceneState = null
  let inventoryAdds = []

  if (choice.interactionId && sceneState && adventure) {
    const normalizedAdventure = normalizeAdventureEntry(adventure)
    const structure = normalizedAdventure?.structure || null
    const interactionDef = structure ? findInteractionDef(structure, choice.interactionId) : null
    const resolved = resolveInteractionOutcome(sceneState, interactionDef, structure?.module, 'success')
    if (resolved?.sceneState) nextSceneState = resolved.sceneState
    if (resolved?.inventoryAdds?.length) inventoryAdds = resolved.inventoryAdds
  }

  return {
    type: 'submit',
    submitText: choice.label,
    recentActionKey: choice.actionKey || null,
    sceneStateOverride: nextSceneState,
    inventoryAdds,
    sendOptions: {
      allowEngineCheckInference: false,
      skipTextChoiceResolution: true,
      recentActionKey: choice.actionKey || null,
    },
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
  'bitte', 'mal', 'doch', 'nur', 'will', 'moecht', 'wuerd',
])

// Verb synonym groups — stems in the same group are treated as equivalent during matching.
const VERB_SYNONYM_GROUPS = [
  ['untersuch', 'inspizier', 'pruef', 'schau', 'betracht', 'anschau', 'ansehen', 'durchsuch'],
  ['sprich', 'red', 'frag', 'unterhal', 'befrag', 'ansprech'],
  ['oeffn', 'aufmach', 'aufzieh', 'aufbrech'],
  ['nimm', 'greif', 'aufheb', 'einsteck', 'mitnehm'],
  ['kletter', 'erklimm', 'hinauf', 'hochklett'],
  ['ueberzeug', 'beruhig', 'ueberred', 'besaenftig', 'zureden'],
  ['schleich', 'versteck', 'heimlich', 'anschleich', 'leise'],
  ['benutz', 'verwend', 'nutz', 'einsetz', 'gebrauch'],
  ['zuend', 'anzuend', 'entzuend', 'beleucht', 'leucht'],
  ['lausch', 'hoer', 'horch'],
  ['geh', 'kehr', 'weiter', 'folg', 'verlass', 'betret'],
  ['les', 'studier', 'entschluessel'],
]

const RUNTIME_STRUCTURED_ACTION_STEMS = [
  'benutz', 'verwend', 'nutz', 'einsetz', 'gebrauch',
  'zuend', 'anzuend', 'entzuend', 'beleucht', 'leucht',
  'geh', 'kehr', 'weiter', 'folg', 'verlass', 'betret',
  'les', 'studier', 'entschluessel',
]

const RUNTIME_ESCALATION_STEMS = [
  'angreif', 'kaempf', 'schlag', 'tret', 'hau', 'stich', 'stech', 'ramm',
  'beleidig', 'beschimpf', 'droh', 'provozier', 'anschrei', 'streit',
]

// Pre-build a stem → group-index lookup for O(1) synonym checks.
const _synonymLookup = new Map()
for (let gi = 0; gi < VERB_SYNONYM_GROUPS.length; gi++) {
  for (const stem of VERB_SYNONYM_GROUPS[gi]) _synonymLookup.set(stem, gi)
}

function areSynonymStems(a, b) {
  if (!a || !b) return false
  const gA = _synonymLookup.get(a)
  if (gA == null) return false
  const gB = _synonymLookup.get(b)
  return gA === gB
}

function findSynonymGroup(stem) {
  return _synonymLookup.get(stem) ?? null
}

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
  if (shorter.length >= 4 && longer.startsWith(shorter)) return true
  // Check verb synonym groups — e.g. "schau" matches "untersuch"
  if (areSynonymStems(a, b)) return true
  // Check prefix overlap with synonym stems
  const gA = findSynonymGroup(a)
  const gB = findSynonymGroup(b)
  if (gA != null && gB == null) {
    return VERB_SYNONYM_GROUPS[gA].some(syn => syn.length >= 4 && (b.startsWith(syn) || syn.startsWith(b)))
  }
  if (gB != null && gA == null) {
    return VERB_SYNONYM_GROUPS[gB].some(syn => syn.length >= 4 && (a.startsWith(syn) || syn.startsWith(a)))
  }
  return false
}

function getChoiceResolutionTexts(choice = {}) {
  const texts = [choice.label, ...(Array.isArray(choice.aliases) ? choice.aliases : [])]
  return texts.map(text => String(text || '').trim()).filter(Boolean)
}

function tokenMatchesStemList(token = '', stems = []) {
  if (!token) return false
  return stems.some(stem => runtimeTokensMatch(token, stem))
}

function isVerbLikeRuntimeToken(token = '') {
  if (!token) return false
  return (
    findSynonymGroup(token) != null ||
    tokenMatchesStemList(token, RUNTIME_STRUCTURED_ACTION_STEMS) ||
    tokenMatchesStemList(token, RUNTIME_ESCALATION_STEMS)
  )
}

function getEntityRuntimeTokens(tokens = []) {
  return tokens.filter(token => !isVerbLikeRuntimeToken(token))
}

function getChoiceResolutionTokens(choice = {}) {
  const tokens = []
  for (const text of getChoiceResolutionTexts(choice)) {
    for (const token of tokenizeRuntimeChoiceText(text)) {
      if (!tokens.some(existing => existing === token)) tokens.push(token)
    }
  }
  return tokens
}

function countRuntimeTokenOverlaps(sourceTokens = [], candidateTokens = []) {
  return sourceTokens.filter(sourceToken => (
    candidateTokens.some(candidateToken => runtimeTokensMatch(sourceToken, candidateToken))
  ))
}

function scoreParameterizedChoiceMatch(choice, inputTokens) {
  const choiceTokens = getChoiceResolutionTokens(choice)
  if (!choiceTokens.length) return 0

  const inputEntityTokens = getEntityRuntimeTokens(inputTokens)
  const choiceEntityTokens = getEntityRuntimeTokens(choiceTokens)
  const matchedEntityTokens = countRuntimeTokenOverlaps(choiceEntityTokens, inputEntityTokens)
  const matchedInputTokens = countRuntimeTokenOverlaps(inputTokens, choiceTokens)
  const hasVerbOverlap = inputTokens.some(inputToken => (
    choiceTokens.some(choiceToken => (
      runtimeTokensMatch(inputToken, choiceToken) &&
      (isVerbLikeRuntimeToken(inputToken) || isVerbLikeRuntimeToken(choiceToken))
    ))
  ))

  if (matchedEntityTokens.length >= 2) {
    return 620 + (matchedEntityTokens.length * 20) + (matchedInputTokens.length * 5) + (hasVerbOverlap ? 15 : 0)
  }

  if (matchedEntityTokens.length >= 1 && hasVerbOverlap && matchedInputTokens.length >= 2) {
    return 540 + (matchedInputTokens.length * 10)
  }

  return 0
}

// Target-based fallback: match input against choice target names + action verbs.
// "untersuche Schreibtisch" → finds interaction with target label containing "Schreibtisch".
function scoreTargetMatch(choice, inputTokens) {
  if (!choice.target) return 0
  const targetTokens = getEntityRuntimeTokens(getChoiceResolutionTokens(choice))
  // At least one input token must match a target-related token in the label
  const targetHit = inputTokens.some(it => targetTokens.some(tt => runtimeTokensMatch(it, tt)))
  if (!targetHit) return 0
  // At least one input token should be an action verb (synonym-aware)
  const hasVerb = inputTokens.some(it => isVerbLikeRuntimeToken(it))
  return hasVerb ? 400 : 300
}

function inputReferencesKnownRuntimeEntity(inputTokens = [], choices = []) {
  const inputEntityTokens = getEntityRuntimeTokens(inputTokens)
  if (!inputEntityTokens.length) return false

  return choices.some(choice => {
    const choiceEntityTokens = getEntityRuntimeTokens(getChoiceResolutionTokens(choice))
    return inputEntityTokens.some(inputToken => (
      choiceEntityTokens.some(choiceToken => runtimeTokensMatch(inputToken, choiceToken))
    ))
  })
}

const RUNTIME_ESCALATION_ATTACK_STEMS = ['angreif', 'kaempf', 'schlag', 'tret', 'hau', 'stich', 'stech', 'ramm']
const RUNTIME_ESCALATION_THREAT_STEMS = ['droh', 'bedroh', 'einschuechter', 'erpress']
const RUNTIME_ESCALATION_INSULT_STEMS = ['beleidig', 'beschimpf', 'provozier', 'anschrei', 'streit', 'verspott']

function clampRuntimeMeter(value = 0, min = 0, max = 10) {
  return Math.max(min, Math.min(max, Number(value) || 0))
}

function normalizeRuntimeDisposition(value = 'neutral') {
  const normalized = String(value || '').trim().toLowerCase()
  if (['friendly', 'helpful', 'ally', 'vertrauensvoll'].includes(normalized)) return 'friendly'
  if (['wary', 'guarded', 'suspicious', 'misstrauisch'].includes(normalized)) return 'wary'
  if (['hostile', 'feindselig', 'aggressive'].includes(normalized)) return 'hostile'
  return 'neutral'
}

function shiftRuntimeDisposition(disposition = 'neutral', delta = 0) {
  const ladder = ['hostile', 'wary', 'neutral', 'friendly']
  const start = ladder.indexOf(normalizeRuntimeDisposition(disposition))
  const safeStart = start >= 0 ? start : ladder.indexOf('neutral')
  const nextIndex = Math.max(0, Math.min(ladder.length - 1, safeStart + (Number(delta) || 0)))
  return ladder[nextIndex]
}

function mapRuntimeSuspicion(value = 0) {
  if (typeof value === 'number') return clampRuntimeMeter(value)

  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'none') return 0
  if (normalized === 'low') return 2
  if (normalized === 'medium') return 5
  if (normalized === 'high') return 8
  return clampRuntimeMeter(Number(value) || 0)
}

function normalizeRuntimeEngagementState(value = 'open') {
  const normalized = String(value || '').trim().toLowerCase()
  if (['warned', 'withdrawn', 'hostile'].includes(normalized)) return normalized
  return 'open'
}

function createRuntimeNpcRelation(structure, npcId, previousRelation = null) {
  const registry = structure?.module?.npcRegistry || {}
  const definition = registry[npcId] || {}
  const relation = previousRelation || {}

  return {
    ...relation,
    disposition: normalizeRuntimeDisposition(relation.disposition ?? definition.relationship ?? 'neutral'),
    suspicion: mapRuntimeSuspicion(relation.suspicion ?? definition.suspicion ?? 0),
    threat: clampRuntimeMeter(relation.threat ?? definition.threat ?? 0),
    warningsIssued: Math.max(0, Number(relation.warningsIssued) || 0),
    engagementState: normalizeRuntimeEngagementState(relation.engagementState || 'open'),
    lastTopic: String(relation.lastTopic ?? definition.lastTopic ?? ''),
  }
}

function getRuntimeEscalationIntent(inputTokens = [], userText = '') {
  const normalizedText = normalizeRuntimeChoiceText(userText)
  if (/\bgreif\w*\b.*\ban\b/.test(normalizedText)) return 'attack'
  if (inputTokens.some(token => tokenMatchesStemList(token, RUNTIME_ESCALATION_ATTACK_STEMS))) return 'attack'
  if (inputTokens.some(token => tokenMatchesStemList(token, RUNTIME_ESCALATION_THREAT_STEMS))) return 'threat'
  if (inputTokens.some(token => tokenMatchesStemList(token, RUNTIME_ESCALATION_INSULT_STEMS))) return 'insult'
  if (inputTokens.some(token => tokenMatchesStemList(token, RUNTIME_ESCALATION_STEMS))) return 'insult'
  return null
}

function getRuntimeNpcNameTokens(npc = {}) {
  const texts = [npc.id, npc.name]
  const tokens = []
  for (const text of texts) {
    for (const token of tokenizeRuntimeChoiceText(text || '')) {
      if (!tokens.includes(token)) tokens.push(token)
    }
  }
  return tokens
}

function resolveRuntimeEscalationTarget({ structure = null, sceneState = null, section = null, inputTokens = [] } = {}) {
  if (!structure || !sceneState || !section) {
    return { type: 'blocked', message: 'Diese Eskalation kann ohne aktiven Runtime-Kontext nicht engine-seitig aufgeloest werden.' }
  }

  const visibleNpcs = getVisibleRuntimeNpcs(structure, section, sceneState)
  if (!visibleNpcs.length) {
    return { type: 'blocked', message: 'Hier ist aktuell kein sichtbarer NSC, gegen den diese Eskalation sinnvoll aufgeloest werden kann.' }
  }

  const explicitMatches = visibleNpcs.filter(npc => {
    const npcTokens = getRuntimeNpcNameTokens(npc)
    return inputTokens.some(inputToken => npcTokens.some(npcToken => runtimeTokensMatch(inputToken, npcToken)))
  })

  if (explicitMatches.length === 1) {
    return { type: 'resolved', npc: explicitMatches[0] }
  }

  if (explicitMatches.length > 1) {
    return {
      type: 'ambiguous',
      message: `Diese Eskalation ist nicht eindeutig. Nenne die betroffene Person direkt: ${explicitMatches.map(npc => npc.name).join(', ')}.`,
    }
  }

  const activeNpcId = sceneState?.dialogueState?.activeNpcId || null
  const activeVisibleNpc = activeNpcId
    ? visibleNpcs.find(npc => npc.id === activeNpcId)
    : null

  if (activeVisibleNpc) {
    return { type: 'resolved', npc: activeVisibleNpc }
  }

  if (visibleNpcs.length === 1) {
    return { type: 'resolved', npc: visibleNpcs[0] }
  }

  return {
    type: 'ambiguous',
    message: `Diese Eskalation ist nicht eindeutig einem sichtbaren NSC zugeordnet. Nenne die Person direkt: ${visibleNpcs.map(npc => npc.name).join(', ')}.`,
  }
}

function getRuntimeEscalationPolicy(npcDef = {}) {
  const policy = npcDef?.escalationPolicy || {}
  const combatPreset = policy.combatPreset || npcDef?.combatPreset || null
  const combatProfile = policy.combatProfile || npcDef?.combatProfile || null
  const canStartCombat = Boolean(policy.canStartCombat ?? npcDef?.canStartCombat ?? combatPreset ?? combatProfile)

  return {
    withdrawThreshold: Math.max(1, Number(policy.withdrawThreshold ?? npcDef?.withdrawThreshold ?? 2) || 2),
    combatThreshold: Math.max(2, Number(policy.combatThreshold ?? npcDef?.combatThreshold ?? 4) || 4),
    immediateCombatOnAttack: policy.immediateCombatOnAttack ?? npcDef?.immediateCombatOnAttack ?? true,
    canStartCombat,
    combatPreset,
    combatProfile,
  }
}

function buildRuntimeCombatEnemy(npc = {}, npcDef = {}) {
  const policy = getRuntimeEscalationPolicy(npcDef)
  const profile = policy.combatProfile || {}
  const presetKey = String(policy.combatPreset || '').trim().toLowerCase()
  const preset = presetKey ? ENEMY_PRESETS[presetKey] : null
  if (!preset && !profile?.hp) return null

  const base = preset || {}
  const maxHP = Math.max(1, Number(profile.hp ?? base.hp ?? 0) || 1)
  const damageDice = String(profile.damageDice || (
    base.damageDice
      ? `${base.damageDice}${base.damageBonus ? (base.damageBonus >= 0 ? `+${base.damageBonus}` : `${base.damageBonus}`) : ''}`
      : '1d6'
  ))

  return {
    id: `runtime-enemy-${npc.id || npc.name || 'npc'}`,
    name: profile.name || npcDef?.combatName || npc.name || base.name || 'Gegner',
    maxHP,
    currentHP: maxHP,
    ac: Math.max(8, Number(profile.ac ?? base.ac ?? 12) || 12),
    attackBonus: Number(profile.attackBonus ?? base.attackBonus ?? 3) || 3,
    damageDice,
    xp: Math.max(0, Number(profile.xp ?? base.xp ?? 25) || 25),
    initiativeBonus: Number(profile.initiativeBonus ?? base.initiativeBonus ?? 0) || 0,
  }
}

function getEscalationConsequenceText({ intent, outcome, npcName }) {
  if (outcome === 'combat_start') {
    return `${npcName} reagiert sofort feindselig, und die Situation kippt in offenen Kampf.`
  }
  if (outcome === 'withdrawn') {
    if (intent === 'attack') {
      return `${npcName} weicht hart zurueck, bricht jedes Gespraech ab und haelt sich deutlich von dir fern.`
    }
    if (intent === 'threat') {
      return `${npcName} erstarrt kurz, zieht sich dann sichtbar von dir zurueck und verweigert jedes weitere Gespraech.`
    }
    return `${npcName} verhaertet den Blick, beendet das Gespraech und zieht sich deutlich von dir zurueck.`
  }
  if (intent === 'threat') {
    return `${npcName} spannt sich sichtbar an und warnt dich scharf, dass weitere Drohungen Folgen haben werden.`
  }
  return `${npcName} reagiert sofort gereizt und warnt dich scharf vor weiteren Beschimpfungen.`
}

function resolveRuntimeEscalation({
  userText = '',
  inputTokens = [],
  adventure = null,
  sceneState = null,
  section = null,
} = {}) {
  const normalizedAdventure = normalizeAdventureEntry(adventure)
  const structure = normalizedAdventure?.structure || null
  if (!isRuntimeStructure(structure) || !sceneState || !section) {
    return null
  }

  const intent = getRuntimeEscalationIntent(inputTokens, userText)
  if (!intent) return null

  const targetResolution = resolveRuntimeEscalationTarget({
    structure,
    sceneState,
    section,
    inputTokens,
  })

  if (targetResolution?.type === 'ambiguous' || targetResolution?.type === 'blocked') {
    return targetResolution
  }

  const targetNpc = targetResolution?.npc || null
  if (!targetNpc?.id) {
    return {
      type: 'blocked',
      message: 'Diese Eskalation konnte keinem sichtbaren NSC zugeordnet werden.',
    }
  }

  const npcDef = structure?.module?.npcRegistry?.[targetNpc.id] || {}
  const policy = getRuntimeEscalationPolicy(npcDef)
  const currentRelation = createRuntimeNpcRelation(
    structure,
    targetNpc.id,
    sceneState?.dialogueState?.npcRelations?.[targetNpc.id]
  )

  const threatDelta = intent === 'attack' ? 4 : intent === 'threat' ? 2 : 1
  const suspicionDelta = intent === 'attack' ? 3 : intent === 'threat' ? 2 : 1
  const warningsDelta = intent === 'attack' ? 1 : 1
  const nextThreat = clampRuntimeMeter(currentRelation.threat + threatDelta)
  const nextSuspicion = clampRuntimeMeter(currentRelation.suspicion + suspicionDelta)
  const warningsIssued = currentRelation.warningsIssued + warningsDelta
  const worsenedDisposition = shiftRuntimeDisposition(currentRelation.disposition, -1)

  const canResolveCombat = policy.canStartCombat && Boolean(policy.combatPreset || policy.combatProfile)
  const combatTriggered = canResolveCombat && (
    (intent === 'attack' && policy.immediateCombatOnAttack) ||
    nextThreat >= policy.combatThreshold
  )
  const withdrawn = !combatTriggered && (intent === 'attack' || nextThreat >= policy.withdrawThreshold)
  const outcome = combatTriggered ? 'combat_start' : withdrawn ? 'withdrawn' : 'warning'

  const nextRelation = {
    ...currentRelation,
    disposition: outcome === 'combat_start' ? 'hostile' : worsenedDisposition,
    suspicion: nextSuspicion,
    threat: outcome === 'combat_start' ? Math.max(nextThreat, policy.combatThreshold) : nextThreat,
    warningsIssued,
    engagementState: outcome === 'combat_start'
      ? 'hostile'
      : outcome === 'withdrawn'
        ? 'withdrawn'
        : 'warned',
    lastTopic: String(userText || '').trim().slice(0, 80),
  }

  const nextSceneState = {
    ...sceneState,
    dialogueState: {
      ...(sceneState.dialogueState || {}),
      activeNpcId: targetNpc.id,
      npcRelations: {
        ...(sceneState.dialogueState?.npcRelations || {}),
        [targetNpc.id]: nextRelation,
      },
    },
  }

  const combatEnemy = outcome === 'combat_start'
    ? buildRuntimeCombatEnemy(targetNpc, npcDef)
    : null
  const consequence = getEscalationConsequenceText({
    intent,
    outcome,
    npcName: targetNpc.name,
  })

  return {
    type: 'authoritative_escalation',
    sceneStateOverride: nextSceneState,
    combatOverride: combatEnemy
      ? { active: true, round: 1, enemies: [combatEnemy], playerInitiative: 0, phase: 'initiative' }
      : null,
    runtimeRequestMode: 'runtime_authoritative_resolution',
    runtimeResolution: {
      kind: 'escalation',
      intent,
      outcome,
      npcId: targetNpc.id,
      npcName: targetNpc.name,
      consequence,
    },
    recentActionKey: `esc:${intent}:${targetNpc.id}`,
  }
}

export function resolveUnmatchedRuntimeInput({
  userText = '',
  choices = [],
  adventure = null,
  sceneState = null,
  section = null,
} = {}) {
  const inputTokens = tokenizeRuntimeChoiceText(userText)
  if (!inputTokens.length) return null

  const escalationResolution = resolveRuntimeEscalation({
    userText,
    inputTokens,
    adventure,
    sceneState,
    section,
  })
  if (escalationResolution?.type === 'authoritative_escalation') {
    return escalationResolution
  }
  if (escalationResolution?.type === 'ambiguous' || escalationResolution?.type === 'blocked') {
    return {
      type: 'needs_clarification',
      message: escalationResolution.message,
    }
  }

  const referencesKnownEntity = inputReferencesKnownRuntimeEntity(inputTokens, choices)
  const hasStructuredIntent = inputTokens.some(token => isVerbLikeRuntimeToken(token))
  if (referencesKnownEntity && hasStructuredIntent) {
    return {
      type: 'needs_clarification',
      message: 'Diese Eingabe passt hier nicht eindeutig zu einer verfuegbaren Handlung. Nutze eine sichtbare Aktion oder formuliere Ziel und Mittel noch klarer.',
    }
  }

  return {
    type: 'flavor_only',
    runtimeRequestMode: 'runtime_flavor_only',
  }
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

      if (!best || best.score < 700) {
        const parameterizedScore = scoreParameterizedChoiceMatch(choice, inputTokens)
        if (parameterizedScore > 0 && (!best || parameterizedScore > best.score)) {
          best = { choice, score: parameterizedScore, exact: false }
        }
      }

      // Target-based fallback when label matching didn't produce a strong hit
      if (!best || best.score < 500) {
        const targetScore = scoreTargetMatch(choice, inputTokens)
        if (targetScore > 0 && (!best || targetScore > best.score)) {
          best = { choice, score: targetScore, exact: false }
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

/**
 * Strip AI-generated option lists from runtime module responses.
 * Free models often ignore prompt instructions and generate numbered lists,
 * bold options in brackets, or trailing "Was tust du?" prompts.
 * The app shows authored choices as buttons — AI text should be narration only.
 */
function stripAiGeneratedOptions(text = '') {
  return text
    // Numbered option lines: "1. Something" or "1) Something" at start of line
    .replace(/^[ \t]*\d+[.)]\s+.+$/gm, '')
    // Bullet point lines: "* Something", "- Something", "• Something"
    .replace(/^[ \t]*[*\-•]\s+.+$/gm, '')
    // Bold option blocks in brackets: [**option1**, **option2**]
    .replace(/\[?\*\*[^*]+\*\*(?:\s*,\s*\*\*[^*]+\*\*)*\]?/g, '')
    // Standalone bold option lines: "**Something**" as a full line
    .replace(/^[ \t]*\*\*[^*]+\*\*[ \t]*$/gm, '')
    // Headers like "Sichtbare Optionen:", "Deine Möglichkeiten:", "Optionen:"
    .replace(/^[ \t]*\*{0,2}(Sichtbare\s+)?Optionen\s*:?\*{0,2}[ \t]*$/gim, '')
    .replace(/^[ \t]*\*{0,2}(Deine\s+)?(Möglichkeiten|Handlungsoptionen|Auswahlmöglichkeiten)\s*:?\*{0,2}[ \t]*$/gim, '')
    // Trailing "Was tust du?" / "Was möchtest du tun?" / "Wie möchtest du vorgehen?"
    .replace(/\s*(Was\s+(tust|möchtest|machst)\s+du\s*\??|Wie\s+möchtest\s+du\s+vorgehen\s*\??)\s*$/gi, '')
    // Trailing summary fragments: short lines at the end without sentence punctuation
    .replace(/(\n[ \t]*[^\n.!?]{5,60}){2,}$/g, '')
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function formatAssistantTextForDisplay(rawText = '', getLabel, { runtimeModule = false } = {}) {
  const withoutCheckTags = stripCheckTags(rawText)
  if (runtimeModule) return stripAiGeneratedOptions(stripProbeHintTags(withoutCheckTags))
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
