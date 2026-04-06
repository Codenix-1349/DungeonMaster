import {
  normalizeAdventureEntry, truncateText, firstSentences,
  tokenizeText, extractKeywords, splitSentences, normalizeShortList,
} from './adventureParser'
import {
  extractCluesFromMessages, extractOpenThreads, extractDiscoveredNpcs,
  inferDispositionShift, inferSuspicionShift,
  extractNpcStateChanges, extractObjectStateChanges, detectActiveNpc,
} from './knowledgeModel'
import {
  buildInitialRuntimeNpcStates,
  getVisibleRuntimeNpcs,
  isRuntimeStructure,
  normalizeRuntimeNpcState,
  resolveRuntimeNpcId,
} from './runtimeModule'

export const SCENE_STATE_VERSION = 3

// ─── Scoring & Helpers ──────────────────────────────────────────────────────

function scoreChunkAgainstTokens(chunk, tokens = []) {
  let score = 0
  for (const token of tokens) {
    if (chunk.lower.includes(token)) score += token.length >= 8 ? 3 : 2
    if (chunk.keywords.includes(token)) score += 2
  }
  return score
}

function scoreSectionAgainstTokens(section, tokens = []) {
  let score = 0
  for (const token of tokens) {
    if (section.searchText.includes(token)) score += token.length >= 8 ? 3 : 2
    if (section.keywords.includes(token)) score += 3
  }
  return score
}

function deriveObjectiveFromUserText(userText = '', previousObjective = '') {
  const trimmed = truncateText(userText, 140)
  if (!trimmed) return previousObjective || 'Die Umgebung erkunden und auf neue Informationen reagieren.'

  const generic = ['ok', 'weiter', 'los', 'ja', 'nein', 'hm', 'hmm']
  if (generic.includes(trimmed.toLowerCase())) return previousObjective || 'Die aktuelle Szene weiterverfolgen.'

  return trimmed
}

function mergeNotableElements(section = null, recentText = '') {
  const sectionKeywords = section?.keywords || []
  const recentKeywords = extractKeywords(recentText, 6)
  return [...new Set([...sectionKeywords, ...recentKeywords])].slice(0, 6)
}

function getStructuredSectionPlayerObjective(structure, section, fallback = '') {
  if (!section) return fallback || ''
  if (isRuntimeStructure(structure)) {
    return section.playerObjective || section.objective || fallback || ''
  }
  return section.objective || fallback || ''
}

function getStructuredPrimaryQuest(structure, fallback = '') {
  if (!structure?.module) return fallback || ''
  if (isRuntimeStructure(structure)) {
    return structure.module.playerPrimaryObjective || structure.module.primaryObjective || fallback || ''
  }
  return structure.module.primaryObjective || fallback || ''
}

function buildInitialRuntimeKnownNpcNames(structure, section, npcStates) {
  if (!isRuntimeStructure(structure) || !section) return []

  return getVisibleRuntimeNpcs(structure, section, {
    gmState: {
      currentSectionId: section.id,
      npcStates,
    },
  }).map(entry => entry.name)
}

export function findSectionById(structure, sectionId) {
  return structure?.sections?.find(section => section.id === sectionId) || null
}

// ─── Engine-Driven Reveal Resolution ─────────────────────────────────────────
// Checks section.reveals[] against the interaction target. Reveals are defined
// in adventure data (engine truth), NOT parsed from AI text.
//
// section.reveals[] schema (future structured adventure format):
//   { id, label, trigger, actions?: [{ label, check? }], kind? }
//
// trigger: label of a static interactiveObject OR id of a previously revealed object.
// When player successfully interacts with an object matching trigger → reveal activates.

export function resolveReveals(section, sceneState, interactionTarget) {
  const reveals = section?.reveals || []
  if (!reveals.length || !interactionTarget) return []

  const existing = sceneState?.gmState?.runtimeDiscoveries || []
  const existingIds = new Set(existing.map(d => d.revealId))
  const targetLower = interactionTarget.toLowerCase()

  return reveals.filter(reveal => {
    if (existingIds.has(reveal.id)) return false // already discovered
    const triggerLower = (reveal.trigger || '').toLowerCase()
    // Match: trigger equals target label (static object) OR target matches a revealed object's label whose revealId equals trigger
    if (triggerLower === targetLower) return true
    // Check if trigger references a revealed object's ID, and the target matches that object's label
    const parentReveal = existing.find(d => d.revealId === triggerLower)
    if (parentReveal && parentReveal.label.toLowerCase() === targetLower) return true
    return false
  })
}

export function applyReveals(sceneState, matchedReveals = []) {
  if (!matchedReveals.length || !sceneState) return sceneState
  const existing = sceneState.gmState?.runtimeDiscoveries || []
  const sectionId = sceneState.gmState?.currentSectionId
  const turn = sceneState.turnCount || 0

  const newEntries = matchedReveals.map(reveal => ({
    revealId: reveal.id,
    sectionId,
    label: reveal.label,
    kind: reveal.kind || 'object',
    visible: true,
    state: 'revealed',
    source: 'engine',
    trigger: reveal.trigger,
    turn,
  }))

  return {
    ...sceneState,
    gmState: {
      ...sceneState.gmState,
      runtimeDiscoveries: [...existing, ...newEntries],
    },
  }
}

