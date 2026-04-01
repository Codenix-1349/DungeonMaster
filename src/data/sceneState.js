import {
  normalizeAdventureEntry, truncateText, firstSentences,
  tokenizeText, extractKeywords, splitSentences, normalizeShortList,
} from './adventureParser'
import {
  extractCluesFromMessages, extractOpenThreads, extractDiscoveredNpcs,
  inferDispositionShift, inferSuspicionShift,
  extractNpcStateChanges, extractObjectStateChanges, detectActiveNpc,
} from './knowledgeModel'

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

export function findSectionById(structure, sectionId) {
  return structure?.sections?.find(section => section.id === sectionId) || null
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

  return {
    version: SCENE_STATE_VERSION,
    turnCount: 0,

    // ── GM State (engine truth) ──
    gmState: {
      currentSectionId: firstSection?.id || null,
      plotFlags: initialFlags,
      objectStates: {},
      npcStates: {},
      triggeredEvents: [],
      sectionVisitCounts: firstSection ? { [firstSection.id]: 1 } : {},
    },

    // ── Player Knowledge (what the player knows) ──
    playerKnowledge: {
      knownNpcs: [],
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
    currentObjective: (isStructured ? firstSection?.objective : null) || 'Die erste Szene betreten und Informationen sammeln.',
    activeQuest: (isStructured ? structure.module?.primaryObjective : null) || firstSection?.summary || 'Das Abenteuer beginnen und die Lage erfassen.',
    lastPlayerAction: '',
    recentActions: [],
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

// ── Phase 2.5b: Inferred hints builder (tightened) ────────────────────────
// Short-lived, scene-scoped soft hints from AI narrative. NOT authoritative.
// - No facts/factions (too close to pseudo-truth, removed in 2.5b)
// - NPC/object hints scoped to current section, reset on transition
// - Dialogue hints kept only for active NPC
function buildInferredHints(previous, latestAssistant, latestUser, currentSection, knownNpcs, activeNpc, isTransition) {
  const prevInferred = previous.inferred || {}

  // NPC state hints: scoped to current section's NPCs, reset on transition
  const sectionNpcs = new Set((currentSection.npcs || []).map(n => n.toLowerCase()))
  const prevNpcHints = isTransition ? {} : { ...(prevInferred.npcStates || {}) }
  const freshNpcChanges = extractNpcStateChanges(latestAssistant, knownNpcs)
  const npcStates = {}
  for (const [npc, state] of Object.entries({ ...prevNpcHints, ...freshNpcChanges })) {
    if (sectionNpcs.has(npc.toLowerCase())) npcStates[npc] = state
  }

  // Object state hints: scoped to current section's objects, reset on transition
  const sectionObjects = new Set((currentSection.interactiveObjects || []).map(o => o.toLowerCase()))
  const prevObjHints = isTransition ? {} : { ...(prevInferred.objectStates || {}) }
  const freshObjChanges = extractObjectStateChanges(latestAssistant, currentSection)
  const objectStates = {}
  for (const [obj, state] of Object.entries({ ...prevObjHints, ...freshObjChanges })) {
    if (sectionObjects.has(obj.toLowerCase())) objectStates[obj] = state
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

export function deriveSceneState({ adventure, previousSceneState = null, messages = [], combat = null, fallbackUserText = '' } = {}) {
  const normalizedAdventure = normalizeAdventureEntry(adventure)
  const structure = normalizedAdventure?.structure
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

  // Structured adventures: match player/AI text against EXIT labels for direct transitions
  let exitTargetSection = null
  if (structure.format === 'structured' && previousSection?.exits?.length) {
    const combined = `${latestUser} ${latestAssistant}`.toLowerCase()
    for (const exit of previousSection.exits) {
      if (!exit.targetId || exit.targetId === previousSection.id) continue
      const labelWords = exit.label.toLowerCase().split(/\s+/).filter(w => w.length >= 4)
      const matchCount = labelWords.filter(w => combined.includes(w)).length
      if (matchCount >= Math.max(1, Math.ceil(labelWords.length * 0.5))) {
        const candidate = findSectionById(structure, exit.targetId)
        // Only allow transition if target section's flag-gates are satisfied
        if (candidate && isSectionAccessible(candidate)) {
          exitTargetSection = candidate
          break
        }
      }
    }
  }

  const shouldTransition = exitTargetSection
    ? true
    : (bestSection.id !== previousSection?.id && (explicitMove || assistantAnchorsNewSection || bestScore >= previousScore + 4))

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
  const objective = (isStructured && shouldTransition && currentSection.objective)
    ? currentSection.objective
    : deriveObjectiveFromUserText(latestUser, isStructured ? (currentSection.objective || previous.currentObjective) : previous.currentObjective)
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

  // Authoritative NPC/object states: carry forward only, no AI-derived writes (Phase 2.5)
  const newNpcStates = { ...(prevGm.npcStates || {}) }
  const newObjectStates = { ...(prevGm.objectStates || {}) }

  const visitCounts = { ...(prevGm.sectionVisitCounts || {}) }
  visitCounts[currentSection.id] = (visitCounts[currentSection.id] || 0) + (shouldTransition || !previous.turnCount ? 1 : 0)

  const triggeredEvents = [...(prevGm.triggeredEvents || [])]
  if (shouldTransition) {
    triggeredEvents.push(`T${previous.turnCount || 0}: → ${currentSection.title}`)
    if (triggeredEvents.length > 10) triggeredEvents.splice(0, triggeredEvents.length - 10)
  }

  // Player Knowledge: accumulate from messages
  const newKnownNpcs = [...new Set([
    ...(prevPk.knownNpcs || []),
    ...extractDiscoveredNpcs(recentMessages, currentSection.npcs || []),
  ])]
  const newClues = normalizeShortList([
    ...(prevPk.discoveredClues || []),
    ...extractCluesFromMessages(recentMessages),
  ], 8)
  const newKnownPlaces = [...new Set([
    ...(prevPk.knownPlaces || []),
    ...(shouldTransition ? [currentSection.title] : []),
  ])]
  // Authoritative facts/factions: carry forward only, no AI-derived writes (Phase 2.5)
  const newFacts = normalizeShortList([...(prevPk.knownFacts || [])], 8)
  const newFactions = normalizeShortList([...(prevPk.knownFactions || [])], 6)

  // Dialogue State: detect active NPC + update disposition/suspicion
  const activeNpc = detectActiveNpc(recentMessages, newKnownNpcs)
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
    inferred: buildInferredHints(previous, latestAssistant, latestUser, currentSection, prevPk.knownNpcs || [], activeNpc, shouldTransition),

    // ── Scene State (current narrative frame) ──
    currentSectionTitle: currentSection.title,
    currentLocation: (isStructured ? currentSection.location : null) || currentSection.title,
    relevantChunkIndexes: relevantChunks.map(chunk => chunk.index),
    visitedSectionIds: [...visited],
    currentObjective: objective,
    activeQuest: truncateText(previous.activeQuest || objective || summaryBase, 160),
    lastPlayerAction: truncateText(latestUser || previous.lastPlayerAction || '', 160),
    recentActions: buildRecentActions(previous.recentActions, latestUser, shouldTransition),
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