// ─── Interaction-Based Resolution (Runtime Module) ──────────────────────────
// For the new runtime module format: interactions define results with setFlags,
// revealClues, revealRuntime (objects + interactions), npcUpdates, objectStateUpdates.

export function findInteractionDef(structure, interactionId) {
  if (!structure?.sections || !interactionId) return null
  for (const section of structure.sections) {
    const intr = (section.interactions || []).find(i => i.id === interactionId)
    if (intr) return intr
  }
  return null
}

function getInteractionResult(interaction, outcome = 'success') {
  if (!interaction?.results) return null
  if (outcome === 'failure' || outcome === 'fail') {
    return interaction.results.failure || interaction.results.fail || null
  }
  return interaction.results.success || null
}

function buildPortableTakeEffects(sceneState, interaction, module, outcome = 'success') {
  if (outcome !== 'success' || interaction?.kind !== 'take' || !interaction?.target) {
    return { inventoryAdds: [], objectUpdates: [], suppressTargetInteractions: false }
  }

  const objectId = interaction.target
  const objectDef = module?.objectRegistry?.[objectId]
  const runtimeObject = sceneState?.gmState?.runtimeObjects?.[objectId]
  if (!objectDef?.portable || !runtimeObject || runtimeObject.suppressed === true) {
    return { inventoryAdds: [], objectUpdates: [], suppressTargetInteractions: false }
  }

  return {
    inventoryAdds: [runtimeObject.label || interaction.label || objectId],
    objectUpdates: [{ objectId, state: 'taken', suppressed: true, visible: false }],
    suppressTargetInteractions: true,
  }
}

export function resolveInteractionOutcome(sceneState, interaction, module, outcome = 'success') {
  const result = getInteractionResult(interaction, outcome)
  if (!result || !sceneState) return { sceneState, inventoryAdds: [] }

  let gm = { ...sceneState.gmState }
  let pk = { ...sceneState.playerKnowledge }
  const takeEffects = buildPortableTakeEffects(sceneState, interaction, module, outcome)

  // 1. Set flags
  if (result.setFlags?.length) {
    const flags = { ...gm.plotFlags }
    for (const flag of result.setFlags) flags[flag] = true
    gm = { ...gm, plotFlags: flags }
  }

  // 2. Reveal clues (registry-based)
  if (result.revealClues?.length && module?.clueRegistry) {
    const revealed = [...(gm.revealedClueIds || [])]
    const clues = [...(pk.discoveredClues || [])]
    for (const clueId of result.revealClues) {
      if (!revealed.includes(clueId)) {
        revealed.push(clueId)
        const def = module.clueRegistry[clueId]
        if (def?.text && !clues.includes(def.text)) clues.push(def.text)
      }
    }
    gm = { ...gm, revealedClueIds: revealed }
    pk = { ...pk, discoveredClues: clues }
  }

  // 3. Reveal runtime objects
  if (result.revealRuntime?.objects?.length) {
    const objects = { ...(gm.runtimeObjects || {}) }
    for (const obj of result.revealRuntime.objects) {
      objects[obj.id] = { ...obj }
    }
    gm = { ...gm, runtimeObjects: objects }
  }

  // 4. Reveal runtime interactions
  if (result.revealRuntime?.interactions?.length) {
    const interactions = { ...(gm.runtimeInteractions || {}) }
    for (const intr of result.revealRuntime.interactions) {
      interactions[intr.id] = { ...intr }
    }
    gm = { ...gm, runtimeInteractions: interactions }
  }

  // 5. NPC updates
  if (result.npcUpdates?.length) {
    const npcStates = { ...(gm.npcStates || {}) }
    const currentSectionId = gm.currentSectionId || sceneState.gmState?.currentSectionId || null
    for (const upd of result.npcUpdates) {
      const nextState = { ...normalizeRuntimeNpcState(npcStates[upd.npcId]), ...upd }
      if (nextState.currentlyVisible === true && !nextState.sectionId && currentSectionId) {
        nextState.sectionId = currentSectionId
      }
      npcStates[upd.npcId] = nextState
    }
    gm = { ...gm, npcStates: npcStates }
  }

  // 6. Object state updates
  const objectStateUpdates = [...(result.objectStateUpdates || []), ...takeEffects.objectUpdates]
  if (objectStateUpdates.length) {
    const ro = { ...(gm.runtimeObjects || {}) }
    for (const upd of objectStateUpdates) {
      if (!ro[upd.objectId]) continue
      const { objectId, ...changes } = upd
      const nextObject = { ...ro[objectId], ...changes }
      if (changes.suppressed === true) nextObject.visible = false
      ro[objectId] = nextObject
    }
    gm = { ...gm, runtimeObjects: ro }
  }

  if (takeEffects.suppressTargetInteractions && interaction?.target) {
    const runtimeInteractions = { ...(gm.runtimeInteractions || {}) }
    for (const [interactionId, runtimeInteraction] of Object.entries(runtimeInteractions)) {
      if (runtimeInteraction?.target !== interaction.target) continue
      runtimeInteractions[interactionId] = {
        ...runtimeInteraction,
        suppressed: true,
        visible: false,
      }
    }
    gm = { ...gm, runtimeInteractions }
  }

  return {
    sceneState: { ...sceneState, gmState: gm, playerKnowledge: pk },
    inventoryAdds: takeEffects.inventoryAdds,
  }
}

export function applyInteractionOutcome(sceneState, interaction, module, outcome = 'success') {
  return resolveInteractionOutcome(sceneState, interaction, module, outcome).sceneState
}

export function applyInteractionSuccess(sceneState, interaction, module) {
  return applyInteractionOutcome(sceneState, interaction, module, 'success')
}

function computeSectionTransitionWeight(section, previousSection, latestUser = '') {
  if (!section || !previousSection) return 0
  if (section.id === previousSection.id) return 8
  if (Math.abs(section.index - previousSection.index) === 1) return 3

  const text = latestUser.toLowerCase()
  if (text.includes('zurück') || text.includes('wieder')) {
    return section.index < previousSection.index ? 3 : 0
  }
  if (text.includes('weiter') || text.includes('tiefer') || text.includes('nächste') || text.includes('hinein')) {
    return section.index > previousSection.index ? 3 : 0
  }
  return 0
}

export function selectRelevantChunks(structure, section, tokens = [], maxChunks = 3) {
  if (!structure || !section) return []

  const chunkCandidates = (section.chunkIndexes || [])
    .map(index => structure.chunks[index])
    .filter(Boolean)
    .map(chunk => ({
      ...chunk,
      score: scoreChunkAgainstTokens(chunk, tokens) + (chunk.index === section.chunkIndexes[0] ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)

  const picked = []
  const pickedIndexes = new Set()

  if (section.chunkIndexes[0] !== undefined) {
    const firstChunk = structure.chunks[section.chunkIndexes[0]]
    if (firstChunk) {
      picked.push(firstChunk)
      pickedIndexes.add(firstChunk.index)
    }
  }

  for (const chunk of chunkCandidates) {
    if (picked.length >= maxChunks) break
    if (pickedIndexes.has(chunk.index)) continue
    picked.push(chunk)
    pickedIndexes.add(chunk.index)
  }

  return picked.sort((a, b) => a.index - b.index)
}

// ─── Memory Summary & Transition Detection ──────────────────────────────────

function buildMemorySummary(previous, currentSection, latestOutcome, objective, isTransition = false) {
  const MAX_LEN = 400
  const prev = previous.memorySummary || ''

  // On scene transitions: insert a landmark marker to preserve key story beats
  const landmark = isTransition && currentSection?.title
    ? `[→ ${currentSection.title}]`
    : ''

  // Extract the most meaningful sentence from the latest outcome (not just first N chars)
  let condensedOutcome = ''
  if (latestOutcome) {
    const sentences = splitSentences(latestOutcome)
    // Prefer sentences with action/discovery keywords over pure description
    const meaningful = sentences.find(s =>
      /\b(entdeck|erfahr|erhalt|besieg|öffn|find|flieht|stirbt|warnt|verrät|überzeug|scheitert|gelingt)\b/i.test(s)
    )
    condensedOutcome = meaningful || sentences[0] || ''
    if (condensedOutcome.length > 160) condensedOutcome = condensedOutcome.slice(0, 157) + '...'
  }

  // Build new summary: landmarks + condensed outcomes
  const newPart = [landmark, condensedOutcome].filter(Boolean).join(' ')
  if (!newPart && !prev) return ''
  if (!newPart) return prev.length <= MAX_LEN ? prev : prev.slice(prev.length - MAX_LEN).replace(/^\S*\s/, '')

  const combined = prev ? `${prev} ${newPart}` : newPart
  if (combined.length <= MAX_LEN) return combined

  // When truncating, try to preserve landmark markers [→ ...] as story structure
  const landmarks = []
  const landmarkRe = /\[→ [^\]]+\]/g
  let lm
  while ((lm = landmarkRe.exec(combined)) !== null) landmarks.push(lm[0])

  // Keep last 2 landmarks + recent text
  const recentLandmarks = landmarks.slice(-2).join(' ')
  const recentText = combined.slice(combined.length - (MAX_LEN - recentLandmarks.length - 1)).replace(/^\S*\s/, '')
  const result = recentLandmarks ? `${recentLandmarks} ${recentText}` : recentText
  return result.slice(0, MAX_LEN)
}

function detectTransitionReason(previousSection, currentSection, latestUser = '', latestAssistant = '') {
  if (!previousSection || !currentSection) return ''
  if (previousSection.id === currentSection.id) return 'Abschnitt bleibt stabil.'

  const user = latestUser.toLowerCase()
  const assistant = latestAssistant.toLowerCase()

  if (user.includes('gehe') || user.includes('betrete') || user.includes('öffne') || user.includes('folge') || user.includes('verlasse')) {
    return 'Szenenwechsel durch bewusste Orts- oder Richtungsaktion des Spielers.'
  }

  if (assistant.includes(currentSection.title.toLowerCase())) {
    return 'Spielleitertext verweist klar auf einen neuen Abenteuerabschnitt.'
  }

  return 'Szenenwechsel durch stärkere Kontexttreffer im aktuellen Abenteuerabschnitt.'
}

// ─── Scene State Creation & Derivation ──────────────────────────────────────

export function createInitialSceneState(adventure) {
  const normalizedAdventure = normalizeAdventureEntry(adventure)
  const structure = normalizedAdventure?.structure
  const runtimeStructured = isRuntimeStructure(structure)

  // For structured adventures, use startSectionId from module header
  let startSection = null
  if (structure?.format === 'structured' && structure.module?.startSectionId) {
    startSection = findSectionById(structure, structure.module.startSectionId)
  }
  const firstSection = startSection || structure?.sections?.[0] || null

  const firstChunks = firstSection
    ? selectRelevantChunks(structure, firstSection, [], 2).map(chunk => chunk.index)
    : []

  // Structured adventures provide richer initial data
  const isStructured = structure?.format === 'structured'

  // Build initial plotFlags from setsOnEntry of the start section
  const initialFlags = {}
  if (isStructured && firstSection?.setsOnEntry?.length) {
    for (const flag of firstSection.setsOnEntry) initialFlags[flag] = true
  }

  const initialRuntimeNpcStates = runtimeStructured
    ? buildInitialRuntimeNpcStates(structure)
    : {}
  const initialKnownRuntimeNpcNames = runtimeStructured
    ? buildInitialRuntimeKnownNpcNames(structure, firstSection, initialRuntimeNpcStates)
    : []

  return {
    version: SCENE_STATE_VERSION,
    turnCount: 0,

    // ── GM State (engine truth) ──
    gmState: {
      currentSectionId: firstSection?.id || null,
      plotFlags: initialFlags,
      objectStates: {},
      npcStates: initialRuntimeNpcStates,
      triggeredEvents: [],
      sectionVisitCounts: firstSection ? { [firstSection.id]: 1 } : {},
      runtimeDiscoveries: [],
      runtimeObjects: {},
      runtimeInteractions: {},
      revealedClueIds: [],
    },

    // ── Player Knowledge (what the player knows) ──
    playerKnowledge: {
      knownNpcs: initialKnownRuntimeNpcNames,
      knownPlaces: firstSection ? [firstSection.title] : [],
      discoveredClues: [],
      knownFactions: [],
      knownFacts: [],
    },

    // ── Dialogue State (NPC interaction tracking) ──
    dialogueState: {
      activeNpcId: null,
      npcRelations: {},
    },

    // ── Memory Summary (compact session history) ──
    memorySummary: '',

    // ── Inferred (AI-derived soft hints, scene-scoped, initially empty) ──
    inferred: { source: 'ai_inferred', npcStates: {}, objectStates: {}, dialogueHints: {} },

    // ── Scene State (current narrative frame) ──
    currentSectionTitle: firstSection?.title || normalizedAdventure?.title || 'Abenteuerstart',
    currentLocation: (isStructured ? firstSection?.location : firstSection?.title) || normalizedAdventure?.title || 'Unbekannter Ort',
    relevantChunkIndexes: firstChunks,
    visitedSectionIds: firstSection ? [firstSection.id] : [],
    currentObjective: (isStructured ? getStructuredSectionPlayerObjective(structure, firstSection) : null) || 'Die erste Szene betreten und Informationen sammeln.',
    activeQuest: (isStructured ? getStructuredPrimaryQuest(structure) : null) || firstSection?.summary || 'Das Abenteuer beginnen und die Lage erfassen.',
    lastPlayerAction: '',
    recentActions: [],
    recentActionKeys: [],
    interactionHistory: [],
    lastOutcome: '',
    summary: firstSection?.summary || 'Das Abenteuer beginnt und die erste Szene wird aufgebaut.',
    openThreads: (isStructured ? firstSection?.openThreads?.slice(0, 4) : null) || (firstSection?.title ? [`Den Abschnitt „${firstSection.title}" erkunden.`] : []),
    notableElements: firstSection?.keywords?.slice(0, 6) || [],
    recentSceneChanges: [],
    stableSectionTurns: 1,
    lastTransitionReason: 'Start des Abenteuers.',
    lastUpdatedAt: new Date().toISOString(),
  }
}

// ── Recent Actions tracker (engine truth — player actually did these) ──────
// Tracks last 3 player actions for choice deduplication. Resets on section transition.
function buildRecentActions(previous = [], latestAction = '', isTransition = false) {
  if (isTransition) return latestAction?.length >= 3 ? [latestAction] : []
  if (!latestAction || latestAction.length < 3) return (previous || []).slice(0, 3)
  return [latestAction, ...(previous || [])].slice(0, 3)
}

function buildRecentActionKeys(previous = [], latestActionKey = null, isTransition = false) {
  if (isTransition) return latestActionKey ? [latestActionKey] : []
  if (!latestActionKey) return (previous || []).slice(0, 3)
  return [latestActionKey, ...(previous || []).filter(key => key !== latestActionKey)].slice(0, 3)
}

function normalizeStructuredActionText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeStructuredActionKeyPart(value = '') {
  return String(value).trim().toLowerCase()
}

function extractActionKeyId(actionKey = '', prefix = '') {
  const normalizedKey = String(actionKey || '').trim().toLowerCase()
  const normalizedPrefix = `${prefix}:`
  if (!normalizedKey.startsWith(normalizedPrefix)) return null
  return normalizedKey.slice(normalizedPrefix.length) || null
}

function findRuntimeInteractionFromActionKey(structure, previousSceneState, fallbackUserActionKey = '') {
  const interactionId = extractActionKeyId(fallbackUserActionKey, 'intr')
  if (!interactionId) return null

  const staticInteraction = findInteractionDef(structure, interactionId)
  if (staticInteraction) return staticInteraction

  return previousSceneState?.gmState?.runtimeInteractions?.[interactionId] || null
}

function resolveRuntimeActiveNpcId({
  structure,
  previousSceneState,
  currentSection,
  visibleRuntimeNpcs = [],
  fallbackUserActionKey = null,
  shouldTransition = false,
} = {}) {
  if (!isRuntimeStructure(structure)) return null
  if (shouldTransition) return null
  if (!currentSection) return null

  const interaction = findRuntimeInteractionFromActionKey(structure, previousSceneState, fallbackUserActionKey)
  if (interaction) {
    return resolveRuntimeNpcId(structure, interaction.target) || null
  }

  if (extractActionKeyId(fallbackUserActionKey, 'exit')) return null

  const previousActiveNpcId = previousSceneState?.dialogueState?.activeNpcId || null
  if (!previousActiveNpcId) return null

  return visibleRuntimeNpcs.some(entry => entry.id === previousActiveNpcId)
    ? previousActiveNpcId
    : null
}

function findStructuredExitTarget({
  previousSection,
  structure,
  latestUser = '',
  fallbackUserActionKey = null,
  isSectionAccessible = () => true,
} = {}) {
  if (structure?.format !== 'structured' || !previousSection?.exits?.length) return null

  const normalizedActionKey = String(fallbackUserActionKey || '').toLowerCase()
  if (normalizedActionKey.startsWith('exit:')) {
    const expectedKey = normalizedActionKey.slice('exit:'.length)
    const matchedExit = previousSection.exits.find(exit => (
      normalizeStructuredActionKeyPart(exit.id || exit.targetId || exit.label) === expectedKey ||
      normalizeStructuredActionText(exit.id || exit.targetId || exit.label) === expectedKey
    ))
    if (matchedExit?.targetId && matchedExit.targetId !== previousSection.id) {
      const candidate = findSectionById(structure, matchedExit.targetId)
      if (candidate && isSectionAccessible(candidate)) return candidate
    }
  }

  const normalizedUser = normalizeStructuredActionText(latestUser)
  if (!normalizedUser) return null

  for (const exit of previousSection.exits) {
    if (!exit.targetId || exit.targetId === previousSection.id) continue
    const normalizedLabel = normalizeStructuredActionText(exit.label)
    const labelWords = normalizedLabel.split(/\s+/).filter(w => w.length >= 4)
    if (!normalizedLabel || !labelWords.length) continue

    const exactLabel = normalizedUser === normalizedLabel
    const matchCount = labelWords.filter(w => normalizedUser.includes(w)).length
    if (!exactLabel && matchCount < Math.max(1, Math.ceil(labelWords.length * 0.5))) continue

    const candidate = findSectionById(structure, exit.targetId)
    if (candidate && isSectionAccessible(candidate)) return candidate
  }

  return null
}

// ── Phase 2.5b: Inferred hints builder (tightened) ────────────────────────
// Short-lived, scene-scoped soft hints from AI narrative. NOT authoritative.
// - No facts/factions (too close to pseudo-truth, removed in 2.5b)
// - NPC/object hints scoped to current section, reset on transition
// - Dialogue hints kept only for active NPC
function buildInferredHints(previous, latestAssistant, latestUser, currentSection, knownNpcs, activeNpc, isTransition, gmState = {}, runtimeStructured = false) {
  const prevInferred = previous.inferred || {}

  // NPC state hints: scoped to current section's NPCs, reset on transition
  // Phase 3: skip NPCs already promoted to gmState (authoritative wins)
  const npcStates = {}
  if (!runtimeStructured) {
    const authoritativeNpcs = gmState.npcStates || {}
    const sectionNpcs = new Set((currentSection.npcs || []).map(n => n.toLowerCase()))
    const prevNpcHints = isTransition ? {} : { ...(prevInferred.npcStates || {}) }
    const freshNpcChanges = extractNpcStateChanges(latestAssistant, knownNpcs)
    for (const [npc, state] of Object.entries({ ...prevNpcHints, ...freshNpcChanges })) {
      if (sectionNpcs.has(npc.toLowerCase()) && !authoritativeNpcs[npc]) npcStates[npc] = state
    }
  }

  // Object state hints: scoped to current section's objects, reset on transition
  // Phase 3: skip objects already promoted to gmState
  const objectStates = {}
  if (!runtimeStructured) {
    const authoritativeObjects = gmState.objectStates || {}
    const sectionObjects = new Set((currentSection.interactiveObjects || []).map(o => o.toLowerCase()))
    const prevObjHints = isTransition ? {} : { ...(prevInferred.objectStates || {}) }
    const freshObjChanges = extractObjectStateChanges(latestAssistant, currentSection)
    for (const [obj, state] of Object.entries({ ...prevObjHints, ...freshObjChanges })) {
      if (sectionObjects.has(obj.toLowerCase()) && !authoritativeObjects[obj]) objectStates[obj] = state
    }
  }

  // Dialogue hints: only for active NPC, all others dropped
  const dialogueHints = {}
  if (activeNpc) {
    const prevHint = (!isTransition && prevInferred.dialogueHints?.[activeNpc]) || { dispositionTrend: 0, suspicionTrend: 0 }
    dialogueHints[activeNpc] = {
      dispositionTrend: Math.max(-3, Math.min(3, prevHint.dispositionTrend + inferDispositionShift(latestAssistant))),
      suspicionTrend: Math.max(-3, Math.min(3, prevHint.suspicionTrend + inferSuspicionShift(latestAssistant, latestUser))),
    }
  }

  return { source: 'ai_inferred', npcStates, objectStates, dialogueHints }
}

export function deriveSceneState({ adventure, previousSceneState = null, messages = [], combat = null, fallbackUserText = '', fallbackUserActionKey = null } = {}) {
  const normalizedAdventure = normalizeAdventureEntry(adventure)
  const structure = normalizedAdventure?.structure
  const runtimeStructured = isRuntimeStructure(structure)
  if (!structure?.sections?.length) {
    return createInitialSceneState(normalizedAdventure)
  }

  // Migrate v2 → v3: keep existing flat fields, add empty sub-objects
  let previous
  if (previousSceneState?.version === SCENE_STATE_VERSION) {
    previous = previousSceneState
  } else if (previousSceneState?.version === 2) {
    previous = {
      ...previousSceneState,
      version: SCENE_STATE_VERSION,
      gmState: {
        currentSectionId: previousSceneState.currentSectionId,
        plotFlags: {},
        objectStates: {},
        npcStates: {},
        triggeredEvents: [],
        sectionVisitCounts: Object.fromEntries((previousSceneState.visitedSectionIds || []).map(id => [id, 1])),
        runtimeDiscoveries: [],
        runtimeObjects: {},
        runtimeInteractions: {},
        revealedClueIds: [],
      },
      playerKnowledge: {
        knownNpcs: previousSceneState.knownNpcs || [],
        knownPlaces: [],
        discoveredClues: previousSceneState.discoveredClues || [],
        knownFactions: [],
        knownFacts: [],
      },
      dialogueState: { activeNpcId: null, npcRelations: {} },
      memorySummary: previousSceneState.summary || '',
    }
  } else {
    previous = createInitialSceneState(normalizedAdventure)
  }

  const recentMessages = messages.slice(-8)
  const latestUser = [...recentMessages].reverse().find(message => message.role === 'user')?.content || fallbackUserText || ''
  const latestAssistant = [...recentMessages].reverse().find(message => message.role === 'assistant')?.content || ''
  const combinedRecentText = recentMessages.map(message => message.content).join(' ')
  const searchTokens = tokenizeText(`${combinedRecentText} ${previous.currentSectionTitle || ''} ${previous.currentObjective || ''} ${previous.activeQuest || ''}`, 4)
  const previousSection = findSectionById(structure, previous.gmState?.currentSectionId) || structure.sections[0]

  // Flag-gate check: section accessible only if all requiresFlags are set and no blocksIfFlags are set
  const currentFlags = previous.gmState?.plotFlags || {}
  const isSectionAccessible = (section) => {
    if (section.requiresFlags?.length) {
      if (!section.requiresFlags.every(f => currentFlags[f])) return false
    }
    if (section.blocksIfFlags?.length) {
      if (section.blocksIfFlags.some(f => currentFlags[f])) return false
    }
    return true
  }

  const scoredSections = structure.sections.map(section => {
    // Flag-gated sections are unreachable (unless it's the current section)
    if (section.id !== previousSection?.id && !isSectionAccessible(section)) {
      return { section, score: -Infinity }
    }
    let score = scoreSectionAgainstTokens(section, searchTokens)
    score += computeSectionTransitionWeight(section, previousSection, latestUser)
    if (combat?.active && /(kampf|gegner|initiative|angriff|schaden|boss)/i.test(section.searchText)) score += 3
    if (latestAssistant && section.title && latestAssistant.toLowerCase().includes(section.title.toLowerCase())) score += 6
    if (!latestUser && section.index === 0) score += 4
    if (section.id === previousSection?.id) score += 4
    return { section, score }
  }).sort((a, b) => b.score - a.score || a.section.index - b.section.index)

  const bestEntry = scoredSections[0]
  const bestSection = bestEntry?.section || previousSection || structure.sections[0]
  const bestScore = bestEntry?.score ?? 0
  const previousScore = (scoredSections.find(entry => entry.section.id === previousSection?.id)?.score) ?? 0
  const explicitMove = /\b(gehe|betrete|betritt|verlasse|folge|öffne|steige|klettere|reise|laufe|renne|krieche)\b/i.test(latestUser)
  const assistantAnchorsNewSection = Boolean(bestSection?.title && latestAssistant.toLowerCase().includes(bestSection.title.toLowerCase()) && bestSection.id !== previousSection?.id)

  // Structured adventures: transition only from explicit exit intent.
  const exitTargetSection = findStructuredExitTarget({
    previousSection,
    structure,
    latestUser,
    fallbackUserActionKey,
    isSectionAccessible,
  })

  // Phase 3: structured adventures use ONLY exit-based transitions — no heuristic scoring fallback
  const shouldTransition = exitTargetSection
    ? true
    : (structure.format === 'structured'
      ? false  // structured: exits are the only way to transition
      : (bestSection.id !== previousSection?.id && (explicitMove || assistantAnchorsNewSection || bestScore >= previousScore + 4))
    )

  const currentSection = exitTargetSection || (shouldTransition ? bestSection : (previousSection || bestSection))
  const relevantChunks = selectRelevantChunks(structure, currentSection, searchTokens, combat?.active ? 3 : 2)
  const visited = new Set(previous.visitedSectionIds || [])
  visited.add(currentSection.id)

  const summaryBase = currentSection.summary || 'Die aktuelle Szene entwickelt sich weiter.'
  const latestOutcome = latestAssistant ? firstSentences(latestAssistant, 220) : previous.lastOutcome || ''
  const summary = latestOutcome
    ? `${summaryBase} Letzte Entwicklung: ${latestOutcome}`
    : summaryBase

  // Structured adventures: use section's objective on transition, otherwise derive from user text
  const isStructured = structure.format === 'structured'
  const structuredSectionObjective = isStructured
    ? getStructuredSectionPlayerObjective(structure, currentSection, previous.currentObjective)
    : ''
  const objective = runtimeStructured
    ? (structuredSectionObjective || previous.currentObjective || 'Die aktuelle Szene weiterverfolgen.')
    : ((isStructured && shouldTransition && structuredSectionObjective)
      ? structuredSectionObjective
      : deriveObjectiveFromUserText(latestUser, isStructured ? (structuredSectionObjective || previous.currentObjective) : previous.currentObjective))
  const transitionReason = shouldTransition
    ? detectTransitionReason(previousSection, currentSection, latestUser, latestAssistant)
    : (previous.lastTransitionReason || 'Abschnitt bleibt stabil.')

  const recentSceneChanges = normalizeShortList([
    shouldTransition ? `Neuer Abschnitt: ${currentSection.title}` : '',
    latestOutcome,
    transitionReason,
  ], 3)

  // ── Build sub-objects ──

  const prevGm = previous.gmState || {}
  const prevPk = previous.playerKnowledge || {}
  const prevDlg = previous.dialogueState || {}

  // GM State: plotFlags, objectStates, npcStates, events, visit counts
  const newPlotFlags = { ...(prevGm.plotFlags || {}) }
  if (isStructured && shouldTransition && currentSection.setsOnEntry?.length) {
    for (const flag of currentSection.setsOnEntry) newPlotFlags[flag] = true
  }

  // Authoritative NPC/object states: carry forward + promote confirmed changes from AI narrative
  // Phase 3: permanent states (dead, fled, destroyed, open) survive scene transitions
  const newNpcStates = runtimeStructured
    ? { ...buildInitialRuntimeNpcStates(structure), ...(prevGm.npcStates || {}) }
    : { ...(prevGm.npcStates || {}) }
  if (!runtimeStructured) {
    const confirmedNpcChanges = extractNpcStateChanges(latestAssistant, prevPk.knownNpcs || [])
    for (const [npc, state] of Object.entries(confirmedNpcChanges)) {
      // Only promote terminal/significant states to authoritative layer
      if (state === 'dead' || state === 'fled') newNpcStates[npc] = state
    }
  }

  const newObjectStates = { ...(prevGm.objectStates || {}) }
  if (!runtimeStructured) {
    const confirmedObjChanges = extractObjectStateChanges(latestAssistant, currentSection)
    for (const [obj, state] of Object.entries(confirmedObjChanges)) {
      // Only promote persistent states — 'closed' is reversible, skip it
      if (state === 'open' || state === 'destroyed') newObjectStates[obj] = state
    }
  }

  // Runtime discoveries: carry forward, scope visibility to current section
  const prevDiscoveries = prevGm.runtimeDiscoveries || []
  const runtimeDiscoveries = prevDiscoveries.map(d => ({
    ...d,
    visible: d.sectionId === currentSection.id,
  }))

  // Runtime objects/interactions: carry forward, scope by sectionId
  const runtimeObjects = {}
  for (const [id, obj] of Object.entries(prevGm.runtimeObjects || {})) {
    const inCurrentSection = obj.sectionId ? obj.sectionId === currentSection.id : true
    runtimeObjects[id] = { ...obj, visible: obj.suppressed !== true && inCurrentSection }
  }
  const runtimeInteractions = {}
  for (const [id, intr] of Object.entries(prevGm.runtimeInteractions || {})) {
    const inCurrentSection = intr.sectionId ? intr.sectionId === currentSection.id : true
    runtimeInteractions[id] = { ...intr, visible: intr.suppressed !== true && inCurrentSection }
  }
  const revealedClueIds = [...(prevGm.revealedClueIds || [])]

  const visitCounts = { ...(prevGm.sectionVisitCounts || {}) }
  visitCounts[currentSection.id] = (visitCounts[currentSection.id] || 0) + (shouldTransition || !previous.turnCount ? 1 : 0)

  const triggeredEvents = [...(prevGm.triggeredEvents || [])]
  if (shouldTransition) {
    triggeredEvents.push(`T${previous.turnCount || 0}: → ${currentSection.title}`)
    if (triggeredEvents.length > 10) triggeredEvents.splice(0, triggeredEvents.length - 10)
  }

  // Player Knowledge: accumulate — runtime modules use registries, legacy uses text heuristics
  const runtimeNpcView = runtimeStructured
    ? getVisibleRuntimeNpcs(structure, currentSection, {
      ...previous,
      gmState: { ...prevGm, npcStates: newNpcStates },
    })
    : []

  // NPC discovery: runtime modules use section.visibleNpcs + npcRegistry, legacy uses text matching
  let newKnownNpcs
  if (runtimeStructured) {
    const visibleNames = runtimeNpcView.map(entry => entry.name)
    newKnownNpcs = [...new Set([...(prevPk.knownNpcs || []), ...visibleNames])]
  } else {
    newKnownNpcs = [...new Set([
      ...(prevPk.knownNpcs || []),
      ...extractDiscoveredNpcs(recentMessages, currentSection.npcs || []),
    ])]
  }

  // Clue discovery: runtime modules use revealedClueIds + clueRegistry, legacy uses text heuristics
  let newClues
  if (runtimeStructured) {
    const clueRegistry = structure.module.clueRegistry || {}
    newClues = revealedClueIds
      .map(id => clueRegistry[id]?.text)
      .filter(Boolean)
  } else {
    newClues = normalizeShortList([
      ...(prevPk.discoveredClues || []),
      ...extractCluesFromMessages(recentMessages, currentSection.clues || []),
    ], 8)
  }
  const newKnownPlaces = [...new Set([
    ...(prevPk.knownPlaces || []),
    ...(shouldTransition ? [currentSection.title] : []),
  ])]
  // Authoritative facts/factions: carry forward only, no AI-derived writes (Phase 2.5)
  const newFacts = normalizeShortList([...(prevPk.knownFacts || [])], 8)
  const newFactions = normalizeShortList([...(prevPk.knownFactions || [])], 6)

  // Dialogue State: detect active NPC + update disposition/suspicion
  const activeNpc = runtimeStructured
    ? resolveRuntimeActiveNpcId({
      structure,
      previousSceneState: previous,
      currentSection,
      visibleRuntimeNpcs: runtimeNpcView,
      fallbackUserActionKey,
      shouldTransition,
    })
    : detectActiveNpc(recentMessages, newKnownNpcs)
  const npcRelations = { ...(prevDlg.npcRelations || {}) }
  if (activeNpc && !npcRelations[activeNpc]) {
    npcRelations[activeNpc] = { disposition: 'neutral', suspicion: 0, lastTopic: '' }
  }
  // Authoritative dialogue: carry forward, update lastTopic only — no AI-derived disposition/suspicion (Phase 2.5)
  if (activeNpc && npcRelations[activeNpc]) {
    npcRelations[activeNpc] = {
      ...npcRelations[activeNpc],
      lastTopic: truncateText(latestUser, 80),
    }
  }

  // Memory Summary
  const memorySummary = buildMemorySummary(previous, currentSection, latestOutcome, objective, shouldTransition)

  return {
    version: SCENE_STATE_VERSION,
    turnCount: Number(previous.turnCount || 0) + (recentMessages.length ? 1 : 0),

    // ── GM State ──
    gmState: {
      currentSectionId: currentSection.id,
      plotFlags: newPlotFlags,
      objectStates: newObjectStates,
      npcStates: newNpcStates,
      triggeredEvents,
      sectionVisitCounts: visitCounts,
      runtimeDiscoveries,
      runtimeObjects,
      runtimeInteractions,
      revealedClueIds,
    },

    // ── Player Knowledge ──
    playerKnowledge: {
      knownNpcs: newKnownNpcs,
      knownPlaces: newKnownPlaces,
      discoveredClues: newClues,
      knownFactions: newFactions,
      knownFacts: newFacts,
    },

    // ── Dialogue State ──
    dialogueState: {
      activeNpcId: activeNpc,
      npcRelations,
    },

    // ── Memory Summary ──
    memorySummary,

    // ── Inferred (AI-derived soft hints, scene-scoped, NOT authoritative truth) ──
    inferred: buildInferredHints(
      previous,
      latestAssistant,
      latestUser,
      currentSection,
      prevPk.knownNpcs || [],
      activeNpc,
      shouldTransition,
      { npcStates: newNpcStates, objectStates: newObjectStates },
      runtimeStructured
    ),

    // ── Scene State (current narrative frame) ──
    currentSectionTitle: currentSection.title,
    currentLocation: (isStructured ? currentSection.location : null) || currentSection.title,
    relevantChunkIndexes: relevantChunks.map(chunk => chunk.index),
    visitedSectionIds: [...visited],
    currentObjective: objective,
    activeQuest: truncateText(previous.activeQuest || getStructuredPrimaryQuest(structure) || objective || summaryBase, 160),
    lastPlayerAction: truncateText(latestUser || previous.lastPlayerAction || '', 160),
    recentActions: buildRecentActions(previous.recentActions, latestUser, shouldTransition),
    recentActionKeys: buildRecentActionKeys(previous.recentActionKeys, fallbackUserActionKey, shouldTransition),
    interactionHistory: (previous.interactionHistory || []).slice(-20),
    lastOutcome: latestOutcome,
    summary,
    openThreads: (isStructured && currentSection.openThreads?.length)
      ? normalizeShortList([...(previous.openThreads || []), ...currentSection.openThreads], 4)
      : extractOpenThreads(recentMessages, objective, currentSection),
    notableElements: mergeNotableElements(currentSection, `${latestUser} ${latestAssistant}`),
    recentSceneChanges,
    stableSectionTurns: shouldTransition ? 1 : Number(previous.stableSectionTurns || 0) + 1,
    lastTransitionReason: transitionReason,
    lastUpdatedAt: new Date().toISOString(),
  }
}
